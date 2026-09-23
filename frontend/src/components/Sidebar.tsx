"use client";

import React from "react";
import { 
  User, 
  UserPlus, 
  MessageSquare, 
  Plus, 
  Trash2, 
  Settings, 
  Activity, 
  Bot,
  FolderOpen,
  LineChart,
  Stethoscope
} from "lucide-react";
import { Patient, ChatSession } from "@/lib/api";

interface SidebarProps {
  patients: Patient[];
  activePatient: Patient | null;
  onSelectPatient: (p: Patient) => void;
  onOpenNewPatientModal: () => void;
  chatSessions: ChatSession[];
  activeSessionId: number | null;
  onSelectSession: (id: number) => void;
  onNewChat: () => void;
  onDeleteSession: (id: number) => void;
  onOpenSettings: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isLocalOnline: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  patients,
  activePatient,
  onSelectPatient,
  onOpenNewPatientModal,
  chatSessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onOpenSettings,
  activeTab,
  onSelectTab,
  isLocalOnline
}) => {
  return (
    <aside className="w-80 flex flex-col bg-slate-900/90 border-r border-slate-800 text-slate-200 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide text-white flex items-center gap-1.5">
              MY_DOC
              <span className="text-[10px] bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded font-mono font-medium">
                AI MED
              </span>
            </h1>
            <p className="text-xs text-slate-400">Личный доктор-помощник</p>
          </div>
        </div>

        <button
          onClick={onOpenSettings}
          title="Настройки API и моделей"
          className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Patient Selector */}
      <div className="p-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Пациент / Кабинет
          </span>
          <button
            onClick={onOpenNewPatientModal}
            className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Новый
          </button>
        </div>

        {patients.length === 0 ? (
          <button
            onClick={onOpenNewPatientModal}
            className="w-full py-2.5 px-3 border border-dashed border-slate-700 hover:border-teal-500/50 rounded-xl text-xs text-slate-400 hover:text-slate-200 flex items-center justify-center gap-2 transition"
          >
            <UserPlus className="w-4 h-4 text-teal-400" />
            Создать карточку пациента
          </button>
        ) : (
          <select
            value={activePatient ? activePatient.id : ""}
            onChange={(e) => {
              const id = Number(e.target.value);
              const p = patients.find((pat) => pat.id === id);
              if (p) onSelectPatient(p);
            }}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-teal-500 transition"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} {p.age ? `(${p.age} лет)` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Navigation Tabs for Active Patient */}
      {activePatient && (
        <div className="p-2 border-b border-slate-800 grid grid-cols-2 gap-1 text-xs">
          <button
            onClick={() => onSelectTab("chat")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
              activeTab === "chat"
                ? "bg-teal-600/20 text-teal-300 border border-teal-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-teal-400" />
            ИИ-Консультант
          </button>

          <button
            onClick={() => onSelectTab("profile")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
              activeTab === "profile"
                ? "bg-teal-600/20 text-teal-300 border border-teal-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <User className="w-3.5 h-3.5 text-teal-400" />
            Медкарта
          </button>

          <button
            onClick={() => onSelectTab("folders")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
              activeTab === "folders"
                ? "bg-teal-600/20 text-teal-300 border border-teal-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5 text-teal-400" />
            Файлы и База
          </button>

          <button
            onClick={() => onSelectTab("labs")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
              activeTab === "labs"
                ? "bg-teal-600/20 text-teal-300 border border-teal-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <LineChart className="w-3.5 h-3.5 text-teal-400" />
            Динамика
          </button>
        </div>
      )}

      {/* Chat Sessions list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Диалоги с ИИ
          </span>
          {activePatient && (
            <button
              onClick={onNewChat}
              className="p-1 text-teal-400 hover:text-teal-300 hover:bg-slate-800 rounded transition"
              title="Создать новый диалог"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {!activePatient ? (
          <p className="text-xs text-slate-500 italic p-2 text-center">
            Выберите или создайте пациента
          </p>
        ) : chatSessions.length === 0 ? (
          <div className="text-center py-6 px-2">
            <MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Нет активных диалогов</p>
            <button
              onClick={onNewChat}
              className="mt-3 text-xs bg-slate-800 hover:bg-slate-700 text-teal-300 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Начать консультацию
            </button>
          </div>
        ) : (
          chatSessions.map((session) => (
            <div
              key={session.id}
              onClick={() => {
                onSelectSession(session.id);
                onSelectTab("chat");
              }}
              className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition ${
                activeSessionId === session.id
                  ? "bg-slate-800 text-teal-200 border border-slate-700"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate">
                <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${activeSessionId === session.id ? 'text-teal-400' : 'text-slate-500'}`} />
                <span className="truncate">{session.title}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-slate-500 transition"
                title="Удалить диалог"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer / Server Status */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isLocalOnline ? "bg-emerald-400 shadow-sm shadow-emerald-400" : "bg-amber-500/70"
            }`}
          />
          <span>LM Studio / Local:</span>
        </div>
        <span className={isLocalOnline ? "text-emerald-400 font-medium" : "text-amber-400"}>
          {isLocalOnline ? "Онлайн" : "Офлайн / Демо"}
        </span>
      </div>
    </aside>
  );
};
