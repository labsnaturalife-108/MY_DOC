import json
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from . import models
from .prevent_calculator import extract_prevent_inputs, calculate_prevent_risk
from .pubmed_service import pubmed_service

MCP_PROTOCOL_VERSION = "2025-03-26"

MCP_TOOLS: List[Dict[str, Any]] = [
    {
        "name": "list_patients",
        "description": (
            "List all patients belonging to the authenticated MY_DOC user, "
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
            "Get the complete medical profile of a patient: height, weight, BMI, "
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
            "Get laboratory test results and trends over time for a patient, "
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
            "Get uploaded medical documents (lab reports, ultrasounds, MRI, doctor notes) "
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
            "Calculate the certified 2024 AHA PREVENT 10-year and 30-year cardiovascular risk "
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
            "Search PubMed (NCBI) for peer-reviewed medical literature and clinical guidelines."
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
]


def _get_user_patient(db: Session, user_id: int, patient_id: int) -> Optional[models.Patient]:
    return (
        db.query(models.Patient)
        .filter(models.Patient.id == patient_id, models.Patient.user_id == user_id)
        .first()
    )


async def _execute_tool(name: str, arguments: Dict[str, Any], user: models.User, db: Session) -> str:
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

    raise ValueError(f"Unknown tool: {name}")


async def handle_mcp_jsonrpc(payload: Dict[str, Any], user: models.User, db: Session) -> Optional[Dict[str, Any]]:
    """Handles a single MCP JSON-RPC 2.0 request."""
    req_id = payload.get("id")
    method = payload.get("method", "")
    params = payload.get("params") or {}

    # Notifications have no id and require no JSON-RPC response body
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
                    "name": "MY_DOC Medical Assistant",
                    "version": "1.0.0",
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
