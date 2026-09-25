"use client";

import React, { useState } from "react";
import { 
  User, 
  UserPlus, 
  MessageSquare, 
  Plus, 
  Trash2, 
  Settings, 
  Bot,
  FolderOpen,
  LineChart,
  Stethoscope,
  HeartPulse,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { Patient, ChatSession } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";

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
  onDeletePatient?: (p: Patient) => void;
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
  isLocalOnline,
  onDeletePatient
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { language, t } = useLanguage();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("mydoc_sidebar_collapsed") === "true";
    }
    return false;
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("mydoc_sidebar_collapsed", String(next));
      }
      return next;
    });
  };

  return (
    <aside
      className={`shrink-0 flex flex-col bg-white dark:bg-zinc-900/95 border-r border-zinc-200 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-200 select-none transition-all duration-300 ease-in-out relative ${
        isCollapsed ? "w-[68px]" : "w-[390px]"
      }`}
    >
      {isCollapsed ? (
        /* COLLAPSED MODE: Thin icon-only strip */
        <div className="flex flex-col h-full w-full justify-between items-center overflow-x-hidden">
          {/* Top Actions */}
          <div className="w-full flex flex-col items-center">
            {/* Logo / Expand Toggle */}
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800/80 flex flex-col items-center gap-2 w-full">
              <button
                onClick={toggleCollapse}
                title={t.sidebar.expand}
                className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-250 dark:border-zinc-700/80 flex items-center justify-center shadow-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition group"
              >
                <Stethoscope className="w-5 h-5 text-zinc-800 dark:text-zinc-100 group-hover:scale-105 transition-transform" />
              </button>
              <button
                onClick={toggleCollapse}
                title={t.sidebar.expand}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg transition"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </div>

            {/* Patient Avatar / Icon */}
            <div className="p-2 border-b border-zinc-200 dark:border-zinc-800/80 flex flex-col items-center gap-1.5 w-full">
              {activePatient ? (
                <button
                  onClick={() => onSelectTab("profile")}
                  title={`${t.sidebar.tabs.profile}: ${activePatient.full_name} (${activePatient.age ? `${activePatient.age} ${t.common.yearsOld}` : ""})`}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs transition border shadow-sm ${
                    activeTab === "profile"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-zinc-900 dark:border-zinc-100"
                      : "bg-zinc-100 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-200 border-zinc-250 dark:border-zinc-700/80 hover:border-zinc-400"
                  }`}
                >
                  {activePatient.full_name
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase() || <User className="w-4 h-4" />}
                </button>
              ) : (
                <button
                  onClick={onOpenNewPatientModal}
                  title={t.sidebar.newPatient}
                  className="w-10 h-10 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Navigation Tabs (Icons only) */}
            {activePatient && (
              <div className="p-2 border-b border-zinc-200 dark:border-zinc-800/80 flex flex-col items-center gap-1.5 w-full">
                {/* Chat */}
                <button
                  onClick={() => onSelectTab("chat")}
                  title={t.sidebar.tabs.chat}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                    activeTab === "chat"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  <Bot className="w-5 h-5" />
                </button>

                {/* Profile */}
                <button
                  onClick={() => onSelectTab("profile")}
                  title={t.sidebar.tabs.profile}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                    activeTab === "profile"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  <User className="w-5 h-5" />
                </button>

                {/* Folders */}
                <button
                  onClick={() => onSelectTab("folders")}
                  title={t.sidebar.tabs.folders}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                    activeTab === "folders"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  <FolderOpen className="w-5 h-5" />
                </button>

                {/* Labs */}
                <button
                  onClick={() => onSelectTab("labs")}
                  title={t.sidebar.tabs.labs}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                    activeTab === "labs"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  <LineChart className="w-5 h-5" />
                </button>

                {/* PREVENT Risk */}
                <button
                  onClick={() => onSelectTab("prevent")}
                  title={`${t.sidebar.tabs.prevent} (${language === "ru" ? "AHA 10-лет" : "AHA 10-YR"})`}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                    activeTab === "prevent"
                      ? "bg-rose-500 text-white shadow-md shadow-rose-500/30"
                      : "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  }`}
                >
                  <HeartPulse className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Chat Sessions list (Icons only) */}
            <div className="flex-1 overflow-y-auto p-2 flex flex-col items-center gap-1.5 w-full max-h-[35vh]">
              {activePatient && (
                <button
                  onClick={onNewChat}
                  title={t.sidebar.newChat}
                  className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 border border-zinc-250 dark:border-zinc-700/80 flex items-center justify-center transition shadow-sm mb-1"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}

              {chatSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session.id);
                    onSelectTab("chat");
                  }}
                  title={session.title}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition relative ${
                    activeSessionId === session.id
                      ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold border border-zinc-300 dark:border-zinc-700"
                      : "text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-850"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  {activeSessionId === session.id && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-zinc-900" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Actions: Server Status, Theme, Settings */}
          <div className="p-2.5 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950/60 flex flex-col items-center gap-2 w-full">
            <div
              title={`LM Studio / Local: ${isLocalOnline ? t.settings.online : t.settings.offline}`}
              className="p-1 flex items-center justify-center cursor-pointer"
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isLocalOnline ? "bg-emerald-500 shadow-sm shadow-emerald-400/50" : "bg-zinc-400 dark:bg-zinc-600"
                }`}
              />
            </div>

            <button
              onClick={toggleTheme}
              title={resolvedTheme === "dark" ? t.sidebar.themeLight : t.sidebar.themeDark}
              className="p-2 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg transition"
            >
              {resolvedTheme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
            </button>

            <button
              onClick={onOpenSettings}
              title={t.sidebar.settings}
              className="p-2 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg transition"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* EXPANDED MODE: Full sidebar */
        <div className="flex flex-col h-full w-full">
          {/* Brand Header */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-250 dark:border-zinc-700/80 flex items-center justify-center shadow-sm">
                <Stethoscope className="w-5 h-5 text-zinc-800 dark:text-zinc-100" />
              </div>
              <div>
                <h1 className="font-bold text-base tracking-wide text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  MY_DOC
                  <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 px-1.5 py-0.5 rounded font-mono font-medium">
                    AI MED
                  </span>
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.sidebar.brandTagline}</p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                title={resolvedTheme === "dark" ? t.sidebar.themeLight : t.sidebar.themeDark}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg transition"
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-zinc-700" />
                )}
              </button>

              <button
                onClick={onOpenSettings}
                title={t.sidebar.settings}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg transition"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Collapse Toggle Button */}
              <button
                onClick={toggleCollapse}
                title={t.sidebar.collapse}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg transition"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Patient Selector */}
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {t.sidebar.patientCabinet}
              </span>
              <button
                onClick={onOpenNewPatientModal}
                className="text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 font-medium transition"
              >
                <UserPlus className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-300" />
                {t.sidebar.newPatient}
              </button>
            </div>

            {patients.length === 0 ? (
              <button
                onClick={onOpenNewPatientModal}
                className="w-full py-2.5 px-3 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 rounded-xl text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 flex items-center justify-center gap-2 transition"
              >
                <UserPlus className="w-4 h-4 text-zinc-400" />
                {t.sidebar.noPatients}
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <select
                  value={activePatient ? activePatient.id : ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    const p = patients.find((pat) => pat.id === id);
                    if (p) onSelectPatient(p);
                  }}
                  className="flex-1 min-w-0 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} {p.age ? `(${p.age} ${t.common.yearsOld})` : ""}
                    </option>
                  ))}
                </select>
                {onDeletePatient && activePatient && (
                  <button
                    onClick={() => onDeletePatient(activePatient)}
                    title={`${t.sidebar.deletePatient} ${activePatient.full_name}`}
                    className="p-2 rounded-xl bg-zinc-100 hover:bg-rose-50 dark:bg-zinc-800 dark:hover:bg-rose-950/40 text-zinc-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400 border border-zinc-200 dark:border-zinc-700/80 transition shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Navigation Tabs for Active Patient */}
          {activePatient && (
            <div className="p-2 border-b border-zinc-200 dark:border-zinc-800/80 grid grid-cols-2 gap-1.5 text-xs">
              <button
                onClick={() => onSelectTab("chat")}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                  activeTab === "chat"
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50"
                }`}
              >
                <Bot className="w-3.5 h-3.5 shrink-0 text-zinc-600 dark:text-zinc-300" />
                <span className="truncate">{t.sidebar.tabs.chat}</span>
              </button>

              <button
                onClick={() => onSelectTab("profile")}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                  activeTab === "profile"
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50"
                }`}
              >
                <User className="w-3.5 h-3.5 shrink-0 text-zinc-600 dark:text-zinc-300" />
                <span className="truncate">{t.sidebar.tabs.profile}</span>
              </button>

              <button
                onClick={() => onSelectTab("folders")}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                  activeTab === "folders"
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50"
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5 shrink-0 text-zinc-600 dark:text-zinc-300" />
                <span className="truncate">{t.sidebar.tabs.folders}</span>
              </button>

              <button
                onClick={() => onSelectTab("labs")}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                  activeTab === "labs"
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50"
                }`}
              >
                <LineChart className="w-3.5 h-3.5 shrink-0 text-zinc-600 dark:text-zinc-300" />
                <span className="truncate">{t.sidebar.tabs.labs}</span>
              </button>

              <button
                onClick={() => onSelectTab("prevent")}
                className={`col-span-2 flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                  activeTab === "prevent"
                    ? "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800/70 shadow-sm"
                    : "text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 border border-zinc-250 dark:border-zinc-800/70"
                }`}
              >
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-3.5 h-3.5 shrink-0 text-rose-500 dark:text-rose-400" />
                  <span>{t.sidebar.tabs.prevent}</span>
                </div>
                <span className="text-[10px] font-mono uppercase bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800/50">
                  {language === "ru" ? "AHA 10-лет" : "AHA 10-YR"}
                </span>
              </button>
            </div>
          )}

          {/* Chat Sessions list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {t.sidebar.consultations}
              </span>
              {activePatient && (
                <button
                  onClick={onNewChat}
                  className="p-1 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition"
                  title={t.sidebar.newChat}
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {!activePatient ? (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 italic p-2 text-center">
                {t.sidebar.noPatients}
              </p>
            ) : chatSessions.length === 0 ? (
              <div className="text-center py-6 px-2">
                <MessageSquare className="w-8 h-8 text-zinc-400 dark:text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {language === "ru" ? "Нет активных диалогов" : "No active consultations"}
                </p>
                <button
                  onClick={onNewChat}
                  className="mt-3 text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 border border-zinc-300 dark:border-zinc-700 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> {t.sidebar.newChat}
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
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 font-medium"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40 hover:text-zinc-900 dark:hover:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${activeSessionId === session.id ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-500'}`} />
                    <span className="truncate">{session.title}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 dark:hover:text-red-400 text-zinc-400 dark:text-zinc-500 transition"
                    title={t.sidebar.deleteChat}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer / Server Status */}
          <div className="p-3 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isLocalOnline ? "bg-emerald-500 dark:bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-zinc-400 dark:bg-zinc-600"
                }`}
              />
              <span>LM Studio / Local:</span>
            </div>
            <span className={isLocalOnline ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-zinc-500 dark:text-zinc-400"}>
              {isLocalOnline ? t.settings.online : t.settings.offline}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};
