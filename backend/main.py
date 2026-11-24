import os
import shutil
import json
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, Response, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from .database import engine, Base, get_db, run_auth_migrations
from . import models, schemas
from .auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_current_user_or_query,
    require_admin,
    is_user_admin,
    normalize_email,
    validate_email,
)
from .parser import extract_text_from_file, parse_lab_metrics, extract_lab_metrics_with_llm
from .rag_engine import rag_engine
from .llm_hub import llm_hub
from .prevent_calculator import extract_prevent_inputs, calculate_prevent_risk
from .pubmed_service import pubmed_service
from .email_service import is_email_configured, send_password_reset_email
from .mcp_server import handle_mcp_jsonrpc

# Create database tables & run safe auth migrations for existing databases
Base.metadata.create_all(bind=engine)
run_auth_migrations()

if os.environ.get("VERCEL"):
    UPLOAD_DIR = "/tmp/mydoc_uploads"
else:
    UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title="MY_DOC API",
    description="Персональный медицинский AI-ассистент врача и пациента",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Default Folders Generator ---
def create_default_folders(db: Session, patient_id: int):
    defaults = [
        ("Лабораторные анализы", "analyses"),
        ("Инструментальные исследования", "researches"),
        ("Консультации и выписки", "notes"),
        ("База знаний и литература", "knowledge_base"),
    ]
    for name, ftype in defaults:
        folder = models.Folder(patient_id=patient_id, name=name, folder_type=ftype)
        db.add(folder)
    db.commit()

# --- Ownership Helpers ---
def get_owned_patient(db: Session, patient_id: int, user_id: int) -> models.Patient:
    patient = db.query(models.Patient).filter(
        models.Patient.id == patient_id,
        models.Patient.user_id == user_id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Пациент не найден")
    return patient

def get_owned_session(db: Session, session_id: int, user_id: int) -> models.ChatSession:
    session = (
        db.query(models.ChatSession)
        .join(models.Patient, models.ChatSession.patient_id == models.Patient.id)
        .filter(
            models.ChatSession.id == session_id,
            models.Patient.user_id == user_id
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Сессия не найдена")
    return session

# --- Health Check ---
@app.get("/api/health")
def health():
    return {"status": "ok", "app": "MY_DOC", "timestamp": datetime.utcnow().isoformat()}

def _get_client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()[:100]
    if request.client and request.client.host:
        return request.client.host[:100]
    return "unknown"

def _record_auth_event(db: Session, event_type: str, request: Request, user: Optional[models.User] = None):
    try:
        ev = models.AuthEvent(
            user_id=user.id if user else None,
            email=user.email if user else None,
            event_type=event_type,
            ip_address=_get_client_ip(request),
            user_agent=(request.headers.get("user-agent") or "")[:500],
        )
        db.add(ev)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[Analytics] Event log warning: {e}")

# --- Auth Endpoints ---
@app.post("/api/auth/register", response_model=schemas.AuthTokenResponse)
def register_user(data: schemas.UserRegister, request: Request, db: Session = Depends(get_db)):
    email = normalize_email(data.email)
    if not validate_email(email):
        raise HTTPException(status_code=400, detail="Некорректный формат email")
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Пароль должен содержать минимум 6 символов")

    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Пользователь с таким email уже зарегистрирован")

    is_first_user = db.query(models.User).count() == 0
    admin_env = normalize_email(os.environ.get("MYDOC_ADMIN_EMAIL", ""))
    should_be_admin = is_first_user or (bool(admin_env) and email == admin_env)
    now = datetime.utcnow()

    user = models.User(
        email=email,
        password_hash=hash_password(data.password),
        full_name=(data.full_name or "").strip() or None,
        is_active=True,
        is_admin=should_be_admin,
        last_login_at=now,
        login_count=1,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # First registered user claims any legacy unassigned patients & settings from pre-auth DB
    if is_first_user:
        db.query(models.Patient).filter(models.Patient.user_id.is_(None)).update(
            {models.Patient.user_id: user.id}, synchronize_session=False
        )
        db.query(models.AppSetting).filter(models.AppSetting.user_id.is_(None)).update(
            {models.AppSetting.user_id: user.id}, synchronize_session=False
        )
        db.commit()

    _record_auth_event(db, "register", request, user)

    token = create_access_token(user.id, user.email)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "is_admin": is_user_admin(user),
            "created_at": user.created_at,
        }
    }

@app.post("/api/auth/login", response_model=schemas.AuthTokenResponse)
def login_user(data: schemas.UserLogin, request: Request, db: Session = Depends(get_db)):
    email = normalize_email(data.email)
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Аккаунт деактивирован")

    user.last_login_at = datetime.utcnow()
    user.login_count = (user.login_count or 0) + 1
    db.commit()
    db.refresh(user)

    _record_auth_event(db, "login", request, user)

    token = create_access_token(user.id, user.email)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "is_admin": is_user_admin(user),
            "created_at": user.created_at,
        }
    }

@app.get("/api/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_admin": is_user_admin(current_user),
        "created_at": current_user.created_at,
    }

def _delete_user_completely(db: Session, user: models.User):
    # Clean up uploaded files and Chroma collections for user's patients
    user_patients = db.query(models.Patient).filter(models.Patient.user_id == user.id).all()
    for p in user_patients:
        try:
            rag_engine.delete_patient_collection(p.id)
        except Exception:
            pass
        patient_dir = os.path.join(UPLOAD_DIR, f"patient_{p.id}")
        if os.path.exists(patient_dir):
            try:
                shutil.rmtree(patient_dir)
            except Exception:
                pass
    # Detach auth_events FK & remove reset tokens before deleting user (PostgreSQL FK constraint)
    db.query(models.AuthEvent).filter(models.AuthEvent.user_id == user.id).update(
        {models.AuthEvent.user_id: None}, synchronize_session=False
    )
    db.query(models.PasswordResetToken).filter(models.PasswordResetToken.user_id == user.id).delete(
        synchronize_session=False
    )
    db.delete(user)
    db.commit()

@app.post("/api/auth/forgot-password")
def forgot_password(data: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = normalize_email(data.email)
    if not validate_email(email):
        raise HTTPException(status_code=400, detail="Некорректный формат email")

    if not is_email_configured():
        raise HTTPException(
            status_code=503,
            detail="Отправка писем пока не настроена на сервере. Добавьте RESEND_API_KEY или SMTP настройки в Vercel."
        )

    user = db.query(models.User).filter(models.User.email == email, models.User.is_active == True).first()
    if user:
        # Invalidate previous unused codes for this user
        db.query(models.PasswordResetToken).filter(
            models.PasswordResetToken.user_id == user.id,
            models.PasswordResetToken.used == False
        ).update({models.PasswordResetToken.used: True}, synchronize_session=False)

        code = f"{secrets.randbelow(900000) + 100000}"
        code_hash = hashlib.sha256(code.encode("utf-8")).hexdigest()
        token_row = models.PasswordResetToken(
            user_id=user.id,
            code_hash=code_hash,
            expires_at=datetime.utcnow() + timedelta(minutes=15),
            used=False,
        )
        db.add(token_row)
        db.commit()

        sent = send_password_reset_email(user.email, code)
        if not sent:
            raise HTTPException(
                status_code=500,
                detail="Не удалось отправить письмо с кодом. Проверьте настройки почтового сервиса."
            )

    return {
        "success": True,
        "message": "Если аккаунт с таким email существует, мы отправили 6-значный код восстановления на вашу почту."
    }

@app.post("/api/auth/reset-password")
def reset_password(data: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    email = normalize_email(data.email)
    code = (data.code or "").strip()
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Пароль должен содержать минимум 6 символов")

    user = db.query(models.User).filter(models.User.email == email, models.User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=400, detail="Неверный или истёкший код восстановления")

    code_hash = hashlib.sha256(code.encode("utf-8")).hexdigest()
    now = datetime.utcnow()
    token_row = (
        db.query(models.PasswordResetToken)
        .filter(
            models.PasswordResetToken.user_id == user.id,
            models.PasswordResetToken.code_hash == code_hash,
            models.PasswordResetToken.used == False,
            models.PasswordResetToken.expires_at >= now,
        )
        .order_by(models.PasswordResetToken.created_at.desc())
        .first()
    )
    if not token_row:
        raise HTTPException(status_code=400, detail="Неверный или истёкший код восстановления")

    user.password_hash = hash_password(data.new_password)
    user.updated_at = now
    token_row.used = True
    db.commit()

    return {"success": True, "message": "Пароль успешно изменён! Теперь вы можете войти с новым паролем."}

@app.delete("/api/auth/me")
def delete_my_account(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    email = current_user.email
    _delete_user_completely(db, current_user)
    return {"success": True, "message": f"Аккаунт {email} успешно удалён"}

@app.delete("/api/admin/users/{user_id}")
def admin_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(require_admin),
):
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    email = target.email
    _delete_user_completely(db, target)
    return {"success": True, "message": f"Пользователь {email} удалён"}

# --- Public Visit Tracking & Owner Admin Monitor ---
@app.post("/api/analytics/visit")
def track_visit(request: Request, db: Session = Depends(get_db)):
    _record_auth_event(db, "visit", request, None)
    return {"ok": True}

@app.get("/api/admin/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(require_admin),
):
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    week_start = today_start - timedelta(days=6)
    two_weeks_start = today_start - timedelta(days=13)

    all_users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    total_users = len(all_users)
    new_users_today = sum(1 for u in all_users if u.created_at and u.created_at >= today_start)
    new_users_7d = sum(1 for u in all_users if u.created_at and u.created_at >= week_start)

    visits_total = db.query(models.AuthEvent).filter(models.AuthEvent.event_type == "visit").count()
    visits_today = db.query(models.AuthEvent).filter(
        models.AuthEvent.event_type == "visit",
        models.AuthEvent.created_at >= today_start,
    ).count()
    visits_7d = db.query(models.AuthEvent).filter(
        models.AuthEvent.event_type == "visit",
        models.AuthEvent.created_at >= week_start,
    ).count()

    logins_today = db.query(models.AuthEvent).filter(
        models.AuthEvent.event_type == "login",
        models.AuthEvent.created_at >= today_start,
    ).count()
    logins_7d = db.query(models.AuthEvent).filter(
        models.AuthEvent.event_type == "login",
        models.AuthEvent.created_at >= week_start,
    ).count()

    total_patients = db.query(models.Patient).count()
    total_documents = db.query(models.Document).count()
    total_sessions = db.query(models.ChatSession).count()
    total_messages = db.query(models.ChatMessage).count()

    # Daily breakdown for the last 14 days
    recent_14d_events = db.query(models.AuthEvent).filter(
        models.AuthEvent.created_at >= two_weeks_start
    ).all()
    daily_map = {}
    for i in range(14):
        d = (two_weeks_start + timedelta(days=i)).strftime("%Y-%m-%d")
        daily_map[d] = {"date": d, "visits": 0, "logins": 0, "registrations": 0}

    for ev in recent_14d_events:
        if not ev.created_at:
            continue
        d = ev.created_at.strftime("%Y-%m-%d")
        if d in daily_map:
            if ev.event_type == "visit":
                daily_map[d]["visits"] += 1
            elif ev.event_type == "login":
                daily_map[d]["logins"] += 1
            elif ev.event_type == "register":
                daily_map[d]["registrations"] += 1

    # Per-user activity counts (metadata only, zero private medical content)
    users_list = []
    for u in all_users:
        p_ids = [r[0] for r in db.query(models.Patient.id).filter(models.Patient.user_id == u.id).all()]
        doc_cnt = db.query(models.Document).filter(models.Document.patient_id.in_(p_ids)).count() if p_ids else 0
        sess_ids = [r[0] for r in db.query(models.ChatSession.id).filter(models.ChatSession.patient_id.in_(p_ids)).all()] if p_ids else []
        msg_cnt = db.query(models.ChatMessage).filter(models.ChatMessage.session_id.in_(sess_ids)).count() if sess_ids else 0
        users_list.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "is_admin": is_user_admin(u),
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
            "login_count": u.login_count or 0,
            "patients_count": len(p_ids),
            "documents_count": doc_cnt,
            "messages_count": msg_cnt,
        })

    recent_events = db.query(models.AuthEvent).order_by(models.AuthEvent.created_at.desc()).limit(60).all()
    events_list = [
        {
            "id": ev.id,
            "event_type": ev.event_type,
            "email": ev.email,
            "ip_address": ev.ip_address,
            "user_agent": ev.user_agent,
            "created_at": ev.created_at.isoformat() if ev.created_at else None,
        }
        for ev in recent_events
    ]

    return {
        "summary": {
            "total_users": total_users,
            "new_users_today": new_users_today,
            "new_users_7d": new_users_7d,
            "visits_total": visits_total,
            "visits_today": visits_today,
            "visits_7d": visits_7d,
            "logins_today": logins_today,
            "logins_7d": logins_7d,
            "total_patients": total_patients,
            "total_documents": total_documents,
            "total_sessions": total_sessions,
            "total_messages": total_messages,
        },
        "daily": list(daily_map.values()),
        "users": users_list,
        "recent_events": events_list,
    }

# --- Patient Endpoints ---
@app.get("/api/patients", response_model=List[schemas.PatientResponse])
def list_patients(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return (
        db.query(models.Patient)
        .filter(models.Patient.user_id == current_user.id)
        .order_by(models.Patient.updated_at.desc())
        .all()
    )

@app.post("/api/patients", response_model=schemas.PatientResponse)
def create_patient(
    data: schemas.PatientCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Calculate BMI if height and weight are provided
    bmi = None
    if data.height and data.weight and data.height > 0:
        h_m = data.height / 100.0
        bmi = round(data.weight / (h_m * h_m), 1)

    patient = models.Patient(
        user_id=current_user.id,
        full_name=data.full_name,
        birth_date=data.birth_date,
        age=data.age,
        gender=data.gender,
        height=data.height,
        weight=data.weight,
        bmi=bmi,
        blood_type=data.blood_type,
        allergies=data.allergies,
        chronic_diseases=data.chronic_diseases,
        current_medications=data.current_medications,
        notes=data.notes
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    # Initialize default folders
    create_default_folders(db, patient.id)
    return patient

@app.get("/api/patients/{patient_id}", response_model=schemas.PatientResponse)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return get_owned_patient(db, patient_id, current_user.id)

@app.put("/api/patients/{patient_id}", response_model=schemas.PatientResponse)
def update_patient(
    patient_id: int,
    data: schemas.PatientUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    patient = get_owned_patient(db, patient_id, current_user.id)

    update_dict = data.dict(exclude_unset=True)
    for key, val in update_dict.items():
        setattr(patient, key, val)

    # Recalculate BMI
    if patient.height and patient.weight and patient.height > 0:
        h_m = patient.height / 100.0
        patient.bmi = round(patient.weight / (h_m * h_m), 1)

    patient.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(patient)
    return patient

@app.delete("/api/patients/{patient_id}")
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    patient = get_owned_patient(db, patient_id, current_user.id)
    
    # 1. Delete vectors from ChromaDB
    rag_engine.delete_patient_collection(patient_id)

    # 2. Delete patient documents folder from filesystem
    patient_dir = os.path.join(UPLOAD_DIR, f"patient_{patient_id}")
    if os.path.exists(patient_dir):
        try:
            shutil.rmtree(patient_dir)
        except Exception as e:
            print(f"Error removing patient dir {patient_dir}: {e}")

    # 3. Delete from DB (cascades to folders, docs, metrics, sessions, messages)
    db.delete(patient)
    db.commit()
    return {"success": True, "message": f"Пациент {patient.full_name} успешно удален"}

# --- Folders & Documents ---
@app.get("/api/patients/{patient_id}/folders", response_model=List[schemas.FolderResponse])
def get_folders(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_patient(db, patient_id, current_user.id)
    folders = db.query(models.Folder).filter(models.Folder.patient_id == patient_id).all()
    res = []
    for f in folders:
        doc_count = db.query(models.Document).filter(models.Document.folder_id == f.id).count()
        f_resp = schemas.FolderResponse.from_orm(f)
        f_resp.doc_count = doc_count
        res.append(f_resp)
    return res

@app.post("/api/patients/{patient_id}/folders", response_model=schemas.FolderResponse)
def create_folder(
    patient_id: int,
    data: schemas.FolderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_patient(db, patient_id, current_user.id)
    folder = models.Folder(patient_id=patient_id, name=data.name, folder_type=data.folder_type)
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return folder

@app.get("/api/patients/{patient_id}/documents", response_model=List[schemas.DocumentResponse])
def get_documents(
    patient_id: int,
    folder_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_patient(db, patient_id, current_user.id)
    query = db.query(models.Document).filter(models.Document.patient_id == patient_id)
    if folder_id is not None:
        query = query.filter(models.Document.folder_id == folder_id)
    return query.order_by(models.Document.created_at.desc()).all()

@app.post("/api/patients/{patient_id}/documents/upload")
async def upload_document(
    patient_id: int,
    file: UploadFile = File(...),
    folder_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    patient = get_owned_patient(db, patient_id, current_user.id)

    # Safe file storage
    patient_dir = os.path.join(UPLOAD_DIR, f"patient_{patient_id}")
    os.makedirs(patient_dir, exist_ok=True)
    
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    clean_name = f"{timestamp}_{file.filename}"
    file_path = os.path.join(patient_dir, clean_name)

    with open(file_path, "wb") as f_out:
        shutil.copyfileobj(file.file, f_out)

    file_size = os.path.getsize(file_path)
    file_ext = file.filename.split(".")[-1].lower() if "." in file.filename else "unknown"

    # Fetch user API keys for Cloud Vision OCR & AI lab extraction fallback
    user_settings = get_all_settings_dict(db, current_user.id)
    ocr_api_keys = {
        "gemini": user_settings.get("api_key_gemini") or os.getenv("GEMINI_API_KEY", ""),
        "openai": user_settings.get("api_key_openai") or os.getenv("OPENAI_API_KEY", ""),
    }

    # Extract text (with layout PDF + Cloud Vision OCR for scans/images)
    text_content = extract_text_from_file(file_path, file.filename, api_keys=ocr_api_keys)

    # Detect folder type
    folder_type = "general"
    if folder_id:
        folder_obj = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
        if folder_obj:
            folder_type = folder_obj.folder_type

    doc = models.Document(
        patient_id=patient_id,
        folder_id=folder_id,
        filename=file.filename,
        filepath=file_path,
        file_size=file_size,
        file_type=file_ext,
        extracted_text=text_content,
        is_indexed=True
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # 1. Index in ChromaDB
    try:
        rag_engine.index_document(
            patient_id=patient_id,
            document_id=doc.id,
            filename=file.filename,
            folder_type=folder_type,
            text=text_content
        )
    except Exception as e:
        print(f"RAG indexing warning: {e}")

    # 2. Extract medical lab metrics if it is an analysis or contains metrics
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    p_age = patient.age if (patient and patient.age) else 50
    p_gender = patient.gender if (patient and patient.gender) else "male"
    extracted_metrics = parse_lab_metrics(
        text_content,
        default_date=today_str,
        patient_age=p_age,
        patient_gender=p_gender,
        filename=file.filename
    )
    if not extracted_metrics and text_content and len(text_content.strip()) > 60:
        extracted_metrics = extract_lab_metrics_with_llm(
            text_content,
            default_date=today_str,
            filename=file.filename,
            api_keys=ocr_api_keys,
        )
    added_metrics_count = 0
    for m in extracted_metrics:
        lab_m = models.LabMetric(
            patient_id=patient_id,
            document_id=doc.id,
            metric_name=m["metric_name"],
            value=m["value"],
            unit=m["unit"],
            reference_min=m["reference_min"],
            reference_max=m["reference_max"],
            status=m["status"],
            record_date=m["record_date"],
            notes=m["notes"]
        )
        db.add(lab_m)
        added_metrics_count += 1
    if added_metrics_count > 0:
        db.commit()

    return {
        "success": True,
        "document_id": doc.id,
        "filename": doc.filename,
        "size": file_size,
        "indexed": True,
        "extracted_metrics_count": added_metrics_count
    }

@app.delete("/api/patients/{patient_id}/documents")
def delete_all_documents(
    patient_id: int,
    folder_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_patient(db, patient_id, current_user.id)
    query = db.query(models.Document).filter(models.Document.patient_id == patient_id)
    if folder_id is not None:
        query = query.filter(models.Document.folder_id == folder_id)
    docs = query.all()
    deleted_count = len(docs)

    for doc in docs:
        try:
            rag_engine.delete_document(patient_id, doc.id)
        except Exception:
            pass
        if doc.filepath and os.path.exists(doc.filepath):
            try:
                os.remove(doc.filepath)
            except Exception:
                pass
        db.delete(doc)

    db.commit()
    return {"success": True, "deleted_count": deleted_count}

@app.delete("/api/patients/{patient_id}/documents/{doc_id}")
def delete_document(
    patient_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_patient(db, patient_id, current_user.id)
    doc = db.query(models.Document).filter(
        models.Document.id == doc_id,
        models.Document.patient_id == patient_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Документ не найден")

    # Delete vector chunks
    rag_engine.delete_document(patient_id, doc.id)

    # Delete file from disk if exists
    if os.path.exists(doc.filepath):
        try:
            os.remove(doc.filepath)
        except Exception:
            pass

    db.delete(doc)
    db.commit()
    return {"success": True, "message": "Документ удален"}

@app.get("/api/patients/{patient_id}/documents/{doc_id}")
def get_document_details(
    patient_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_patient(db, patient_id, current_user.id)
    doc = db.query(models.Document).filter(
        models.Document.id == doc_id,
        models.Document.patient_id == patient_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Документ не найден")

    metrics = db.query(models.LabMetric).filter(
        models.LabMetric.document_id == doc_id,
        models.LabMetric.patient_id == patient_id
    ).order_by(models.LabMetric.metric_name.asc()).all()

    return {
        "id": doc.id,
        "patient_id": doc.patient_id,
        "folder_id": doc.folder_id,
        "filename": doc.filename,
        "file_size": doc.file_size,
        "file_type": doc.file_type,
        "is_indexed": doc.is_indexed,
        "extracted_text": doc.extracted_text or "",
        "created_at": doc.created_at,
        "metrics": [
            {
                "id": m.id,
                "metric_name": m.metric_name,
                "value": m.value,
                "unit": m.unit,
                "reference_min": m.reference_min,
                "reference_max": m.reference_max,
                "status": m.status,
                "record_date": m.record_date,
                "notes": m.notes
            }
            for m in metrics
        ]
    }

@app.get("/api/patients/{patient_id}/documents/{doc_id}/file")
def get_document_file(
    patient_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_or_query)
):
    get_owned_patient(db, patient_id, current_user.id)
    doc = db.query(models.Document).filter(
        models.Document.id == doc_id,
        models.Document.patient_id == patient_id
    ).first()
    if not doc or not doc.filepath or not os.path.exists(doc.filepath):
        raise HTTPException(status_code=404, detail="Файл не найден на сервере")

    ext = (doc.file_type or "").lower().strip(".")
    media_types = {
        "pdf": "application/pdf",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "webp": "image/webp",
        "txt": "text/plain; charset=utf-8",
        "csv": "text/csv; charset=utf-8",
        "md": "text/markdown; charset=utf-8"
    }
    media_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(
        path=doc.filepath,
        filename=doc.filename,
        media_type=media_type,
        content_disposition_type="inline"
    )

# --- Lab Metrics / Dynamic Charts ---
@app.get("/api/patients/{patient_id}/labs", response_model=List[schemas.LabMetricResponse])
def get_lab_metrics(
    patient_id: int,
    metric_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_patient(db, patient_id, current_user.id)
    query = db.query(models.LabMetric).filter(models.LabMetric.patient_id == patient_id)
    if metric_name:
        query = query.filter(models.LabMetric.metric_name == metric_name)
    return query.order_by(models.LabMetric.record_date.asc()).all()

@app.post("/api/patients/{patient_id}/reparse_labs")
def reparse_patient_labs(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    patient = get_owned_patient(db, patient_id, current_user.id)
    
    docs = db.query(models.Document).filter(
        models.Document.patient_id == patient_id,
        models.Document.extracted_text.isnot(None)
    ).all()

    # Clear previous metrics for this patient to ensure fresh clean parsing
    db.query(models.LabMetric).filter(models.LabMetric.patient_id == patient_id).delete()

    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    user_settings = get_all_settings_dict(db, current_user.id)
    ocr_api_keys = {
        "gemini": user_settings.get("api_key_gemini") or os.getenv("GEMINI_API_KEY", ""),
        "openai": user_settings.get("api_key_openai") or os.getenv("OPENAI_API_KEY", ""),
    }
    total_added = 0
    seen = set()

    for doc in docs:
        if not doc.extracted_text or not doc.extracted_text.strip():
            continue
        doc_date = doc.created_at.strftime("%Y-%m-%d") if doc.created_at else today_str
        metrics = parse_lab_metrics(
            doc.extracted_text,
            default_date=doc_date,
            patient_age=patient.age or 50,
            patient_gender=patient.gender or "male",
            filename=doc.filename
        )
        if not metrics and len(doc.extracted_text.strip()) > 60:
            metrics = extract_lab_metrics_with_llm(
                doc.extracted_text,
                default_date=doc_date,
                filename=doc.filename,
                api_keys=ocr_api_keys,
            )
        for m in metrics:
            key = (m["metric_name"], m["record_date"], round(m["value"], 3))
            if key in seen:
                continue
            seen.add(key)
            lab_m = models.LabMetric(
                patient_id=patient_id,
                document_id=doc.id,
                metric_name=m["metric_name"],
                value=m["value"],
                unit=m["unit"],
                reference_min=m["reference_min"],
                reference_max=m["reference_max"],
                status=m["status"],
                record_date=m["record_date"],
                notes=m["notes"]
            )
            db.add(lab_m)
            total_added += 1

    db.commit()
    return {"success": True, "total_metrics": total_added}

@app.post("/api/patients/{patient_id}/labs", response_model=schemas.LabMetricResponse)
def add_lab_metric(
    patient_id: int,
    data: schemas.LabMetricCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_patient(db, patient_id, current_user.id)
    status = "normal"
    if data.reference_min is not None and data.value < data.reference_min:
        status = "low"
    elif data.reference_max is not None and data.value > data.reference_max:
        status = "high"

    metric = models.LabMetric(
        patient_id=patient_id,
        metric_name=data.metric_name,
        value=data.value,
        unit=data.unit,
        reference_min=data.reference_min,
        reference_max=data.reference_max,
        status=status,
        record_date=data.record_date,
        notes=data.notes
    )
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric

@app.delete("/api/patients/{patient_id}/labs/{metric_id}")
def delete_lab_metric(
    patient_id: int,
    metric_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_patient(db, patient_id, current_user.id)
    metric = db.query(models.LabMetric).filter(
        models.LabMetric.id == metric_id,
        models.LabMetric.patient_id == patient_id
    ).first()
    if not metric:
        raise HTTPException(status_code=404, detail="Показатель не найден")
    db.delete(metric)
    db.commit()
    return {"success": True}

# --- PREVENT 10-Year CVD Risk Calculator ---
@app.get("/api/patients/{patient_id}/prevent-params")
def get_patient_prevent_params(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    patient = get_owned_patient(db, patient_id, current_user.id)
    
    docs = db.query(models.Document).filter(
        models.Document.patient_id == patient_id,
        models.Document.extracted_text.isnot(None)
    ).all()

    try:
        inputs = extract_prevent_inputs(patient, docs)
        risk = calculate_prevent_risk(inputs)
        return {
            "inputs": inputs,
            "risk": risk,
            "patient_name": patient.full_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка расчета PREVENT: {str(e)}")

@app.post("/api/patients/{patient_id}/prevent-calculate")
def calculate_patient_prevent_risk(
    patient_id: int,
    payload: schemas.PreventCalculateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_patient(db, patient_id, current_user.id)
    
    try:
        risk = calculate_prevent_risk(payload.dict())
        return risk
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка расчета риска: {str(e)}")

# --- Chat Sessions & Messages ---
@app.get("/api/patients/{patient_id}/chat/sessions", response_model=List[schemas.ChatSessionResponse])
def get_chat_sessions(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_patient(db, patient_id, current_user.id)
    return db.query(models.ChatSession).filter(
        models.ChatSession.patient_id == patient_id
    ).order_by(models.ChatSession.updated_at.desc()).all()

@app.post("/api/patients/{patient_id}/chat/sessions", response_model=schemas.ChatSessionResponse)
def create_chat_session(
    patient_id: int,
    data: schemas.ChatSessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_patient(db, patient_id, current_user.id)
    session = models.ChatSession(
        patient_id=patient_id,
        title=data.title or "Новый диалог",
        model_id=data.model_id or "demo-doctor",
        provider=data.provider or "demo"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@app.get("/api/chat/sessions/{session_id}/messages", response_model=List[schemas.ChatMessageResponse])
def get_chat_messages(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_session(db, session_id, current_user.id)
    return db.query(models.ChatMessage).filter(
        models.ChatMessage.session_id == session_id
    ).order_by(models.ChatMessage.created_at.asc()).all()

@app.delete("/api/chat/sessions/{session_id}")
def delete_chat_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    session = get_owned_session(db, session_id, current_user.id)
    db.delete(session)
    db.commit()
    return {"success": True}

@app.put("/api/chat/sessions/{session_id}", response_model=schemas.ChatSessionResponse)
def update_chat_session(
    session_id: int,
    data: schemas.ChatSessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    session = get_owned_session(db, session_id, current_user.id)
    if data.model_id:
        session.model_id = data.model_id
    if data.provider:
        session.provider = data.provider
    if data.title:
        session.title = data.title
    db.commit()
    db.refresh(session)
    return session

# Helper to fetch settings scoped to user
def get_all_settings_dict(db: Session, user_id: int):
    rows = db.query(models.AppSetting).filter(models.AppSetting.user_id == user_id).all()
    return {r.key: r.value for r in rows if r.value}

@app.post("/api/chat/sessions/{session_id}/stream")
async def stream_chat_message(
    session_id: int,
    payload: schemas.ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    session = get_owned_session(db, session_id, current_user.id)
    patient = get_owned_patient(db, session.patient_id, current_user.id)

    # Update session model if requested
    if payload.model_id:
        session.model_id = payload.model_id
    if payload.provider:
        session.provider = payload.provider

    # Save user message
    user_msg = models.ChatMessage(
        session_id=session.id,
        role="user",
        content=payload.content
    )
    db.add(user_msg)

    # Update session title if first message and not already custom
    msg_count = db.query(models.ChatMessage).filter(models.ChatMessage.session_id == session.id).count()
    if msg_count <= 1:
        if not session.title or session.title.startswith("Консультация ") or session.title.startswith("Consultation "):
            clean_title = payload.content[:40] + ("..." if len(payload.content) > 40 else "")
            session.title = clean_title

    session.updated_at = datetime.utcnow()
    db.commit()

    # Smart comprehensive RAG search across patient documents
    patient_docs = db.query(models.Document).filter(
        models.Document.patient_id == patient.id,
        models.Document.extracted_text.isnot(None)
    ).all()
    folders_dict = {f.id: f.name for f in db.query(models.Folder).filter(models.Folder.patient_id == patient.id).all()}
    
    rag_sources = rag_engine.get_patient_context(
        patient_id=patient.id,
        query=payload.content,
        db_documents=patient_docs,
        folders_map=folders_dict
    )

    # Get conversation history for LLM
    past_messages = db.query(models.ChatMessage).filter(
        models.ChatMessage.session_id == session.id
    ).order_by(models.ChatMessage.created_at.asc()).all()

    llm_history = [{"role": m.role, "content": m.content} for m in past_messages]

    # Patient profile summary
    patient_profile = {
        "full_name": patient.full_name,
        "age": patient.age,
        "gender": patient.gender,
        "height": patient.height,
        "weight": patient.weight,
        "bmi": patient.bmi,
        "blood_type": patient.blood_type,
        "allergies": patient.allergies,
        "chronic_diseases": patient.chronic_diseases,
        "current_medications": patient.current_medications,
    }

    # Automatically compute AHA PREVENT 10-year risk from patient documents
    try:
        prevent_inputs = extract_prevent_inputs(patient, patient_docs)
        patient_profile["prevent_risk"] = calculate_prevent_risk(prevent_inputs)
    except Exception as e:
        print(f"[PREVENT Error in Chat Stream] {e}")
        patient_profile["prevent_risk"] = None

    settings = get_all_settings_dict(db, current_user.id)
    api_keys = {
        "openai": settings.get("api_key_openai") or os.getenv("OPENAI_API_KEY", ""),
        "anthropic": settings.get("api_key_anthropic") or os.getenv("ANTHROPIC_API_KEY", ""),
        "gemini": settings.get("api_key_gemini") or os.getenv("GEMINI_API_KEY", ""),
        "antigravity": settings.get("api_key_gemini") or os.getenv("GEMINI_API_KEY", ""),
        "deepseek": settings.get("api_key_deepseek") or os.getenv("DEEPSEEK_API_KEY", ""),
        "grok": settings.get("api_key_grok") or os.getenv("GROK_API_KEY", ""),
        "qwen": settings.get("api_key_qwen") or os.getenv("QWEN_API_KEY", ""),
    }
    local_urls = {
        "lmstudio": settings.get("url_lmstudio") or "http://localhost:1234/v1",
        "ollama": settings.get("url_ollama") or "http://localhost:11434/v1",
    }

    # Medical internet resources config
    med_resources_raw = settings.get("medical_resources_config")
    try:
        med_resources_config = json.loads(med_resources_raw) if med_resources_raw else None
    except Exception:
        med_resources_config = None

    if not med_resources_config:
        med_resources_config = {
            "pubmed_enabled": True,
            "pubmed_priority": True,
            "cochrane_enabled": True,
            "uptodate_enabled": True,
            "mayo_enabled": True,
            "custom_urls": ["https://pubmed.ncbi.nlm.nih.gov/"]
        }

    pubmed_articles = []
    if med_resources_config.get("pubmed_enabled", True):
        try:
            pubmed_articles = await pubmed_service.search_pubmed(
                user_query=payload.content,
                patient_profile=patient_profile,
                max_results=3
            )
        except Exception as ex:
            print(f"[PubMed Stream Error]: {ex}")

    async def event_generator():
        accumulated_text = ""
        # 1. Send sources metadata first (RAG documents + PubMed studies)
        sources_meta = [{
            "filename": s["filename"],
            "folder": s["folder_type"],
            "snippet": (s["content"][:250].strip() + "...") if len(s["content"]) > 250 else s["content"].strip()
        } for s in rag_sources]

        # Append PubMed citations to sources drawer
        for p in pubmed_articles:
            sources_meta.append({
                "filename": f"PubMed: {p['title']}",
                "folder": "pubmed",
                "pmid": p["pmid"],
                "url": p["url"],
                "journal": p.get("journal", ""),
                "pub_date": p.get("pub_date", ""),
                "snippet": f"[{p.get('journal', 'NCBI')}, {p.get('pub_date', '')}] {p.get('abstract', '') or p.get('title', '')}"
            })

        yield f"event: sources\ndata: {json.dumps(sources_meta, ensure_ascii=False)}\n\n"

        # 2. Stream tokens
        async for token in llm_hub.stream_chat(
            messages=llm_history,
            model_id=session.model_id,
            provider=session.provider,
            patient_profile=patient_profile,
            context_sources=rag_sources,
            api_keys=api_keys,
            local_urls=local_urls,
            pubmed_sources=pubmed_articles,
            medical_resources_config=med_resources_config
        ):
            accumulated_text += token
            yield f"event: token\ndata: {json.dumps({'delta': token}, ensure_ascii=False)}\n\n"

        # 3. Save assistant message to DB
        from .database import SessionLocal
        save_db = SessionLocal()
        try:
            bot_msg = models.ChatMessage(
                session_id=session_id,
                role="assistant",
                content=accumulated_text,
                sources_json=json.dumps(sources_meta, ensure_ascii=False) if sources_meta else None
            )
            save_db.add(bot_msg)
            save_db.commit()
        finally:
            save_db.close()

        yield f"event: done\ndata: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# --- Models & Settings ---
@app.get("/api/models")
async def get_models(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    settings = get_all_settings_dict(db, current_user.id)
    lm_url = settings.get("url_lmstudio") or "http://localhost:1234/v1"
    ol_url = settings.get("url_ollama") or "http://localhost:11434/v1"
    return await llm_hub.get_models_list(lm_url, ol_url)

@app.get("/api/settings/check-local")
async def check_local_servers(
    lmstudio_url: str = "http://localhost:1234/v1",
    ollama_url: str = "http://localhost:11434/v1",
    current_user: models.User = Depends(get_current_user)
):
    lm_status = await llm_hub.check_local_status(lmstudio_url)
    ollama_status = await llm_hub.check_local_status(ollama_url)
    return {
        "lmstudio": lm_status,
        "ollama": ollama_status
    }

@app.get("/api/settings")
def get_settings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    settings = db.query(models.AppSetting).filter(models.AppSetting.user_id == current_user.id).all()
    # Mask secret keys for safety
    res = {}
    for s in settings:
        if ("api_key" in s.key or "mcp_access_token" in s.key) and s.value:
            res[s.key] = s.value[:4] + "..." + s.value[-4:] if len(s.value) > 8 else "****"
        else:
            res[s.key] = s.value
    return res

@app.post("/api/settings")
def update_settings(
    data: schemas.SettingUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    setting = db.query(models.AppSetting).filter(
        models.AppSetting.user_id == current_user.id,
        models.AppSetting.key == data.key
    ).first()
    if not setting:
        setting = models.AppSetting(user_id=current_user.id, key=data.key, value=data.value)
        db.add(setting)
    else:
        setting.value = data.value
    db.commit()
    return {"success": True, "key": data.key}

# --- MCP Server (Model Context Protocol for ChatGPT / Claude / Gemini / Cursor) ---
def _get_or_create_mcp_token(db: Session, user_id: int, rotate: bool = False) -> str:
    row = db.query(models.AppSetting).filter(
        models.AppSetting.user_id == user_id,
        models.AppSetting.key == "mcp_access_token",
    ).first()
    if row and row.value and not rotate:
        return row.value
    new_token = f"mydoc_mcp_{secrets.token_urlsafe(28)}"
    if not row:
        row = models.AppSetting(
            user_id=user_id,
            key="mcp_access_token",
            value=new_token,
            description="Personal MCP Server access token",
        )
        db.add(row)
    else:
        row.value = new_token
    db.commit()
    return new_token

def _resolve_mcp_user(request: Request, token_query: Optional[str], db: Session) -> models.User:
    auth_header = request.headers.get("authorization") or ""
    raw_token = None
    if auth_header.lower().startswith("bearer "):
        raw_token = auth_header.split(" ", 1)[1].strip()
    if not raw_token and token_query:
        raw_token = token_query.strip()
    if not raw_token:
        raise HTTPException(status_code=401, detail="MCP access token required (Bearer header or ?token=...)")

    setting = db.query(models.AppSetting).filter(
        models.AppSetting.key == "mcp_access_token",
        models.AppSetting.value == raw_token,
    ).first()
    if not setting or not setting.user_id:
        raise HTTPException(status_code=401, detail="Invalid or revoked MCP access token")

    user = db.query(models.User).filter(
        models.User.id == setting.user_id,
        models.User.is_active == True,
    ).first()
    if not user:
        raise HTTPException(status_code=401, detail="Account inactive or not found")
    return user

@app.get("/api/mcp/token")
def get_mcp_token(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    token = _get_or_create_mcp_token(db, current_user.id, rotate=False)
    base_url = str(request.base_url).rstrip("/")
    return {
        "token": token,
        "mcp_url": f"{base_url}/api/mcp?token={token}",
        "mcp_base_url": f"{base_url}/api/mcp",
    }

@app.post("/api/mcp/token")
def rotate_mcp_token(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    token = _get_or_create_mcp_token(db, current_user.id, rotate=True)
    base_url = str(request.base_url).rstrip("/")
    return {
        "token": token,
        "mcp_url": f"{base_url}/api/mcp?token={token}",
        "mcp_base_url": f"{base_url}/api/mcp",
    }

@app.get("/api/mcp")
def mcp_info():
    return {
        "name": "MY_DOC Medical Assistant MCP Server",
        "protocol": "Model Context Protocol (Streamable HTTP / JSON-RPC 2.0)",
        "endpoint": "/api/mcp",
        "auth": "Pass your personal MCP token via 'Authorization: Bearer <token>' or '?token=<token>'",
    }

@app.post("/api/mcp")
async def mcp_endpoint(
    request: Request,
    token: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    user = _resolve_mcp_user(request, token, db)
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            status_code=400,
            content={"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error"}},
        )

    if isinstance(body, list):
        responses = []
        for item in body:
            if isinstance(item, dict):
                r = await handle_mcp_jsonrpc(item, user, db)
                if r is not None:
                    responses.append(r)
        if not responses:
            return Response(status_code=202)
        return JSONResponse(content=responses)

    if isinstance(body, dict):
        resp = await handle_mcp_jsonrpc(body, user, db)
        if resp is None:
            return Response(status_code=202)
        return JSONResponse(content=resp)

    return JSONResponse(
        status_code=400,
        content={"jsonrpc": "2.0", "id": None, "error": {"code": -32600, "message": "Invalid Request"}},
    )
