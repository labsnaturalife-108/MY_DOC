"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  LineChart as LineChartIcon, 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  X,
  RefreshCw,
  Activity,
  Heart,
  Droplet,
  FlaskConical,
  Dna,
  ShieldAlert,
  Info
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine 
} from "recharts";
import { Patient, LabMetric, api } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";

interface LabChartsProps {
  patient: Patient;
}

interface PanelConfig {
  id: string;
  name: string;
  shortName: string;
  icon: React.ComponentType<{ className?: string }>;
  goal: string;
  description: string;
  matchPatterns: string[];
}

export const LabCharts: React.FC<LabChartsProps> = ({ patient }) => {
  const { resolvedTheme } = useTheme();
  const { language, t } = useLanguage();
  const isDark = resolvedTheme === "dark";

  const [metrics, setMetrics] = useState<LabMetric[]>([]);
  const [activePanelId, setActivePanelId] = useState<string>("cbc");
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [reparsing, setReparsing] = useState(false);
  const [reparseMessage, setReparseMessage] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMetric, setNewMetric] = useState<Partial<LabMetric>>({
    metric_name: "Гемоглобин (Hb)",
    value: 150,
    unit: "г/л",
    reference_min: 130,
    reference_max: 175,
    record_date: new Date().toISOString().split("T")[0],
    notes: ""
  });

  const panels: PanelConfig[] = useMemo(() => [
    {
      id: "all",
      name: t.labs.panels.all.name,
      shortName: t.labs.panels.all.shortName,
      icon: Activity,
      goal: t.labs.panels.all.goal,
      description: t.labs.panels.all.description,
      matchPatterns: [],
    },
    {
      id: "cbc",
      name: t.labs.panels.cbc.name,
      shortName: t.labs.panels.cbc.shortName,
      icon: Droplet,
      goal: t.labs.panels.cbc.goal,
      description: t.labs.panels.cbc.description,
      matchPatterns: [
        "Гемоглобин", "Эритроциты", "Лейкоциты", "Тромбоциты", "Гематокрит", "СОЭ",
        "MCV", "MCH", "MCHC", "RDW",
        "Hemoglobin", "RBC", "WBC", "Platelet", "Hematocrit", "ESR"
      ],
    },
    {
      id: "cmp",
      name: t.labs.panels.cmp.name,
      shortName: t.labs.panels.cmp.shortName,
      icon: FlaskConical,
      goal: t.labs.panels.cmp.goal,
      description: t.labs.panels.cmp.description,
      matchPatterns: [
        "Глюкоза", "Креатинин", "Мочевина", "eGFR", "АЛТ", "АСТ", 
        "Щелочная фосфатаза", "билирубин", "Общий белок", "Альбумин", 
        "Натрий", "Калий", "Хлориды", "Кальций", "Мочевая кислота",
        "Glucose", "Creatinine", "BUN", "ALT", "AST", "ALP", "Bilirubin", 
        "Protein", "Albumin", "Sodium", "Potassium", "Chloride", "Calcium", "Uric"
      ],
    },
    {
      id: "lipid",
      name: t.labs.panels.lipid.name,
      shortName: t.labs.panels.lipid.shortName,
      icon: Heart,
      goal: t.labs.panels.lipid.goal,
      description: t.labs.panels.lipid.description,
      matchPatterns: [
        "холестерин", "ЛПНП", "ЛПВП", "Триглицериды", "Липопротеин",
        "Cholesterol", "LDL", "HDL", "Triglyceride", "Lipoprotein"
      ],
    },
    {
      id: "diabetes",
      name: t.labs.panels.diabetes.name,
      shortName: t.labs.panels.diabetes.shortName,
      icon: Activity,
      goal: t.labs.panels.diabetes.goal,
      description: t.labs.panels.diabetes.description,
      matchPatterns: ["Гликированный", "HbA1c", "Глюкоза", "Glycated", "A1c", "Glucose"],
    },
    {
      id: "urinalysis",
      name: t.labs.panels.urinalysis.name,
      shortName: t.labs.panels.urinalysis.shortName,
      icon: Dna,
      goal: t.labs.panels.urinalysis.goal,
      description: t.labs.panels.urinalysis.description,
      matchPatterns: [
        "мочи", "Относительная плотность", "Белок в моче", "pH",
        "Urine", "Specific Gravity", "Urinalysis"
      ],
    },
    {
      id: "other",
      name: t.labs.panels.other.name,
      shortName: t.labs.panels.other.shortName,
      icon: ShieldAlert,
      goal: t.labs.panels.other.goal,
      description: t.labs.panels.other.description,
      matchPatterns: [
        "Ферритин", "Витамин", "СРБ", "Мочевая кислота", "ТТГ", "Т4", "ПСА", "PSA",
        "Ferritin", "Vitamin", "CRP", "Uric", "TSH", "FT4"
      ],
    },
  ], [t]);

  const loadMetrics = async (keepSelection = true) => {
    try {
      setLoading(true);
      const data = await api.getLabMetrics(patient.id);
      setMetrics(data);
      if (!keepSelection || !selectedMetric) {
        if (data.length > 0) {
          setSelectedMetric(data[0].metric_name);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics(false);
  }, [patient.id]);

  const handleReparse = async () => {
    try {
      setReparsing(true);
      setReparseMessage(null);
      const res = await api.reparseLabs(patient.id);
      await loadMetrics(false);
      const msg = t.labs.rescanSuccess.replace("{count}", String(res.total_metrics));
      setReparseMessage(msg);
      setTimeout(() => setReparseMessage(null), 5000);
    } catch (err: any) {
      alert((language === "ru" ? "Ошибка при пересканировании: " : "Error rescanning documents: ") + (err.message || err));
    } finally {
      setReparsing(false);
    }
  };

  // Group metrics by panel
  const activePanel = panels.find((p) => p.id === activePanelId) || panels[0];

  const panelMetrics = useMemo(() => {
    if (activePanel.id === "all") {
      return metrics;
    }
    return metrics.filter((m) =>
      activePanel.matchPatterns.some((pattern) =>
        m.metric_name.toLowerCase().includes(pattern.toLowerCase())
      )
    );
  }, [metrics, activePanel]);

  // Unique metric names within the active panel
  const panelMetricNames = useMemo(() => {
    return Array.from(new Set(panelMetrics.map((m) => m.metric_name)));
  }, [panelMetrics]);

  // If selectedMetric is not in panelMetricNames, select first available
  useEffect(() => {
    if (panelMetricNames.length > 0) {
      if (!panelMetricNames.includes(selectedMetric)) {
        setSelectedMetric(panelMetricNames[0]);
      }
    }
  }, [activePanelId, panelMetricNames, selectedMetric]);

  // Summary list of metrics in current panel (latest entry of each)
  const panelSummaryList = useMemo(() => {
    const map = new Map<string, { latest: LabMetric; history: LabMetric[] }>();
    panelMetrics.forEach((m) => {
      const existing = map.get(m.metric_name);
      if (!existing) {
        map.set(m.metric_name, { latest: m, history: [m] });
      } else {
        existing.history.push(m);
        if (new Date(m.record_date).getTime() >= new Date(existing.latest.record_date).getTime()) {
          existing.latest = m;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => 
      a.latest.metric_name.localeCompare(b.latest.metric_name)
    );
  }, [panelMetrics]);

  // Data for the active chart
  const chartData = useMemo(() => {
    return metrics
      .filter((m) => m.metric_name === selectedMetric)
      .sort((a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime());
  }, [metrics, selectedMetric]);

  const currentRefMin = chartData.length > 0 ? chartData[chartData.length - 1].reference_min : null;
  const currentRefMax = chartData.length > 0 ? chartData[chartData.length - 1].reference_max : null;
  const currentUnit = chartData.length > 0 ? chartData[chartData.length - 1].unit : "";
  const latestMetricValue = chartData.length > 0 ? chartData[chartData.length - 1].value : null;
  const previousMetricValue = chartData.length > 1 ? chartData[chartData.length - 2].value : null;

  const trendDelta = latestMetricValue !== null && previousMetricValue !== null
    ? +(latestMetricValue - previousMetricValue).toFixed(2)
    : null;

  const handleAddMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMetric.metric_name || newMetric.value === undefined) return;
    try {
      await api.addLabMetric(patient.id, newMetric);
      setShowAddModal(false);
      await loadMetrics(true);
      setSelectedMetric(newMetric.metric_name);
    } catch (err: any) {
      alert((language === "ru" ? "Ошибка добавления: " : "Error adding metric: ") + (err.message || err));
    }
  };

  const handleDeleteMetric = async (id: number) => {
    if (!confirm(language === "ru" ? "Удалить эту запись?" : "Delete this entry?")) return;
    try {
      await api.deleteLabMetric(patient.id, id);
      setMetrics((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      alert((language === "ru" ? "Ошибка удаления: " : "Delete error: ") + (err.message || err));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner / Actions */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 text-zinc-800 dark:text-zinc-200">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {t.labs.title}
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md border border-zinc-200 dark:border-zinc-700">
                {metrics.length} {t.labs.metricsInDb}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {t.labs.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={handleReparse}
            disabled={reparsing}
            className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50 border border-zinc-200 dark:border-zinc-700"
            title={language === "ru" ? "Заново просканировать все загруженные файлы анализов" : "Rescan all uploaded lab reports to extract biomarkers"}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reparsing ? "animate-spin text-emerald-500" : ""}`} />
            {reparsing ? t.labs.rescanning : t.labs.rescanBtn}
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            {t.labs.addManualBtn}
          </button>
        </div>
      </div>

      {reparseMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{reparseMessage}</span>
        </div>
      )}

      {/* Panels Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-zinc-200 dark:border-zinc-800">
        {panels.map((panel) => {
          const Icon = panel.icon;
          const isActive = activePanelId === panel.id;
          const count = panel.id === "all"
            ? Array.from(new Set(metrics.map((m) => m.metric_name))).length
            : Array.from(
                new Set(
                  metrics
                    .filter((m) =>
                      panel.matchPatterns.some((p) =>
                        m.metric_name.toLowerCase().includes(p.toLowerCase())
                      )
                    )
                    .map((m) => m.metric_name)
                )
              ).length;

          return (
            <button
              key={panel.id}
              onClick={() => setActivePanelId(panel.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium rounded-t-xl transition-all whitespace-nowrap border-b-2 -mb-[1px] ${
                isActive
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-zinc-900 shadow-sm"
                  : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{panel.shortName}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    isActive
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                      : "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Panel Description & Clinical Goal */}
      <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{activePanel.name}</span>
            <span className="text-zinc-400">•</span>
            <span className="text-zinc-500 dark:text-zinc-400">{activePanel.description}</span>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{t.labs.panelGoal}</span> {activePanel.goal}
          </p>
        </div>

        {panelMetricNames.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">{t.labs.chartSelect}</label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs rounded-xl px-3 py-1.5 outline-none focus:border-emerald-500"
            >
              {panelMetricNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Metrics Summary Chips / Cards within Active Panel */}
      {panelSummaryList.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
            <span className="font-medium">{t.labs.biomarkersInPanel}</span>
            <span>{t.labs.found} {panelSummaryList.length}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {panelSummaryList.map(({ latest, history }) => {
              const isSelected = selectedMetric === latest.metric_name;
              const isHigh = latest.status === "high";
              const isLow = latest.status === "low";
              const isBorderline = latest.status === "borderline";

              const statusBadgeText = isHigh 
                ? (language === "ru" ? "Выше" : "High") 
                : isLow 
                ? (language === "ru" ? "Ниже" : "Low") 
                : isBorderline 
                ? (language === "ru" ? "Граница" : "Border") 
                : (language === "ru" ? "Норма" : "Normal");

              return (
                <button
                  key={latest.metric_name}
                  onClick={() => setSelectedMetric(latest.metric_name)}
                  className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                    isSelected
                      ? "border-emerald-500 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500 shadow-sm"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                      {latest.metric_name}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase shrink-0 ${
                        isHigh
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                          : isLow
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                          : isBorderline
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                      }`}
                    >
                      {statusBadgeText}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {latest.value}{" "}
                      <span className="text-[10px] font-normal text-zinc-500">{latest.unit}</span>
                    </span>
                    {history.length > 1 && (
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {history.length} {t.labs.measurementsCount}
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 flex items-center justify-between">
                    <span>{latest.record_date}</span>
                    {latest.reference_min !== undefined && latest.reference_max !== undefined && (
                      <span>
                        {latest.reference_min}–{latest.reference_max}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Chart Section */}
      {chartData.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center shadow-sm">
          <LineChartIcon className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">{t.labs.noDataTitle}</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
            {t.labs.noDataDesc}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {selectedMetric}
                </h4>
                <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                  {currentUnit}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {t.labs.referenceRange}{" "}
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {currentRefMin !== null && currentRefMin !== undefined ? currentRefMin : "—"} —{" "}
                  {currentRefMax !== null && currentRefMax !== undefined ? currentRefMax : "—"} {currentUnit}
                </span>
              </p>
            </div>

            {/* Latest Value and Trend */}
            <div className="flex items-center gap-4 text-right">
              {trendDelta !== null && (
                <div className="flex flex-col items-end">
                  <span className="text-[11px] text-zinc-400">{t.labs.trend}</span>
                  <div
                    className={`flex items-center gap-1 text-xs font-semibold ${
                      trendDelta > 0
                        ? "text-rose-600 dark:text-rose-400"
                        : trendDelta < 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-zinc-500"
                    }`}
                  >
                    {trendDelta > 0 ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : trendDelta < 0 ? (
                      <TrendingDown className="w-3.5 h-3.5" />
                    ) : (
                      <Minus className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {trendDelta > 0 ? `+${trendDelta}` : trendDelta} {currentUnit}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">
                  {t.labs.current} ({chartData[chartData.length - 1].record_date})
                </span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {latestMetricValue}{" "}
                  <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">{currentUnit}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Chart */}
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 12, right: 30, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#27272a" : "#f4f4f5"} />
                <XAxis 
                  dataKey="record_date" 
                  stroke={isDark ? "#71717a" : "#a1a1aa"} 
                  fontSize={12} 
                  tickLine={false} 
                />
                <YAxis 
                  stroke={isDark ? "#71717a" : "#a1a1aa"} 
                  fontSize={12} 
                  tickLine={false} 
                  domain={["auto", "auto"]} 
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "#18181b" : "#ffffff",
                    borderColor: isDark ? "#3f3f46" : "#e4e4e7",
                    borderRadius: "0.75rem",
                    color: isDark ? "#f4f4f5" : "#18181b",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    fontSize: "12px",
                  }}
                  formatter={(val: any) => [`${val} ${currentUnit}`, selectedMetric]}
                  labelFormatter={(lbl) => `${t.common.date}: ${lbl}`}
                />
                {currentRefMin !== null && currentRefMin !== undefined && (
                  <ReferenceLine
                    y={currentRefMin}
                    stroke={isDark ? "#60a5fa" : "#3b82f6"}
                    strokeDasharray="4 4"
                    label={{ 
                      value: `${t.labs.lowerRef} (${currentRefMin})`, 
                      fill: isDark ? "#60a5fa" : "#3b82f6", 
                      fontSize: 10, 
                      position: "insideBottomLeft" 
                    }}
                  />
                )}
                {currentRefMax !== null && currentRefMax !== undefined && (
                  <ReferenceLine
                    y={currentRefMax}
                    stroke={isDark ? "#f87171" : "#ef4444"}
                    strokeDasharray="4 4"
                    label={{ 
                      value: `${t.labs.upperRef} (${currentRefMax})`, 
                      fill: isDark ? "#f87171" : "#ef4444", 
                      fontSize: 10, 
                      position: "insideTopLeft" 
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ fill: "#10b981", r: 4 }}
                  activeDot={{ r: 6, fill: "#059669" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* History Table */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              {t.labs.historyTitle} ({selectedMetric})
            </h4>
            <span className="text-xs text-zinc-400">{t.labs.totalPoints} {chartData.length}</span>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {chartData.map((row) => (
              <div 
                key={row.id} 
                className="p-3.5 flex items-center justify-between text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition"
              >
                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                  <span className="text-zinc-800 dark:text-zinc-200 font-medium">{row.record_date}</span>
                  {row.notes && (
                    <span className="text-[11px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                      {row.notes}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {row.value} {row.unit}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-medium border ${
                      row.status === "normal"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40"
                        : row.status === "high"
                        ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40"
                        : row.status === "low"
                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40"
                        : "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900/40"
                    }`}
                  >
                    {row.status === "normal"
                      ? t.common.normal
                      : row.status === "high"
                      ? (language === "ru" ? "Повышен" : "High")
                      : row.status === "low"
                      ? (language === "ru" ? "Понижен" : "Low")
                      : t.common.borderline}
                  </span>
                  <button
                    onClick={() => handleDeleteMetric(row.id)}
                    className="text-zinc-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-red-400 transition"
                    title={t.common.delete}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Metric Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{t.labs.addModalTitle}</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMetric} className="space-y-3">
              <div>
                <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">{t.labs.metricNameLabel}</label>
                <input
                  type="text"
                  value={newMetric.metric_name || ""}
                  onChange={(e) => setNewMetric({ ...newMetric, metric_name: e.target.value })}
                  placeholder={t.labs.metricNamePlaceholder}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">{t.labs.valueLabel}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMetric.value || ""}
                    onChange={(e) => setNewMetric({ ...newMetric, value: parseFloat(e.target.value) })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">{t.labs.unitLabel}</label>
                  <input
                    type="text"
                    value={newMetric.unit || ""}
                    onChange={(e) => setNewMetric({ ...newMetric, unit: e.target.value })}
                    placeholder={language === "ru" ? "ммоль/л, г/л..." : "mmol/L, g/L..."}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">{t.labs.refMinLabel}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMetric.reference_min ?? ""}
                    onChange={(e) => setNewMetric({ ...newMetric, reference_min: parseFloat(e.target.value) || undefined })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">{t.labs.refMaxLabel}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMetric.reference_max ?? ""}
                    onChange={(e) => setNewMetric({ ...newMetric, reference_max: parseFloat(e.target.value) || undefined })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">{t.labs.recordDateLabel}</label>
                <input
                  type="date"
                  value={newMetric.record_date || ""}
                  onChange={(e) => setNewMetric({ ...newMetric, record_date: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs transition"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-xl text-xs font-semibold shadow-sm transition"
                >
                  {language === "ru" ? "Добавить" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
