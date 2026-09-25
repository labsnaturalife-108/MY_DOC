from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field

# --- Patient Schemas ---
class PatientBase(BaseModel):
    full_name: str
    birth_date: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    chronic_diseases: Optional[str] = None
    current_medications: Optional[str] = None
    notes: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    birth_date: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    chronic_diseases: Optional[str] = None
    current_medications: Optional[str] = None
    notes: Optional[str] = None

class PatientResponse(PatientBase):
    id: int
    bmi: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Folder Schemas ---
class FolderBase(BaseModel):
    name: str
    folder_type: str = "other" # analyses, researches, notes, knowledge_base, other

class FolderCreate(FolderBase):
    pass

class FolderResponse(FolderBase):
    id: int
    patient_id: int
    created_at: datetime
    doc_count: Optional[int] = 0

    class Config:
        from_attributes = True

# --- Document Schemas ---
class DocumentResponse(BaseModel):
    id: int
    patient_id: int
    folder_id: Optional[int] = None
    filename: str
    file_size: int
    file_type: str
    is_indexed: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Lab Metric Schemas ---
class LabMetricCreate(BaseModel):
    metric_name: str
    value: float
    unit: Optional[str] = None
    reference_min: Optional[float] = None
    reference_max: Optional[float] = None
    record_date: str
    notes: Optional[str] = None

class LabMetricResponse(LabMetricCreate):
    id: int
    patient_id: int
    document_id: Optional[int] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Chat Schemas ---
class ChatSessionCreate(BaseModel):
    title: Optional[str] = "Новый диалог"
    model_id: Optional[str] = "lm-studio"
    provider: Optional[str] = "lmstudio"

class ChatSessionResponse(BaseModel):
    id: int
    patient_id: int
    title: str
    model_id: str
    provider: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ChatMessageCreate(BaseModel):
    content: str
    model_id: Optional[str] = None
    provider: Optional[str] = None

class ChatMessageResponse(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    sources_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Settings Schemas ---
class SettingUpdate(BaseModel):
    key: str
    value: str

class SettingResponse(BaseModel):
    key: str
    value: Optional[str] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True

# --- PREVENT Calculator Schemas ---
class PreventCalculateRequest(BaseModel):
    sex: str = "male"
    age: float = 50.0
    total_cholesterol_mmol: Optional[float] = None
    total_cholesterol_mg: Optional[float] = None
    hdl_cholesterol_mmol: Optional[float] = None
    hdl_cholesterol_mg: Optional[float] = None
    systolic_bp: float = 120.0
    has_diabetes: bool = False
    current_smoker: bool = False
    bmi: float = 25.0
    egfr: Optional[float] = None
    creatinine_umol: Optional[float] = None
    on_htn_meds: bool = False
    on_cholesterol_meds: bool = False
    risk_modifiers: Optional[List[str]] = []
