const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface Patient {
  id: number;
  full_name: string;
  birth_date?: string;
  age?: number;
  gender?: string;
  height?: number;
  weight?: number;
  bmi?: number;
  blood_type?: string;
  allergies?: string;
  chronic_diseases?: string;
  current_medications?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: number;
  patient_id: number;
  name: string;
  folder_type: string;
  created_at: string;
  doc_count?: number;
}

export interface DocumentItem {
  id: number;
  patient_id: number;
  folder_id?: number;
  filename: string;
  file_size: number;
  file_type: string;
  is_indexed: boolean;
  created_at: string;
}

export interface DocumentDetail extends DocumentItem {
  extracted_text: string;
  metrics: LabMetric[];
}

export interface LabMetric {
  id: number;
  patient_id: number;
  document_id?: number;
  metric_name: string;
  value: number;
  unit?: string;
  reference_min?: number;
  reference_max?: number;
  status: string;
  record_date: string;
  notes?: string;
  created_at: string;
}

export interface ChatSession {
  id: number;
  patient_id: number;
  title: string;
  model_id: string;
  provider: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  session_id: number;
  role: "user" | "assistant" | "system";
  content: string;
  sources_json?: string;
  created_at: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  is_local: boolean;
}

export interface PreventInputs {
  sex: string;
  age: number;
  total_cholesterol_mmol: number;
  total_cholesterol_mg: number;
  hdl_cholesterol_mmol: number;
  hdl_cholesterol_mg: number;
  systolic_bp: number;
  has_diabetes: boolean;
  current_smoker: boolean;
  bmi: number;
  egfr: number;
  creatinine_umol: number;
  on_htn_meds: boolean;
  on_cholesterol_meds: boolean;
  risk_modifiers?: string[];
  sources_detected?: Record<string, string>;
}

export interface PreventRiskResult {
  cvd_10yr: number;
  ascvd_10yr: number;
  heart_failure_10yr: number;
  cvd_30yr?: number | null;
  ascvd_30yr?: number | null;
  risk_category: string;
  risk_color: "emerald" | "amber" | "orange" | "rose" | string;
  risk_badge: string;
  risk_modifiers?: string[];
  recommendations: string[];
  inputs_used?: Record<string, any>;
}

export interface PreventParamsResponse {
  inputs: PreventInputs;
  risk: PreventRiskResult;
  patient_name: string;
}

export const api = {
  // Patients
  async getPatients(): Promise<Patient[]> {
    const res = await fetch(`${API_BASE}/patients`);
    if (!res.ok) throw new Error("Failed to fetch patients");
    return res.json();
  },

  async createPatient(data: Partial<Patient>): Promise<Patient> {
    const res = await fetch(`${API_BASE}/patients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create patient");
    return res.json();
  },

  async updatePatient(id: number, data: Partial<Patient>): Promise<Patient> {
    const res = await fetch(`${API_BASE}/patients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update patient");
    return res.json();
  },

  async deletePatient(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/patients/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete patient");
  },

  // Folders & Documents
  async getFolders(patientId: number): Promise<Folder[]> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/folders`);
    if (!res.ok) throw new Error("Failed to fetch folders");
    return res.json();
  },

  async getDocuments(patientId: number, folderId?: number): Promise<DocumentItem[]> {
    const url = folderId !== undefined
      ? `${API_BASE}/patients/${patientId}/documents?folder_id=${folderId}`
      : `${API_BASE}/patients/${patientId}/documents`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch documents");
    return res.json();
  },

  async uploadDocument(patientId: number, file: File, folderId?: number): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    if (folderId) formData.append("folder_id", folderId.toString());

    const res = await fetch(`${API_BASE}/patients/${patientId}/documents/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to upload document");
    return res.json();
  },

  async deleteDocument(patientId: number, docId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/documents/${docId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete document");
  },

  async getDocumentDetails(patientId: number, docId: number): Promise<DocumentDetail> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/documents/${docId}`);
    if (!res.ok) throw new Error("Failed to fetch document details");
    return res.json();
  },

  getDocumentFileUrl(patientId: number, docId: number): string {
    return `${API_BASE}/patients/${patientId}/documents/${docId}/file`;
  },

  // Lab Metrics
  async getLabMetrics(patientId: number, metricName?: string): Promise<LabMetric[]> {
    const url = metricName
      ? `${API_BASE}/patients/${patientId}/labs?metric_name=${encodeURIComponent(metricName)}`
      : `${API_BASE}/patients/${patientId}/labs`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch lab metrics");
    return res.json();
  },

  async addLabMetric(patientId: number, data: Partial<LabMetric>): Promise<LabMetric> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/labs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to add metric");
    return res.json();
  },

  async deleteLabMetric(patientId: number, metricId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/labs/${metricId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete metric");
  },

  // Chat
  async getChatSessions(patientId: number): Promise<ChatSession[]> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/chat/sessions`);
    if (!res.ok) throw new Error("Failed to fetch sessions");
    return res.json();
  },

  async createChatSession(patientId: number, data: { title?: string; model_id?: string; provider?: string }): Promise<ChatSession> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/chat/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create session");
    return res.json();
  },

  async getChatMessages(sessionId: number): Promise<ChatMessage[]> {
    const res = await fetch(`${API_BASE}/chat/sessions/${sessionId}/messages`);
    if (!res.ok) throw new Error("Failed to fetch messages");
    return res.json();
  },

  async deleteChatSession(sessionId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/chat/sessions/${sessionId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete session");
  },

  async updateChatSession(sessionId: number, data: { model_id?: string; provider?: string; title?: string }): Promise<ChatSession> {
    const res = await fetch(`${API_BASE}/chat/sessions/${sessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update session");
    return res.json();
  },

  // Models & Settings
  async getModels(): Promise<AIModel[]> {
    const res = await fetch(`${API_BASE}/models`);
    if (!res.ok) throw new Error("Failed to fetch models");
    return res.json();
  },

  async checkLocalServers(): Promise<{ lmstudio: any; ollama: any }> {
    const res = await fetch(`${API_BASE}/settings/check-local`);
    if (!res.ok) throw new Error("Failed to check local status");
    return res.json();
  },

  async getSettings(): Promise<Record<string, string>> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error("Failed to fetch settings");
    return res.json();
  },

  async saveSetting(key: string, value: string): Promise<void> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) throw new Error("Failed to save setting");
  },

  // PREVENT Calculator
  async getPreventParams(patientId: number): Promise<PreventParamsResponse> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/prevent-params`);
    if (!res.ok) throw new Error("Failed to fetch PREVENT parameters");
    return res.json();
  },

  async calculatePreventRisk(patientId: number, params: Partial<PreventInputs>): Promise<PreventRiskResult> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/prevent-calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error("Failed to calculate PREVENT risk");
    return res.json();
  }
};
