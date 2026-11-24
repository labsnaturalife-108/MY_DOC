export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
export const AUTH_TOKEN_KEY = "mydoc_auth_token";

// --- Fast In-Memory Client Cache (Instant Tab Switching) ---
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const apiCache = new Map<string, CacheEntry<any>>();
const inflightRequests = new Map<string, Promise<any>>();
const DEFAULT_CACHE_TTL_MS = 120_000; // 2 minutes

export function clearApiCache(): void {
  apiCache.clear();
  inflightRequests.clear();
}

export function invalidateApiCache(...prefixes: string[]): void {
  for (const key of Array.from(apiCache.keys())) {
    if (prefixes.some((p) => key === p || key.startsWith(p))) {
      apiCache.delete(key);
    }
  }
}

async function cachedRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_CACHE_TTL_MS
): Promise<T> {
  const now = Date.now();
  const cached = apiCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.data as T;
  }

  const inflight = inflightRequests.get(key);
  if (inflight) {
    return inflight as Promise<T>;
  }

  const promise = fetcher()
    .then((data) => {
      apiCache.set(key, { data, expiresAt: Date.now() + ttlMs });
      inflightRequests.delete(key);
      return data;
    })
    .catch((err) => {
      inflightRequests.delete(key);
      throw err;
    });

  inflightRequests.set(key, promise);
  return promise;
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  clearApiCache();
  if (typeof window !== "undefined") {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
}

export function clearAuthToken(): void {
  clearApiCache();
  if (typeof window !== "undefined") {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401 && typeof window !== "undefined") {
    const isAuthEndpoint = input.includes("/auth/login") || input.includes("/auth/register");
    if (!isAuthEndpoint) {
      clearAuthToken();
      window.dispatchEvent(new Event("mydoc:unauthorized"));
    }
  }
  return res;
}

export interface AuthUser {
  id: number;
  email: string;
  full_name?: string | null;
  is_admin?: boolean;
  created_at: string;
}

export interface AdminStatsResponse {
  summary: {
    total_users: number;
    new_users_today: number;
    new_users_7d: number;
    visits_total: number;
    visits_today: number;
    visits_7d: number;
    logins_today: number;
    logins_7d: number;
    total_patients: number;
    total_documents: number;
    total_sessions: number;
    total_messages: number;
  };
  daily: {
    date: string;
    visits: number;
    logins: number;
    registrations: number;
  }[];
  users: {
    id: number;
    email: string;
    full_name?: string | null;
    is_admin: boolean;
    created_at?: string | null;
    last_login_at?: string | null;
    login_count: number;
    patients_count: number;
    documents_count: number;
    messages_count: number;
  }[];
  recent_events: {
    id: number;
    event_type: "visit" | "login" | "register" | string;
    email?: string | null;
    ip_address?: string | null;
    user_agent?: string | null;
    created_at?: string | null;
  }[];
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

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
  // Auth
  async register(data: { email: string; password: string; full_name?: string }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Ошибка регистрации");
    }
    return res.json();
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Неверный email или пароль");
    }
    return res.json();
  },

  async getMe(): Promise<AuthUser> {
    const res = await authFetch(`${API_BASE}/auth/me`);
    if (!res.ok) throw new Error("Not authenticated");
    return res.json();
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Не удалось отправить код восстановления");
    }
    return res.json();
  },

  async resetPassword(data: { email: string; code: string; new_password: string }): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Неверный или истёкший код восстановления");
    }
    return res.json();
  },

  async trackVisit(): Promise<void> {
    try {
      await fetch(`${API_BASE}/analytics/visit`, { method: "POST" });
    } catch {
      // ignore analytics errors
    }
  },

  async getAdminStats(): Promise<AdminStatsResponse> {
    const res = await authFetch(`${API_BASE}/admin/stats`);
    if (!res.ok) throw new Error("Failed to fetch admin stats");
    return res.json();
  },

  async deleteMyAccount(): Promise<void> {
    const res = await authFetch(`${API_BASE}/auth/me`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Не удалось удалить аккаунт");
    }
  },

  async adminDeleteUser(userId: number): Promise<void> {
    const res = await authFetch(`${API_BASE}/admin/users/${userId}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Не удалось удалить пользователя");
    }
  },

  // Patients
  async getPatients(): Promise<Patient[]> {
    return cachedRequest("patients", async () => {
      const res = await authFetch(`${API_BASE}/patients`);
      if (!res.ok) throw new Error("Failed to fetch patients");
      return res.json();
    });
  },

  async createPatient(data: Partial<Patient>): Promise<Patient> {
    const res = await authFetch(`${API_BASE}/patients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create patient");
    invalidateApiCache("patients");
    return res.json();
  },

  async updatePatient(id: number, data: Partial<Patient>): Promise<Patient> {
    const res = await authFetch(`${API_BASE}/patients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update patient");
    invalidateApiCache("patients", `prevent:${id}`);
    return res.json();
  },

  async deletePatient(id: number): Promise<void> {
    const res = await authFetch(`${API_BASE}/patients/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete patient");
    invalidateApiCache("patients", `folders:${id}`, `docs:${id}`, `labs:${id}`, `sessions:${id}`, `prevent:${id}`);
  },

  // Folders & Documents
  async getFolders(patientId: number): Promise<Folder[]> {
    return cachedRequest(`folders:${patientId}`, async () => {
      const res = await authFetch(`${API_BASE}/patients/${patientId}/folders`);
      if (!res.ok) throw new Error("Failed to fetch folders");
      return res.json();
    });
  },

  async getDocuments(patientId: number, folderId?: number): Promise<DocumentItem[]> {
    const cacheKey = `docs:${patientId}:${folderId ?? "all"}`;
    return cachedRequest(cacheKey, async () => {
      const url = folderId !== undefined
        ? `${API_BASE}/patients/${patientId}/documents?folder_id=${folderId}`
        : `${API_BASE}/patients/${patientId}/documents`;
      const res = await authFetch(url);
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    });
  },

  async uploadDocument(patientId: number, file: File, folderId?: number): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    if (folderId) formData.append("folder_id", folderId.toString());

    const res = await authFetch(`${API_BASE}/patients/${patientId}/documents/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to upload document");
    invalidateApiCache(`folders:${patientId}`, `docs:${patientId}`, `labs:${patientId}`, `prevent:${patientId}`);
    return res.json();
  },

  async deleteDocument(patientId: number, docId: number): Promise<void> {
    const res = await authFetch(`${API_BASE}/patients/${patientId}/documents/${docId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete document");
    invalidateApiCache(`folders:${patientId}`, `docs:${patientId}`, `docDetail:${patientId}:${docId}`, `labs:${patientId}`, `prevent:${patientId}`);
  },

  async deleteAllDocuments(patientId: number, folderId?: number): Promise<{ success: boolean; deleted_count: number }> {
    const url = folderId !== undefined
      ? `${API_BASE}/patients/${patientId}/documents?folder_id=${folderId}`
      : `${API_BASE}/patients/${patientId}/documents`;
    const res = await authFetch(url, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete all documents");
    invalidateApiCache(`folders:${patientId}`, `docs:${patientId}`, `docDetail:${patientId}:`, `labs:${patientId}`, `prevent:${patientId}`);
    return res.json();
  },

  async getDocumentDetails(patientId: number, docId: number): Promise<DocumentDetail> {
    return cachedRequest(`docDetail:${patientId}:${docId}`, async () => {
      const res = await authFetch(`${API_BASE}/patients/${patientId}/documents/${docId}`);
      if (!res.ok) throw new Error("Failed to fetch document details");
      return res.json();
    });
  },

  getDocumentFileUrl(patientId: number, docId: number): string {
    const token = getAuthToken();
    const base = `${API_BASE}/patients/${patientId}/documents/${docId}/file`;
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
  },

  // Lab Metrics
  async getLabMetrics(patientId: number, metricName?: string): Promise<LabMetric[]> {
    const cacheKey = `labs:${patientId}:${metricName ?? "all"}`;
    return cachedRequest(cacheKey, async () => {
      const url = metricName
        ? `${API_BASE}/patients/${patientId}/labs?metric_name=${encodeURIComponent(metricName)}`
        : `${API_BASE}/patients/${patientId}/labs`;
      const res = await authFetch(url);
      if (!res.ok) throw new Error("Failed to fetch lab metrics");
      return res.json();
    });
  },

  async addLabMetric(patientId: number, data: Partial<LabMetric>): Promise<LabMetric> {
    const res = await authFetch(`${API_BASE}/patients/${patientId}/labs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to add metric");
    invalidateApiCache(`labs:${patientId}`, `prevent:${patientId}`);
    return res.json();
  },

  async deleteLabMetric(patientId: number, metricId: number): Promise<void> {
    const res = await authFetch(`${API_BASE}/patients/${patientId}/labs/${metricId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete metric");
    invalidateApiCache(`labs:${patientId}`, `prevent:${patientId}`);
  },

  async reparseLabs(patientId: number): Promise<{ success: boolean; total_metrics: number }> {
    const res = await authFetch(`${API_BASE}/patients/${patientId}/reparse_labs`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to reparse lab metrics");
    invalidateApiCache(`labs:${patientId}`, `prevent:${patientId}`);
    return res.json();
  },

  // Chat
  async getChatSessions(patientId: number): Promise<ChatSession[]> {
    return cachedRequest(`sessions:${patientId}`, async () => {
      const res = await authFetch(`${API_BASE}/patients/${patientId}/chat/sessions`);
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    });
  },

  async createChatSession(patientId: number, data: { title?: string; model_id?: string; provider?: string }): Promise<ChatSession> {
    const res = await authFetch(`${API_BASE}/patients/${patientId}/chat/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create session");
    invalidateApiCache(`sessions:${patientId}`);
    return res.json();
  },

  async getChatMessages(sessionId: number): Promise<ChatMessage[]> {
    return cachedRequest(`messages:${sessionId}`, async () => {
      const res = await authFetch(`${API_BASE}/chat/sessions/${sessionId}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    });
  },

  async deleteChatSession(sessionId: number): Promise<void> {
    const res = await authFetch(`${API_BASE}/chat/sessions/${sessionId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete session");
    invalidateApiCache("sessions:", `messages:${sessionId}`);
  },

  async updateChatSession(sessionId: number, data: { model_id?: string; provider?: string; title?: string }): Promise<ChatSession> {
    const res = await authFetch(`${API_BASE}/chat/sessions/${sessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update session");
    invalidateApiCache("sessions:");
    return res.json();
  },

  // Models & Settings
  async getModels(): Promise<AIModel[]> {
    return cachedRequest("models", async () => {
      const res = await authFetch(`${API_BASE}/models`);
      if (!res.ok) throw new Error("Failed to fetch models");
      return res.json();
    }, 300_000);
  },

  async checkLocalServers(): Promise<{ lmstudio: any; ollama: any }> {
    const res = await authFetch(`${API_BASE}/settings/check-local`);
    if (!res.ok) throw new Error("Failed to check local status");
    return res.json();
  },

  async getSettings(): Promise<Record<string, string>> {
    return cachedRequest("settings", async () => {
      const res = await authFetch(`${API_BASE}/settings`);
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    });
  },

  async saveSetting(key: string, value: string): Promise<void> {
    const res = await authFetch(`${API_BASE}/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) throw new Error("Failed to save setting");
    invalidateApiCache("settings", "models");
  },

  // PREVENT Calculator
  async getPreventParams(patientId: number): Promise<PreventParamsResponse> {
    return cachedRequest(`prevent:${patientId}`, async () => {
      const res = await authFetch(`${API_BASE}/patients/${patientId}/prevent-params`);
      if (!res.ok) throw new Error("Failed to fetch PREVENT parameters");
      return res.json();
    });
  },

  async calculatePreventRisk(patientId: number, params: Partial<PreventInputs>): Promise<PreventRiskResult> {
    const res = await authFetch(`${API_BASE}/patients/${patientId}/prevent-calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error("Failed to calculate PREVENT risk");
    return res.json();
  }
};
