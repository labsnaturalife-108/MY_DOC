"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Users,
  Eye,
  LogIn,
  Activity,
  RefreshCw,
  Shield,
  Loader2,
  UserPlus,
  Clock,
  Globe,
  FileText,
  MessageSquare
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import { AdminStatsResponse, api } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";

interface AdminMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatDateTime(iso?: string | null, isRu: boolean = true): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
    return d.toLocaleString(isRu ? "ru-RU" : "en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function shortAgent(ua?: string | null): string {
  if (!ua) return "—";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("Mac OS")) return "macOS";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Linux")) return "Linux";
  return ua.slice(0, 24);
}

export const AdminMonitorModal: React.FC<AdminMonitorModalProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const isRu = language === "ru";

  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"users" | "events">("users");

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminStats();
      setStats(data);
    } catch (err: any) {
      setError(err?.message || "Ошибка загрузки статистики");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const s = stats?.summary;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[90vh] bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                {isRu ? "Монитор владельца MY_DOC" : "MY_DOC Owner Monitor"}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isRu
                  ? "Статистика визитов, регистраций и активности пользователей"
                  : "Visits, registrations and user activity analytics"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadStats}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-200/80 dark:bg-zinc-800 hover:bg-zinc-300/80 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>{isRu ? "Обновить" : "Refresh"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && !stats ? (
            <div className="py-20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm">
              {error}
            </div>
          ) : stats && s ? (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                    <span>{isRu ? "Пользователи" : "Users"}</span>
                    <Users className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">{s.total_users}</div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                    +{s.new_users_today} {isRu ? "сегодня" : "today"} · +{s.new_users_7d} {isRu ? "за 7 дн." : "7d"}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                    <span>{isRu ? "Визиты на сайт" : "Site Visits"}</span>
                    <Eye className="w-4 h-4 text-cyan-500" />
                  </div>
                  <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">{s.visits_total}</div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                    {s.visits_today} {isRu ? "сегодня" : "today"} · {s.visits_7d} {isRu ? "за 7 дн." : "7d"}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                    <span>{isRu ? "Авторизации (входы)" : "Logins"}</span>
                    <LogIn className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">{s.logins_7d}</div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                    {s.logins_today} {isRu ? "сегодня" : "today"} · {isRu ? "за 7 дней" : "last 7 days"}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                    <span>{isRu ? "Использование" : "Usage"}</span>
                    <Activity className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">{s.total_patients}</div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                    {isRu ? "пациентов" : "patients"} · {s.total_documents} {isRu ? "док." : "docs"} · {s.total_messages} {isRu ? "сообщ." : "msgs"}
                  </div>
                </div>
              </div>

              {/* 14-day Activity Chart */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-3">
                  {isRu ? "Активность за последние 14 дней" : "Activity over the last 14 days"}
                </h3>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.daily} margin={{ top: 5, right: 12, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(161,161,170,0.2)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "#71717a" }}
                        tickFormatter={(v) => String(v).slice(5)}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#71717a" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#18181b",
                          borderColor: "#3f3f46",
                          borderRadius: "10px",
                          fontSize: "12px",
                          color: "#f4f4f5",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Bar dataKey="visits" name={isRu ? "Визиты" : "Visits"} fill="#06b6d4" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="logins" name={isRu ? "Входы" : "Logins"} fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="registrations" name={isRu ? "Регистрации" : "Sign ups"} fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <button
                  onClick={() => setTab("users")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                    tab === "users"
                      ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{isRu ? `Зарегистрированные (${stats.users.length})` : `Registered Users (${stats.users.length})`}</span>
                </button>
                <button
                  onClick={() => setTab("events")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                    tab === "events"
                      ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{isRu ? `Журнал событий (${stats.recent_events.length})` : `Activity Log (${stats.recent_events.length})`}</span>
                </button>
              </div>

              {/* Users Table */}
              {tab === "users" ? (
                <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 font-semibold">
                      <tr>
                        <th className="px-4 py-2.5">Email / {isRu ? "Имя" : "Name"}</th>
                        <th className="px-4 py-2.5">{isRu ? "Регистрация" : "Registered"}</th>
                        <th className="px-4 py-2.5">{isRu ? "Последний вход" : "Last Login"}</th>
                        <th className="px-4 py-2.5 text-center">{isRu ? "Входов" : "Logins"}</th>
                        <th className="px-4 py-2.5 text-center">{isRu ? "Пациенты / Док. / Чат" : "Patients / Docs / Msgs"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
                      {stats.users.map((u) => (
                        <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{u.email}</span>
                              {u.is_admin && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            {u.full_name && (
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{u.full_name}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                            {formatDateTime(u.created_at, isRu)}
                          </td>
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                            {formatDateTime(u.last_login_at, isRu)}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-zinc-800 dark:text-zinc-200">
                            {u.login_count}
                          </td>
                          <td className="px-4 py-3 text-center text-zinc-600 dark:text-zinc-300">
                            <span className="inline-flex items-center gap-2">
                              <span title={isRu ? "Пациенты" : "Patients"}>{u.patients_count}</span>
                              <span className="text-zinc-400">/</span>
                              <span className="inline-flex items-center gap-0.5" title={isRu ? "Документы" : "Documents"}>
                                <FileText className="w-3 h-3 text-amber-500" />
                                {u.documents_count}
                              </span>
                              <span className="text-zinc-400">/</span>
                              <span className="inline-flex items-center gap-0.5" title={isRu ? "Сообщения" : "Messages"}>
                                <MessageSquare className="w-3 h-3 text-emerald-500" />
                                {u.messages_count}
                              </span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Events Feed */
                <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 font-semibold">
                      <tr>
                        <th className="px-4 py-2.5">{isRu ? "Время" : "Time"}</th>
                        <th className="px-4 py-2.5">{isRu ? "Событие" : "Event"}</th>
                        <th className="px-4 py-2.5">{isRu ? "Пользователь" : "User"}</th>
                        <th className="px-4 py-2.5">IP / {isRu ? "Устройство" : "Device"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
                      {stats.recent_events.map((ev) => (
                        <tr key={ev.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                          <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                            {formatDateTime(ev.created_at, isRu)}
                          </td>
                          <td className="px-4 py-2.5">
                            {ev.event_type === "register" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold">
                                <UserPlus className="w-3 h-3" />
                                {isRu ? "Регистрация" : "Register"}
                              </span>
                            ) : ev.event_type === "login" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                                <LogIn className="w-3 h-3" />
                                {isRu ? "Вход" : "Login"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-semibold">
                                <Globe className="w-3 h-3" />
                                {isRu ? "Визит" : "Visit"}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                            {ev.email || (isRu ? "Гость (не вошёл)" : "Guest")}
                          </td>
                          <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
                            {ev.ip_address || "—"} · {shortAgent(ev.user_agent)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
