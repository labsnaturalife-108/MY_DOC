import os
import shutil
import json
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from .database import engine, Base, get_db
from . import models, schemas
from .parser import extract_text_from_file, parse_lab_metrics
from .rag_engine import rag_engine
from .llm_hub import llm_hub, AVAILABLE_MODELS

# Create database tables
Base.metadata.create_all(bind=engine)

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

# --- Health Check ---
@app.get("/api/health")
def health():
    return {"status": "ok", "app": "MY_DOC", "timestamp": datetime.utcnow().isoformat()}

# --- Patient Endpoints ---
@app.get("/api/patients", response_model=List[schemas.PatientResponse])
def list_patients(db: Session = Depends(get_db)):
    return db.query(models.Patient).order_by(models.Patient.updated_at.desc()).all()

@app.post("/api/patients", response_model=schemas.PatientResponse)
def create_patient(data: schemas.PatientCreate, db: Session = Depends(get_db)):
    # Calculate BMI if height and weight are provided
    bmi = None
    if data.height and data.weight and data.height > 0:
        h_m = data.height / 100.0
        bmi = round(data.weight / (h_m * h_m), 1)

    patient = models.Patient(
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
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Пациент не найден")
    return patient

@app.put("/api/patients/{patient_id}", response_model=schemas.PatientResponse)
def update_patient(patient_id: int, data: schemas.PatientUpdate, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Пациент не найден")

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
def delete_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Пациент не найден")
    
    # Also delete vectors
    docs = db.query(models.Document).filter(models.Document.patient_id == patient_id).all()
    for d in docs:
        rag_engine.delete_document(patient_id, d.id)

    db.delete(patient)
    db.commit()
    return {"success": True, "message": "Пациент удален"}

# --- Folders & Documents ---
@app.get("/api/patients/{patient_id}/folders", response_model=List[schemas.FolderResponse])
def get_folders(patient_id: int, db: Session = Depends(get_db)):
    folders = db.query(models.Folder).filter(models.Folder.patient_id == patient_id).all()
    res = []
    for f in folders:
        doc_count = db.query(models.Document).filter(models.Document.folder_id == f.id).count()
        f_resp = schemas.FolderResponse.from_orm(f)
        f_resp.doc_count = doc_count
        res.append(f_resp)
    return res

@app.post("/api/patients/{patient_id}/folders", response_model=schemas.FolderResponse)
def create_folder(patient_id: int, data: schemas.FolderCreate, db: Session = Depends(get_db)):
    folder = models.Folder(patient_id=patient_id, name=data.name, folder_type=data.folder_type)
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return folder

@app.get("/api/patients/{patient_id}/documents", response_model=List[schemas.DocumentResponse])
def get_documents(patient_id: int, folder_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.Document).filter(models.Document.patient_id == patient_id)
    if folder_id is not None:
        query = query.filter(models.Document.folder_id == folder_id)
    return query.order_by(models.Document.created_at.desc()).all()

@app.post("/api/patients/{patient_id}/documents/upload")
async def upload_document(
    patient_id: int,
    file: UploadFile = File(...),
    folder_id: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Пациент не найден")

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

    # Extract text
    text_content = extract_text_from_file(file_path, file.filename)

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
    extracted_metrics = parse_lab_metrics(text_content, default_date=today_str)
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

@app.delete("/api/patients/{patient_id}/documents/{doc_id}")
def delete_document(patient_id: int, doc_id: int, db: Session = Depends(get_db)):
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

# --- Lab Metrics / Dynamic Charts ---
@app.get("/api/patients/{patient_id}/labs", response_model=List[schemas.LabMetricResponse])
def get_lab_metrics(patient_id: int, metric_name: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.LabMetric).filter(models.LabMetric.patient_id == patient_id)
    if metric_name:
        query = query.filter(models.LabMetric.metric_name == metric_name)
    return query.order_by(models.LabMetric.record_date.asc()).all()

@app.post("/api/patients/{patient_id}/labs", response_model=schemas.LabMetricResponse)
def add_lab_metric(patient_id: int, data: schemas.LabMetricCreate, db: Session = Depends(get_db)):
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
def delete_lab_metric(patient_id: int, metric_id: int, db: Session = Depends(get_db)):
    metric = db.query(models.LabMetric).filter(
        models.LabMetric.id == metric_id,
        models.LabMetric.patient_id == patient_id
    ).first()
    if not metric:
        raise HTTPException(status_code=404, detail="Показатель не найден")
    db.delete(metric)
    db.commit()
    return {"success": True}

# --- Chat Sessions & Messages ---
@app.get("/api/patients/{patient_id}/chat/sessions", response_model=List[schemas.ChatSessionResponse])
def get_chat_sessions(patient_id: int, db: Session = Depends(get_db)):
    return db.query(models.ChatSession).filter(
        models.ChatSession.patient_id == patient_id
    ).order_by(models.ChatSession.updated_at.desc()).all()

@app.post("/api/patients/{patient_id}/chat/sessions", response_model=schemas.ChatSessionResponse)
def create_chat_session(patient_id: int, data: schemas.ChatSessionCreate, db: Session = Depends(get_db)):
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
def get_chat_messages(session_id: int, db: Session = Depends(get_db)):
    return db.query(models.ChatMessage).filter(
        models.ChatMessage.session_id == session_id
    ).order_by(models.ChatMessage.created_at.asc()).all()

@app.delete("/api/chat/sessions/{session_id}")
def delete_chat_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(models.ChatSession).filter(models.ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Сессия не найдена")
    db.delete(session)
    db.commit()
    return {"success": True}

@app.put("/api/chat/sessions/{session_id}", response_model=schemas.ChatSessionResponse)
def update_chat_session(session_id: int, data: schemas.ChatSessionCreate, db: Session = Depends(get_db)):
    session = db.query(models.ChatSession).filter(models.ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Сессия не найдена")
    if data.model_id:
        session.model_id = data.model_id
    if data.provider:
        session.provider = data.provider
    if data.title:
        session.title = data.title
    db.commit()
    db.refresh(session)
    return session

# Helper to fetch settings
def get_all_settings_dict(db: Session):
    rows = db.query(models.AppSetting).all()
    return {r.key: r.value for r in rows if r.value}

@app.post("/api/chat/sessions/{session_id}/stream")
async def stream_chat_message(
    session_id: int,
    payload: schemas.ChatMessageCreate,
    db: Session = Depends(get_db)
):
    session = db.query(models.ChatSession).filter(models.ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Сессия не найдена")

    patient = db.query(models.Patient).filter(models.Patient.id == session.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Пациент не найден")

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

    # Update session title if first message
    msg_count = db.query(models.ChatMessage).filter(models.ChatMessage.session_id == session.id).count()
    if msg_count <= 1:
        clean_title = payload.content[:40] + ("..." if len(payload.content) > 40 else "")
        session.title = clean_title

    session.updated_at = datetime.utcnow()
    db.commit()

    # RAG search
    rag_sources = rag_engine.search_context(patient_id=patient.id, query=payload.content, n_results=4)

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

    settings = get_all_settings_dict(db)
    api_keys = {
        "openai": settings.get("api_key_openai") or os.getenv("OPENAI_API_KEY", ""),
        "anthropic": settings.get("api_key_anthropic") or os.getenv("ANTHROPIC_API_KEY", ""),
        "gemini": settings.get("api_key_gemini") or os.getenv("GEMINI_API_KEY", ""),
        "deepseek": settings.get("api_key_deepseek") or os.getenv("DEEPSEEK_API_KEY", ""),
        "grok": settings.get("api_key_grok") or os.getenv("GROK_API_KEY", ""),
        "qwen": settings.get("api_key_qwen") or os.getenv("QWEN_API_KEY", ""),
    }
    local_urls = {
        "lmstudio": settings.get("url_lmstudio") or "http://localhost:1234/v1",
        "ollama": settings.get("url_ollama") or "http://localhost:11434/v1",
    }

    async def event_generator():
        accumulated_text = ""
        # 1. Send sources metadata first
        sources_meta = [{
            "filename": s["filename"],
            "folder": s["folder_type"],
            "snippet": s["content"][:150] + "..."
        } for s in rag_sources]
        yield f"event: sources\ndata: {json.dumps(sources_meta, ensure_ascii=False)}\n\n"

        # 2. Stream tokens
        async for token in llm_hub.stream_chat(
            messages=llm_history,
            model_id=session.model_id,
            provider=session.provider,
            patient_profile=patient_profile,
            context_sources=rag_sources,
            api_keys=api_keys,
            local_urls=local_urls
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
async def get_models(db: Session = Depends(get_db)):
    settings = get_all_settings_dict(db)
    lm_url = settings.get("url_lmstudio") or "http://localhost:1234/v1"
    ol_url = settings.get("url_ollama") or "http://localhost:11434/v1"
    return await llm_hub.get_models_list(lm_url, ol_url)

@app.get("/api/settings/check-local")
async def check_local_servers(
    lmstudio_url: str = "http://localhost:1234/v1",
    ollama_url: str = "http://localhost:11434/v1"
):
    lm_status = await llm_hub.check_local_status(lmstudio_url)
    ollama_status = await llm_hub.check_local_status(ollama_url)
    return {
        "lmstudio": lm_status,
        "ollama": ollama_status
    }

@app.get("/api/settings")
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(models.AppSetting).all()
    # Mask secret keys for safety
    res = {}
    for s in settings:
        if "api_key" in s.key and s.value:
            res[s.key] = s.value[:4] + "..." + s.value[-4:] if len(s.value) > 8 else "****"
        else:
            res[s.key] = s.value
    return res

@app.post("/api/settings")
def update_settings(data: schemas.SettingUpdate, db: Session = Depends(get_db)):
    setting = db.query(models.AppSetting).filter(models.AppSetting.key == data.key).first()
    if not setting:
        setting = models.AppSetting(key=data.key, value=data.value)
        db.add(setting)
    else:
        setting.value = data.value
    db.commit()
    return {"success": True, "key": data.key}
