import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from . import models
from .parser import parse_lab_metrics
from .prevent_calculator import extract_prevent_inputs, calculate_prevent_risk
from .pubmed_service import pubmed_service

MCP_PROTOCOL_VERSION = "2025-03-26"

MCP_TOOLS: List[Dict[str, Any]] = [
    # --- READ TOOLS ---
    {
        "name": "list_patients",
        "description": (
            "[READ] List all patients belonging to the authenticated MY_DOC user, "
            "including their IDs, names, age, gender, and BMI."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_patient_profile",
        "description": (
            "[READ] Get the complete medical profile of a patient: height, weight, BMI, "
            "blood type, critical allergies, chronic diseases, current medications, and notes."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "patient_id": {
                    "type": "integer",
                    "description": "ID of the patient (from list_patients)",
                }
            },
            "required": ["patient_id"],
        },
    },
    {
        "name": "get_lab_metrics",
        "description": (
            "[READ] Get laboratory test results and trends over time for a patient, "
            "including values, units, reference ranges, abnormal flags (low/high), and dates."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "patient_id": {
                    "type": "integer",
                    "description": "ID of the patient",
                },
                "metric_name": {
                    "type": "string",
                    "description": "Optional substring filter for a specific biomarker (e.g. 'Ферритин', 'Hb', 'B12')",
                },
            },
            "required": ["patient_id"],
        },
    },
    {
        "name": "get_patient_documents",
        "description": (
            "[READ] Get uploaded medical documents (lab reports, ultrasounds, MRI, doctor notes) "
            "and their full extracted OCR text for a patient."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "patient_id": {
                    "type": "integer",
                    "description": "ID of the patient",
                },
                "include_text": {
                    "type": "boolean",
                    "description": "Include full extracted text of each document (default: true)",
                    "default": True,
                },
            },
            "required": ["patient_id"],
        },
    },
    {
        "name": "calculate_prevent_risk",
        "description": (
            "[READ] Calculate the certified 2024 AHA PREVENT 10-year and 30-year cardiovascular risk "
            "(CVD, ASCVD, Heart Failure) automatically from the patient's profile and lab reports."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "patient_id": {
                    "type": "integer",
                    "description": "ID of the patient",
                }
            },
            "required": ["patient_id"],
        },
    },
    {
        "name": "search_pubmed",
        "description": (
            "[READ] Search PubMed (NCBI) for peer-reviewed medical literature and clinical guidelines."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Medical search query (in English or Russian)",
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of articles to return (1-5, default: 3)",
                    "default": 3,
                },
            },
            "required": ["query"],
        },
    },
    # --- WRITE TOOLS (READ / WRITE MCP) ---
    {
        "name": "create_patient",
        "description": (
            "[WRITE] Create a new patient profile in MY_DOC (automatically creates default folders). "
            "Returns the created patient with its new ID."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "full_name": {"type": "string", "description": "Patient full name (required)"},
                "birth_date": {"type": "string", "description": "Birth date (YYYY-MM-DD)"},
                "age": {"type": "integer", "description": "Age in years"},
                "gender": {"type": "string", "description": "'male' or 'female'"},
                "height": {"type": "number", "description": "Height in cm"},
                "weight": {"type": "number", "description": "Weight in kg"},
                "blood_type": {"type": "string", "description": "Blood type (e.g. A+, O-)"},
                "allergies": {"type": "string", "description": "Known allergies"},
                "chronic_diseases": {"type": "string", "description": "Chronic conditions / diagnoses"},
                "current_medications": {"type": "string", "description": "Current medications and supplements"},
                "notes": {"type": "string", "description": "Additional clinical notes"},
            },
            "required": ["full_name"],
        },
    },
    {
        "name": "update_patient",
        "description": (
            "[WRITE] Update fields of an existing patient profile in MY_DOC (recalculates BMI automatically)."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "integer", "description": "ID of the patient to update"},
                "full_name": {"type": "string"},
                "birth_date": {"type": "string"},
                "age": {"type": "integer"},
                "gender": {"type": "string"},
                "height": {"type": "number"},
                "weight": {"type": "number"},
                "blood_type": {"type": "string"},
                "allergies": {"type": "string"},
                "chronic_diseases": {"type": "string"},
                "current_medications": {"type": "string"},
                "notes": {"type": "string"},
            },
            "required": ["patient_id"],
        },
    },
    {
        "name": "upload_document_text",
        "description": (
            "[WRITE] Upload a medical document or transcribed lab report text to a patient's folder in MY_DOC "
            "and automatically extract numeric biomarkers into Lab Dynamics charts. "
            "Ideal when Claude/ChatGPT reads a user's photo/PDF and saves it into MY_DOC."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "integer", "description": "ID of the patient"},
                "filename": {"type": "string", "description": "Document name (e.g. '2026-11-12_Blood_Test.txt')"},
                "text_content": {"type": "string", "description": "Full text / OCR transcription of the medical report"},
                "folder_type": {
                    "type": "string",
                    "description": "Target folder type: 'analyses' (default), 'researches', 'notes', or 'knowledge_base'",
                    "default": "analyses",
                },
                "record_date": {
                    "type": "string",
                    "description": "Optional test date YYYY-MM-DD (used as default date for extracted metrics)",
                },
            },
            "required": ["patient_id", "filename", "text_content"],
        },
    },
    {
        "name": "add_lab_metrics",
        "description": (
            "[WRITE] Add one or more structured laboratory biomarkers directly into a patient's Lab Dynamics charts. "
            "Use this to save exact numeric values, units, reference ranges, and dates read from lab photos or PDFs."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "integer", "description": "ID of the patient"},
                "metrics": {
                    "type": "array",
                    "description": "List of lab metrics to record",
                    "items": {
                        "type": "object",
                        "properties": {
                            "metric_name": {"type": "string", "description": "Name of biomarker (e.g. 'Альбумин', 'Гемоглобин (Hb)', 'Ферритин')"},
                            "value": {"type": "number", "description": "Numeric result"},
                            "unit": {"type": "string", "description": "Unit (e.g. 'г/л', 'мкг/л', 'Ед/л', '%')"},
                            "reference_min": {"type": "number", "description": "Lower reference bound"},
                            "reference_max": {"type": "number", "description": "Upper reference bound"},
                            "record_date": {"type": "string", "description": "Date YYYY-MM-DD"},
                            "notes": {"type": "string", "description": "Optional note"},
                        },
                        "required": ["metric_name", "value", "record_date"],
                    },
                },
            },
            "required": ["patient_id", "metrics"],
        },
    },
    {
        "name": "delete_document",
        "description": (
            "[WRITE] Delete a specific medical document (and its linked extracted metrics) from a patient's account."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "integer", "description": "ID of the patient"},
                "document_id": {"type": "integer", "description": "ID of the document to delete"},
            },
            "required": ["patient_id", "document_id"],
        },
    },
]


def _get_user_patient(db: Session, user_id: int, patient_id: int) -> Optional[models.Patient]:
    return (
        db.query(models.Patient)
        .filter(models.Patient.id == patient_id, models.Patient.user_id == user_id)
        .first()
    )


def _create_default_folders(db: Session, patient_id: int):
    defaults = [
        ("Лабораторные анализы", "analyses"),
        ("Инструментальные исследования", "researches"),
        ("Консультации и выписки", "notes"),
        ("База знаний и литература", "knowledge_base"),
    ]
    for name, ftype in defaults:
        db.add(models.Folder(patient_id=patient_id, name=name, folder_type=ftype))
    db.commit()


async def _execute_tool(name: str, arguments: Dict[str, Any], user: models.User, db: Session) -> str:
    # --- READ TOOLS ---
    if name == "list_patients":
        patients = (
            db.query(models.Patient)
            .filter(models.Patient.user_id == user.id)
            .order_by(models.Patient.updated_at.desc())
            .all()
        )
        if not patients:
            return "У пользователя пока нет созданных пациентов в MY_DOC."
        data = [
            {
                "id": p.id,
                "full_name": p.full_name,
                "age": p.age,
                "gender": p.gender,
                "bmi": p.bmi,
            }
            for p in patients
        ]
        return json.dumps(data, ensure_ascii=False, indent=2)

    if name == "get_patient_profile":
        pid = int(arguments["patient_id"])
        p = _get_user_patient(db, user.id, pid)
        if not p:
            return f"Пациент с ID {pid} не найден."
        profile = {
            "id": p.id,
            "full_name": p.full_name,
            "birth_date": p.birth_date,
            "age": p.age,
            "gender": p.gender,
            "height_cm": p.height,
            "weight_kg": p.weight,
            "bmi": p.bmi,
            "blood_type": p.blood_type,
            "allergies": p.allergies,
            "chronic_diseases": p.chronic_diseases,
            "current_medications": p.current_medications,
            "notes": p.notes,
        }
        return json.dumps(profile, ensure_ascii=False, indent=2)

    if name == "get_lab_metrics":
        pid = int(arguments["patient_id"])
        p = _get_user_patient(db, user.id, pid)
        if not p:
            return f"Пациент с ID {pid} не найден."
        q = db.query(models.LabMetric).filter(models.LabMetric.patient_id == pid)
        metric_filter = (arguments.get("metric_name") or "").strip().lower()
        rows = q.order_by(models.LabMetric.record_date.desc()).all()
        if metric_filter:
            rows = [r for r in rows if metric_filter in (r.metric_name or "").lower()]
        if not rows:
            return "Лабораторные показатели для этого пациента не найдены."
        data = [
            {
                "metric_name": r.metric_name,
                "value": r.value,
                "unit": r.unit,
                "reference_min": r.reference_min,
                "reference_max": r.reference_max,
                "status": r.status,
                "record_date": r.record_date,
            }
            for r in rows[:200]
        ]
        return json.dumps(data, ensure_ascii=False, indent=2)

    if name == "get_patient_documents":
        pid = int(arguments["patient_id"])
        include_text = bool(arguments.get("include_text", True))
        p = _get_user_patient(db, user.id, pid)
        if not p:
            return f"Пациент с ID {pid} не найден."
        docs = (
            db.query(models.Document)
            .filter(models.Document.patient_id == pid)
            .order_by(models.Document.created_at.desc())
            .all()
        )
        if not docs:
            return "У этого пациента нет загруженных документов."
        data = []
        total_chars = 0
        for d in docs:
            item: Dict[str, Any] = {
                "id": d.id,
                "filename": d.filename,
                "file_type": d.file_type,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            if include_text and total_chars < 35000:
                txt = (d.extracted_text or "").strip()
                if len(txt) > 3500:
                    txt = txt[:3500] + "\n...[обрезано]"
                item["extracted_text"] = txt
                total_chars += len(txt)
            data.append(item)
        return json.dumps(data, ensure_ascii=False, indent=2)

    if name == "calculate_prevent_risk":
        pid = int(arguments["patient_id"])
        p = _get_user_patient(db, user.id, pid)
        if not p:
            return f"Пациент с ID {pid} не найден."
        docs = (
            db.query(models.Document)
            .filter(models.Document.patient_id == pid, models.Document.extracted_text.isnot(None))
            .all()
        )
        inputs = extract_prevent_inputs(p, docs)
        risk = calculate_prevent_risk(inputs)
        return json.dumps({"patient": p.full_name, "inputs": inputs, "risk": risk}, ensure_ascii=False, indent=2)

    if name == "search_pubmed":
        query = str(arguments.get("query") or "").strip()
        max_results = max(1, min(5, int(arguments.get("max_results", 3))))
        articles = await pubmed_service.search_pubmed(user_query=query, max_results=max_results)
        return json.dumps(articles, ensure_ascii=False, indent=2)

    # --- WRITE TOOLS ---
    if name == "create_patient":
        full_name = str(arguments.get("full_name") or "").strip()
        if not full_name:
            raise ValueError("full_name is required")
        height = arguments.get("height")
        weight = arguments.get("weight")
        bmi = None
        if height and weight and float(height) > 0:
            h_m = float(height) / 100.0
            bmi = round(float(weight) / (h_m * h_m), 1)

        patient = models.Patient(
            user_id=user.id,
            full_name=full_name,
            birth_date=arguments.get("birth_date"),
            age=int(arguments["age"]) if arguments.get("age") is not None else None,
            gender=arguments.get("gender"),
            height=float(height) if height is not None else None,
            weight=float(weight) if weight is not None else None,
            bmi=bmi,
            blood_type=arguments.get("blood_type"),
            allergies=arguments.get("allergies"),
            chronic_diseases=arguments.get("chronic_diseases"),
            current_medications=arguments.get("current_medications"),
            notes=arguments.get("notes"),
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)
        _create_default_folders(db, patient.id)
        return json.dumps(
            {"success": True, "patient_id": patient.id, "full_name": patient.full_name, "bmi": patient.bmi},
            ensure_ascii=False,
        )

    if name == "update_patient":
        pid = int(arguments["patient_id"])
        p = _get_user_patient(db, user.id, pid)
        if not p:
            return f"Пациент с ID {pid} не найден."
        updatable = [
            "full_name", "birth_date", "age", "gender", "height", "weight",
            "blood_type", "allergies", "chronic_diseases", "current_medications", "notes",
        ]
        for field in updatable:
            if field in arguments and arguments[field] is not None:
                setattr(p, field, arguments[field])
        if p.height and p.weight and p.height > 0:
            h_m = p.height / 100.0
            p.bmi = round(p.weight / (h_m * h_m), 1)
        p.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(p)
        return json.dumps(
            {"success": True, "patient_id": p.id, "full_name": p.full_name, "bmi": p.bmi},
            ensure_ascii=False,
        )

    if name == "upload_document_text":
        pid = int(arguments["patient_id"])
        p = _get_user_patient(db, user.id, pid)
        if not p:
            return f"Пациент с ID {pid} не найден."
        filename = str(arguments.get("filename") or "MCP_Document.txt").strip()
        text_content = str(arguments.get("text_content") or "").strip()
        folder_type = str(arguments.get("folder_type") or "analyses").strip()
        default_date = str(arguments.get("record_date") or datetime.utcnow().strftime("%Y-%m-%d")).strip()

        folder = db.query(models.Folder).filter(
            models.Folder.patient_id == pid,
            models.Folder.folder_type == folder_type,
        ).first()
        if not folder:
            folder = db.query(models.Folder).filter(models.Folder.patient_id == pid).first()

        doc = models.Document(
            patient_id=pid,
            folder_id=folder.id if folder else None,
            filename=filename,
            filepath="",
            file_size=len(text_content.encode("utf-8")),
            file_type=filename.split(".")[-1].lower() if "." in filename else "txt",
            extracted_text=text_content,
            is_indexed=True,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        extracted = parse_lab_metrics(
            text_content,
            default_date=default_date,
            patient_age=p.age or 50,
            patient_gender=p.gender or "male",
            filename=filename,
        )
        added_metrics = 0
        for m in extracted:
            db.add(models.LabMetric(
                patient_id=pid,
                document_id=doc.id,
                metric_name=m["metric_name"],
                value=m["value"],
                unit=m["unit"],
                reference_min=m["reference_min"],
                reference_max=m["reference_max"],
                status=m["status"],
                record_date=m["record_date"],
                notes=m["notes"],
            ))
            added_metrics += 1
        if added_metrics > 0:
            db.commit()

        return json.dumps(
            {
                "success": True,
                "document_id": doc.id,
                "filename": doc.filename,
                "extracted_metrics_count": added_metrics,
            },
            ensure_ascii=False,
        )

    if name == "add_lab_metrics":
        pid = int(arguments["patient_id"])
        p = _get_user_patient(db, user.id, pid)
        if not p:
            return f"Пациент с ID {pid} не найден."
        metrics_in = arguments.get("metrics") or []
        if not isinstance(metrics_in, list) or not metrics_in:
            raise ValueError("metrics must be a non-empty array")
        added = 0
        for item in metrics_in:
            m_name = str(item.get("metric_name") or "").strip()
            if not m_name:
                continue
            val = float(item["value"])
            ref_min = float(item["reference_min"]) if item.get("reference_min") is not None else None
            ref_max = float(item["reference_max"]) if item.get("reference_max") is not None else None
            status = "normal"
            if ref_min is not None and val < ref_min:
                status = "low"
            elif ref_max is not None and val > ref_max:
                status = "high"
            db.add(models.LabMetric(
                patient_id=pid,
                metric_name=m_name,
                value=val,
                unit=item.get("unit"),
                reference_min=ref_min,
                reference_max=ref_max,
                status=status,
                record_date=str(item.get("record_date") or datetime.utcnow().strftime("%Y-%m-%d")),
                notes=item.get("notes") or "Добавлено через MCP",
            ))
            added += 1
        db.commit()
        return json.dumps({"success": True, "added_metrics_count": added}, ensure_ascii=False)

    if name == "delete_document":
        pid = int(arguments["patient_id"])
        did = int(arguments["document_id"])
        p = _get_user_patient(db, user.id, pid)
        if not p:
            return f"Пациент с ID {pid} не найден."
        doc = db.query(models.Document).filter(
            models.Document.id == did,
            models.Document.patient_id == pid,
        ).first()
        if not doc:
            return f"Документ с ID {did} не найден."
        db.delete(doc)
        db.commit()
        return json.dumps({"success": True, "deleted_document_id": did}, ensure_ascii=False)

    raise ValueError(f"Unknown tool: {name}")


async def handle_mcp_jsonrpc(payload: Dict[str, Any], user: models.User, db: Session) -> Optional[Dict[str, Any]]:
    """Handles a single MCP JSON-RPC 2.0 request."""
    req_id = payload.get("id")
    method = payload.get("method", "")
    params = payload.get("params") or {}

    if method.startswith("notifications/"):
        return None

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": MCP_PROTOCOL_VERSION,
                "capabilities": {"tools": {}},
                "serverInfo": {
                    "name": "MY_DOC Medical Assistant (Read/Write)",
                    "version": "1.1.0",
                },
            },
        }

    if method == "ping":
        return {"jsonrpc": "2.0", "id": req_id, "result": {}}

    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"tools": MCP_TOOLS},
        }

    if method == "tools/call":
        tool_name = params.get("name", "")
        tool_args = params.get("arguments") or {}
        try:
            text_result = await _execute_tool(tool_name, tool_args, user, db)
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": text_result}],
                    "isError": False,
                },
            }
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": f"Error executing {tool_name}: {str(e)}"}],
                    "isError": True,
                },
            }

    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {"code": -32601, "message": f"Method not found: {method}"},
    }
