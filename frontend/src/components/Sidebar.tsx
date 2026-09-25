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
  Stethoscope,
  HeartPulse
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
    <aside className="w-80 flex flex-col bg-zinc-900/95 border-r border-zinc-800/80 text-zinc-200 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center shadow-md">
            <Stethoscope className="w-5 h-5 text-zinc-100" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide text-zinc-100 flex items-center gap-1.5">
              MY_DOC
              <span className="text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700 px-1.5 py-0.5 rounded font-mono font-medium">
                AI MED
              </span>
            </h1>
            <p className="text-xs text-zinc-400">Личный доктор-помощник</p>
          </div>
        </div>

        <button
          onClick={onOpenSettings}
          title="Настройки API и моделей"
          className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Patient Selector */}
      <div className="p-3 border-b border-zinc-800/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Пациент / Кабинет
          </span>
          <button
            onClick={onOpenNewPatientModal}
            className="text-xs text-zinc-300 hover:text-white flex items-center gap-1 font-medium transition"
          >
            <UserPlus className="w-3.5 h-3.5 text-zinc-300" />
            Новый
          </button>
        </div>

        {patients.length === 0 ? (
          <button
            onClick={onOpenNewPatientModal}
            className="w-full py-2.5 px-3 border border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 flex items-center justify-center gap-2 transition"
          >
            <UserPlus className="w-4 h-4 text-zinc-400" />
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
            className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-zinc-500 transition"
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
        <div className="p-2 border-b border-zinc-800/80 grid grid-cols-2 gap-1 text-xs">
          <button
            onClick={() => onSelectTab("chat")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
              activeTab === "chat"
                ? "bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-zinc-300" />
            ИИ-Консультант
          </button>

          <button
            onClick={() => onSelectTab("profile")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
              activeTab === "profile"
                ? "bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <User className="w-3.5 h-3.5 text-zinc-300" />
            Медкарта
          </button>

          <button
            onClick={() => onSelectTab("folders")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
              activeTab === "folders"
                ? "bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5 text-zinc-300" />
            Файлы и База
          </button>

          <button
            onClick={() => onSelectTab("labs")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
              activeTab === "labs"
                ? "bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <LineChart className="w-3.5 h-3.5 text-zinc-300" />
            Динамика
          </button>

          <button
            onClick={() => onSelectTab("prevent")}
            className={`col-span-2 flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
              activeTab === "prevent"
                ? "bg-rose-950/40 text-rose-200 border border-rose-800/70 shadow-sm"
                : "text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/50 border border-zinc-800/70"
            }`}
          >
            <div className="flex items-center gap-2">
              <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
              <span>Риск PREVENT™</span>
            </div>
            <span className="text-[10px] font-mono uppercase bg-rose-900/40 text-rose-300 px-1.5 py-0.5 rounded border border-rose-800/50">
              AHA 10-лет
            </span>
          </button>
        </div>
      )}

      {/* Chat Sessions list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Диалоги с ИИ
          </span>
          {activePatient && (
            <button
              onClick={onNewChat}
              className="p-1 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded transition"
              title="Создать новый диалог"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {!activePatient ? (
          <p className="text-xs text-zinc-500 italic p-2 text-center">
            Выберите или создайте пациента
          </p>
        ) : chatSessions.length === 0 ? (
          <div className="text-center py-6 px-2">
            <MessageSquare className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-xs text-zinc-400">Нет активных диалогов</p>
            <button
              onClick={onNewChat}
              className="mt-3 text-xs bg-zinc-800 hover:bg-zinc-750 text-zinc-200 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 border border-zinc-700 transition"
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
                  ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                  : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate">
                <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${activeSessionId === session.id ? 'text-zinc-200' : 'text-zinc-500'}`} />
                <span className="truncate">{session.title}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-zinc-500 transition"
                title="Удалить диалог"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer / Server Status */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between text-[11px] text-zinc-400">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isLocalOnline ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-zinc-600"
            }`}
          />
          <span>LM Studio / Local:</span>
        </div>
        <span className={isLocalOnline ? "text-emerald-400 font-medium" : "text-zinc-400"}>
          {isLocalOnline ? "Онлайн" : "Офлайн / Демо"}
        </span>
      </div>
    </aside>
  );
};
