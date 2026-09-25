"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { PatientCard } from "@/components/PatientCard";
import { DocumentFolders } from "@/components/DocumentFolders";
import { LabCharts } from "@/components/LabCharts";
import { ChatView } from "@/components/ChatView";
import { PreventCalculatorView } from "@/components/PreventCalculatorView";
import { SettingsModal } from "@/components/SettingsModal";
import { Patient, ChatSession, api } from "@/lib/api";
import { UserPlus, X, Sparkles, Loader2, Trash2, AlertTriangle } from "lucide-react";

export default function Home() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("chat"); // chat, profile, folders, labs, prevent
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeletingPatient, setIsDeletingPatient] = useState(false);
  const [isLocalOnline, setIsLocalOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prefillChatQuery, setPrefillChatQuery] = useState<string>("");

  // New patient modal state
  const [newPatientData, setNewPatientData] = useState<Partial<Patient>>({
    full_name: "",
    age: undefined,
    gender: "male",
    height: undefined,
    weight: undefined,
    blood_type: "",
    allergies: "",
    chronic_diseases: "",
    current_medications: "",
    notes: ""
  });

  const checkLocalStatus = async () => {
    try {
      const res = await api.checkLocalServers();
      setIsLocalOnline(res.lmstudio?.online || res.ollama?.online || false);
    } catch {
      setIsLocalOnline(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const patList = await api.getPatients();
      setPatients(patList);

      let currentP = activePatient;
      if (!currentP && patList.length > 0) {
        currentP = patList[0];
        setActivePatient(currentP);
      }

      if (currentP) {
        await loadSessionsForPatient(currentP.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionsForPatient = async (patientId: number) => {
    try {
      const sessions = await api.getChatSessions(patientId);
      setChatSessions(sessions);
      if (sessions.length > 0) {
        setActiveSessionId(sessions[0].id);
      } else {
        // Automatically create a default session for seamless start
        const newSession = await api.createChatSession(patientId, {
          title: "Первичная консультация",
          model_id: isLocalOnline ? "lmstudio-auto" : "demo-doctor",
          provider: isLocalOnline ? "lmstudio" : "demo"
        });
        setChatSessions([newSession]);
        setActiveSessionId(newSession.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    checkLocalStatus();
    const interval = setInterval(checkLocalStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectPatient = async (p: Patient) => {
    setActivePatient(p);
    await loadSessionsForPatient(p.id);
  };

  const handleCreateNewChat = async () => {
    if (!activePatient) return;
    try {
      const newSession = await api.createChatSession(activePatient.id, {
        title: "Консультация " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model_id: isLocalOnline ? "lmstudio-auto" : "demo-doctor",
        provider: isLocalOnline ? "lmstudio" : "demo"
      });
      setChatSessions([newSession, ...chatSessions]);
      setActiveSessionId(newSession.id);
      setActiveTab("chat");
    } catch (err) {
      alert("Ошибка создания диалога: " + err);
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (!confirm("Удалить этот диалог?")) return;
    try {
      await api.deleteChatSession(sessionId);
      const remaining = chatSessions.filter((s) => s.id !== sessionId);
      setChatSessions(remaining);
      if (activeSessionId === sessionId) {
        setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      alert("Ошибка удаления диалога: " + err);
    }
  };

  const handleCreatePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientData.full_name) return;
    try {
      const created = await api.createPatient(newPatientData);
      setPatients([created, ...patients]);
      setActivePatient(created);
      setIsNewPatientModalOpen(false);
      setNewPatientData({ full_name: "", gender: "male" });
      await loadSessionsForPatient(created.id);
      setActiveTab("profile");
    } catch (err) {
      alert("Ошибка создания пациента: " + err);
    }
  };

  const handleConfirmDeletePatient = async () => {
    if (!patientToDelete) return;
    setIsDeletingPatient(true);
    try {
      await api.deletePatient(patientToDelete.id);
      const remaining = patients.filter((p) => p.id !== patientToDelete.id);
      setPatients(remaining);

      if (activePatient?.id === patientToDelete.id) {
        if (remaining.length > 0) {
          setActivePatient(remaining[0]);
          await loadSessionsForPatient(remaining[0].id);
        } else {
          setActivePatient(null);
          setChatSessions([]);
          setActiveSessionId(null);
        }
      }
      setPatientToDelete(null);
    } catch (err) {
      alert("Ошибка удаления пациента: " + err);
    } finally {
      setIsDeletingPatient(false);
    }
  };

  const activeSession = chatSessions.find((s) => s.id === activeSessionId) || null;

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden transition-colors duration-150">
      {/* Left Sidebar */}
      <Sidebar
        patients={patients}
        activePatient={activePatient}
        onSelectPatient={handleSelectPatient}
        onOpenNewPatientModal={() => setIsNewPatientModalOpen(true)}
        chatSessions={chatSessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewChat={handleCreateNewChat}
        onDeleteSession={handleDeleteSession}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isLocalOnline={isLocalOnline}
        onDeletePatient={(p) => setPatientToDelete(p)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50 dark:bg-zinc-950 relative">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
          </div>
        ) : !activePatient ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 mb-4 shadow-xl">
              <Sparkles className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Добро пожаловать в MY_DOC</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mb-6">
              Интеллектуальный медицинский ассистент и электронный кабинет здоровья. Для начала
              работы создайте профиль пациента.
            </p>
            <button
              onClick={() => setIsNewPatientModalOpen(true)}
              className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-semibold rounded-2xl flex items-center gap-2 shadow-lg transition"
            >
              <UserPlus className="w-5 h-5" />
              Создать карточку пациента
            </button>
          </div>
        ) : (
          <div className={activeTab === "chat" ? "flex-1 flex h-full overflow-hidden" : "flex-1 p-6 overflow-y-auto"}>
            {activeTab === "chat" && activeSession && (
              <ChatView
                patient={activePatient}
                session={activeSession}
                onOpenSettings={() => setIsSettingsOpen(true)}
                isLocalOnline={isLocalOnline}
                prefillQuery={prefillChatQuery}
                onClearPrefill={() => setPrefillChatQuery("")}
              />
            )}

            {activeTab === "profile" && (
              <PatientCard
                patient={activePatient}
                onUpdate={(updated) => {
                  setActivePatient(updated);
                  setPatients(patients.map((p) => (p.id === updated.id ? updated : p)));
                }}
                onDelete={() => setPatientToDelete(activePatient)}
              />
            )}

            {activeTab === "folders" && (
              <DocumentFolders
                patient={activePatient}
                onRefreshLabs={() => {}}
                onNavigateToChat={(query) => {
                  if (query) {
                    setPrefillChatQuery(query);
                  }
                  setActiveTab("chat");
                }}
              />
            )}

            {activeTab === "labs" && (
              <LabCharts patient={activePatient} />
            )}

            {activeTab === "prevent" && (
              <PreventCalculatorView
                patient={activePatient}
                onNavigateToChat={(query) => {
                  if (query) {
                    setPrefillChatQuery(query);
                  }
                  setActiveTab("chat");
                }}
              />
            )}
          </div>
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onRefreshStatus={checkLocalStatus}
      />

      {/* New Patient Modal */}
      {isNewPatientModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                Новая карточка пациента
              </h3>
              <button
                onClick={() => setIsNewPatientModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePatientSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">ФИО пациента</label>
                <input
                  type="text"
                  placeholder="Иванов Иван Иванович"
                  value={newPatientData.full_name || ""}
                  onChange={(e) => setNewPatientData({ ...newPatientData, full_name: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Возраст (лет)</label>
                  <input
                    type="number"
                    placeholder="35"
                    value={newPatientData.age || ""}
                    onChange={(e) => setNewPatientData({ ...newPatientData, age: Number(e.target.value) || undefined })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Пол</label>
                  <select
                    value={newPatientData.gender || "male"}
                    onChange={(e) => setNewPatientData({ ...newPatientData, gender: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-500 outline-none"
                  >
                    <option value="male">Мужской</option>
                    <option value="female">Женский</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Рост (см)</label>
                  <input
                    type="number"
                    placeholder="178"
                    value={newPatientData.height || ""}
                    onChange={(e) => setNewPatientData({ ...newPatientData, height: Number(e.target.value) || undefined })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Вес (кг)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="75.5"
                    value={newPatientData.weight || ""}
                    onChange={(e) => setNewPatientData({ ...newPatientData, weight: Number(e.target.value) || undefined })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-700 dark:text-zinc-300 mb-1 block font-medium">
                  Аллергии и непереносимости
                </label>
                <input
                  type="text"
                  placeholder="напр. Пенициллин, цитрусовые, пыльца..."
                  value={newPatientData.allergies || ""}
                  onChange={(e) => setNewPatientData({ ...newPatientData, allergies: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewPatientModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-zinc-900 hover:bg-zinc-850 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-xl text-xs font-semibold shadow transition"
                >
                  Создать кабинет
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient Delete Confirmation Modal */}
      {patientToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Удаление профиля пациента
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Это действие необратимо
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 rounded-2xl space-y-2 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
              <p>
                Вы действительно хотите удалить пациента <strong className="text-zinc-900 dark:text-white font-semibold">{patientToDelete.full_name}</strong>?
              </p>
              <div className="pt-1 text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1">
                <p className="font-semibold text-rose-700 dark:text-rose-400">Будут безвозвратно удалены:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Все загруженные документы и бланки анализов</li>
                  <li>Извлеченные биомаркеры и динамика показателей</li>
                  <li>Векторные эмбеддинги базы знаний ChromaDB</li>
                  <li>Все сессии диалогов и консультаций с ИИ</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingPatient}
                onClick={() => setPatientToDelete(null)}
                className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-medium transition disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={isDeletingPatient}
                onClick={handleConfirmDeletePatient}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
              >
                {isDeletingPatient ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Удаление...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Удалить пациента</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
