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
  Info,
  Printer
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
import { getBiomarkerDetail } from "@/lib/biomarkerInfo";

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
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
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

  const generateChartSvg = (
    data: { record_date: string; value: number }[],
    refMin: number | null,
    refMax: number | null,
    unit: string,
    metricName: string
  ): string => {
    if (!data || data.length === 0) return "";

    const width = 760;
    const height = 240;
    const padLeft = 65;
    const padRight = 50;
    const padTop = 35;
    const padBottom = 45;

    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    const values = data.map((d) => Number(d.value)).filter((v) => !isNaN(v));
    if (values.length === 0) return "";

    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);

    if (refMin !== null && !isNaN(refMin)) minVal = Math.min(minVal, refMin);
    if (refMax !== null && !isNaN(refMax)) maxVal = Math.max(maxVal, refMax);

    const valSpan = maxVal - minVal || (maxVal > 0 ? maxVal * 0.2 : 1);
    const yMin = Math.max(0, minVal - valSpan * 0.15);
    const yMax = maxVal + valSpan * 0.15;
    const ySpan = yMax - yMin || 1;

    const getY = (val: number) => padTop + (1 - (val - yMin) / ySpan) * chartH;
    const getX = (idx: number) =>
      data.length === 1
        ? padLeft + chartW / 2
        : padLeft + (idx / (data.length - 1)) * chartW;

    const points = data.map((d, i) => ({
      x: getX(i),
      y: getY(d.value),
      date: d.record_date,
      val: d.value,
    }));

    const lineD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const areaD = `${lineD} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} Z`;

    const gridSteps = 4;
    let gridLines = "";
    for (let i = 0; i <= gridSteps; i++) {
      const val = yMin + (i / gridSteps) * ySpan;
      const y = getY(val);
      gridLines += `
        <line x1="${padLeft}" y1="${y.toFixed(1)}" x2="${(width - padRight).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3 3"/>
        <text x="${(padLeft - 8).toFixed(1)}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="9" fill="#94a3b8" font-family="sans-serif">${val >= 100 ? Math.round(val) : val.toFixed(1)}</text>
      `;
    }

    let refLines = "";
    if (refMin !== null && !isNaN(refMin) && refMin >= yMin && refMin <= yMax) {
      const yMinLine = getY(refMin);
      refLines += `
        <line x1="${padLeft}" y1="${yMinLine.toFixed(1)}" x2="${(width - padRight).toFixed(1)}" y2="${yMinLine.toFixed(1)}" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="4 4"/>
        <text x="${(width - padRight + 5).toFixed(1)}" y="${(yMinLine + 3).toFixed(1)}" font-size="8.5" fill="#2563eb" font-weight="bold" font-family="sans-serif">Мин: ${refMin}</text>
      `;
    }
    if (refMax !== null && !isNaN(refMax) && refMax >= yMin && refMax <= yMax) {
      const yMaxLine = getY(refMax);
      refLines += `
        <line x1="${padLeft}" y1="${yMaxLine.toFixed(1)}" x2="${(width - padRight).toFixed(1)}" y2="${yMaxLine.toFixed(1)}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4 4"/>
        <text x="${(width - padRight + 5).toFixed(1)}" y="${(yMaxLine + 3).toFixed(1)}" font-size="8.5" fill="#dc2626" font-weight="bold" font-family="sans-serif">Макс: ${refMax}</text>
      `;
    }

    let dataPoints = "";
    points.forEach((p) => {
      dataPoints += `
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
        <rect x="${(p.x - 22).toFixed(1)}" y="${(p.y - 20).toFixed(1)}" width="44" height="15" rx="4" fill="#065f46" />
        <text x="${p.x.toFixed(1)}" y="${(p.y - 9).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="bold" fill="#ffffff" font-family="sans-serif">${p.val}</text>
        <text x="${p.x.toFixed(1)}" y="${(padTop + chartH + 18).toFixed(1)}" text-anchor="middle" font-size="9" fill="#64748b" font-family="sans-serif">${p.date}</text>
      `;
    });

    return `
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="240" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px;">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="#10b981" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        ${gridLines}
        ${refLines}
        <path d="${areaD}" fill="url(#chartGrad)"/>
        <path d="${lineD}" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        ${dataPoints}
      </svg>
    `;
  };

  const generateSparklineSvg = (history: LabMetric[]): string => {
    if (!history || history.length < 2) return "";
    const w = 90;
    const h = 22;
    const pad = 3;
    const vals = history.map((m) => Number(m.value)).filter((v) => !isNaN(v));
    if (vals.length < 2) return "";
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const pts = history.map((item, i) => {
      const x = pad + (i / (history.length - 1)) * (w - pad * 2);
      const y = pad + (1 - (Number(item.value) - min) / span) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const isRising = vals[vals.length - 1] > vals[0];
    const stroke = isRising ? "#ef4444" : "#10b981";
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:inline-block; vertical-align:middle;"><polyline points="${pts.join(" ")}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  };

  const handlePrintReport = () => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const patientName = patient.full_name || (language === "ru" ? "Пациент" : "Patient");
    const patientAge = patient.age ? `${patient.age} ${language === "ru" ? "лет" : "y.o."}` : "";
    const patientGender = patient.gender
      ? (language === "ru"
          ? (patient.gender.toLowerCase().includes("m") || patient.gender.toLowerCase().includes("муж") ? "Мужской" : "Женский")
          : patient.gender)
      : "";
    const patientMetrics = [
      patientAge,
      patientGender,
      patient.weight ? `${language === "ru" ? "Вес:" : "Weight:"} ${patient.weight} кг` : "",
      patient.height ? `${language === "ru" ? "Рост:" : "Height:"} ${patient.height} см` : "",
      patient.blood_type ? `${language === "ru" ? "Группа крови:" : "Blood group:"} ${patient.blood_type}` : "",
    ]
      .filter(Boolean)
      .join("  •  ");

    const diagnosesStr = patient.chronic_diseases || "";

    const dateStr = new Date().toLocaleString(language === "ru" ? "ru-RU" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const targetMetric = selectedMetric || (panelMetricNames.length > 0 ? panelMetricNames[0] : "");
    const targetHistory = targetMetric
      ? metrics
          .filter((m) => m.metric_name === targetMetric)
          .sort((a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime())
      : [];

    const latest = targetHistory.length > 0 ? targetHistory[targetHistory.length - 1] : null;
    const targetUnit = latest?.unit || "";
    const targetRefMin = latest?.reference_min ?? null;
    const targetRefMax = latest?.reference_max ?? null;

    const detail = targetMetric ? getBiomarkerDetail(targetMetric, language) : null;

    const chartSvg = generateChartSvg(
      targetHistory.map((h) => ({ record_date: h.record_date, value: Number(h.value) })),
      targetRefMin,
      targetRefMax,
      targetUnit,
      targetMetric
    );

    const summaryRowsHtml = panelSummaryList
      .map(({ latest: mLatest, history }) => {
        const isHigh = mLatest.status === "high";
        const isLow = mLatest.status === "low";
        const isBorderline = mLatest.status === "borderline";
        const statusText = isHigh
          ? (language === "ru" ? "Выше нормы" : "High")
          : isLow
          ? (language === "ru" ? "Ниже нормы" : "Low")
          : isBorderline
          ? (language === "ru" ? "Граница" : "Borderline")
          : (language === "ru" ? "В норме" : "Normal");

        const statusBg = isHigh ? "#fee2e2" : isLow ? "#fef3c7" : isBorderline ? "#ffedd5" : "#dcfce7";
        const statusColor = isHigh ? "#991b1b" : isLow ? "#92400e" : isBorderline ? "#9a3412" : "#166534";

        const refStr =
          mLatest.reference_min !== undefined && mLatest.reference_max !== undefined
            ? `${mLatest.reference_min} – ${mLatest.reference_max} ${mLatest.unit}`
            : "—";

        const sparklineSvg = generateSparklineSvg(history);

        return `
          <tr>
            <td style="font-weight: 600; color: #0f172a;">${mLatest.metric_name}</td>
            <td style="font-weight: 700; color: #1e293b;">${mLatest.value} <span style="font-size: 8.5pt; font-weight: normal; color: #64748b;">${mLatest.unit}</span></td>
            <td style="color: #475569; font-size: 9pt;">${mLatest.record_date}</td>
            <td style="color: #64748b; font-size: 9pt;">${refStr}</td>
            <td>
              <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 8pt; font-weight: 700; background-color: ${statusBg}; color: ${statusColor};">
                ${statusText}
              </span>
            </td>
            <td style="text-align: center;">${sparklineSvg}</td>
          </tr>
        `;
      })
      .join("");

    const measurementsRowsHtml = targetHistory
      .slice()
      .reverse()
      .map((h, i, arr) => {
        const isHigh = h.status === "high";
        const isLow = h.status === "low";
        const isBorderline = h.status === "borderline";
        const statusText = isHigh
          ? (language === "ru" ? "Выше нормы" : "High")
          : isLow
          ? (language === "ru" ? "Ниже нормы" : "Low")
          : isBorderline
          ? (language === "ru" ? "Граница" : "Borderline")
          : (language === "ru" ? "В норме" : "Normal");

        const statusBg = isHigh ? "#fee2e2" : isLow ? "#fef3c7" : isBorderline ? "#ffedd5" : "#dcfce7";
        const statusColor = isHigh ? "#991b1b" : isLow ? "#92400e" : isBorderline ? "#9a3412" : "#166534";

        const prev = arr[i + 1];
        let diffStr = "—";
        if (prev) {
          const diff = Number((h.value - prev.value).toFixed(2));
          diffStr = diff > 0 ? `+${diff}` : `${diff}`;
        }

        return `
          <tr>
            <td style="font-weight: 600; color: #334155;">${h.record_date}</td>
            <td style="font-weight: 700; color: #0f172a;">${h.value} ${h.unit}</td>
            <td style="color: #64748b; font-size: 9pt;">${h.reference_min ?? "—"} – ${h.reference_max ?? "—"} ${h.unit}</td>
            <td>
              <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 8pt; font-weight: 700; background-color: ${statusBg}; color: ${statusColor};">
                ${statusText}
              </span>
            </td>
            <td style="font-weight: 600; color: #475569; font-size: 9pt;">${diffStr}</td>
            <td style="color: #64748b; font-size: 8.5pt;">${h.notes || "—"}</td>
          </tr>
        `;
      })
      .join("");

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>MY_DOC - Динамика анализов - ${patientName}</title>
        <style>
          @page {
            size: A4;
            margin: 14mm 14mm 14mm 14mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #111827;
            background: #ffffff;
            line-height: 1.5;
            font-size: 10pt;
            margin: 0;
            padding: 10px;
          }
          .header {
            border-bottom: 2px solid #059669;
            padding-bottom: 12px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .brand-title {
            font-size: 20pt;
            font-weight: 800;
            color: #065f46;
            margin: 0;
            letter-spacing: -0.5px;
          }
          .brand-subtitle {
            font-size: 9pt;
            color: #059669;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 2px;
          }
          .meta-info {
            text-align: right;
            font-size: 9pt;
            color: #4b5563;
            line-height: 1.4;
          }
          .patient-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 4px solid #059669;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 16px;
          }
          .patient-header {
            font-size: 12pt;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 2px;
          }
          .patient-details {
            font-size: 9pt;
            color: #475569;
          }
          .patient-diagnoses {
            font-size: 9pt;
            color: #b45309;
            margin-top: 4px;
            padding-top: 4px;
            border-top: 1px dashed #cbd5e1;
          }
          .section-title {
            font-size: 11pt;
            font-weight: 700;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 18px;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: baseline;
          }
          .chart-box {
            margin-bottom: 16px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .metric-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 6px;
          }
          .metric-name {
            font-size: 13pt;
            font-weight: 800;
            color: #065f46;
          }
          .metric-latest {
            font-size: 13pt;
            font-weight: 800;
            color: #0f172a;
          }
          .detail-box {
            background-color: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 6px;
            padding: 8px 12px;
            margin-top: 8px;
            margin-bottom: 14px;
            font-size: 8.5pt;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .detail-box-title {
            font-weight: 700;
            color: #166534;
            margin-bottom: 2px;
            text-transform: uppercase;
            font-size: 7.5pt;
            letter-spacing: 0.5px;
          }
          .detail-box-content {
            color: #14532d;
            margin-bottom: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            margin-bottom: 16px;
            font-size: 9pt;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 5px 8px;
            text-align: left;
          }
          th {
            background-color: #f1f5f9;
            font-weight: 600;
            color: #334155;
            font-size: 8.5pt;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .footer {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            font-size: 7.5pt;
            color: #94a3b8;
            text-align: center;
            page-break-inside: avoid;
            break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="brand-title">MY_DOC</h1>
            <div class="brand-subtitle">${language === "ru" ? "Клиническая динамика лабораторных показателей" : "Clinical Laboratory Biomarker Dynamics"}</div>
          </div>
          <div class="meta-info">
            <div><strong>${language === "ru" ? "Дата формирования:" : "Date:"}</strong> ${dateStr}</div>
            <div><strong>${language === "ru" ? "Панель:" : "Panel:"}</strong> ${activePanel.name}</div>
          </div>
        </div>

        <div class="patient-card">
          <div class="patient-header">${patientName}</div>
          ${patientMetrics ? `<div class="patient-details">${patientMetrics}</div>` : ""}
          ${diagnosesStr ? `<div class="patient-diagnoses"><strong>${language === "ru" ? "Диагнозы:" : "Diagnoses:"}</strong> ${diagnosesStr}</div>` : ""}
        </div>

        ${
          targetMetric
            ? `
          <div class="chart-box">
            <div class="metric-header">
              <div>
                <span class="metric-name">${targetMetric}</span>
                <span style="font-size: 9.5pt; color: #64748b; margin-left: 6px;">(${targetUnit})</span>
              </div>
              <div class="metric-latest">
                ${latest ? `${latest.value} ${targetUnit}` : ""}
                ${
                  targetRefMin !== null && targetRefMax !== null
                    ? `<span style="font-size: 8.5pt; font-weight: normal; color: #64748b; margin-left: 8px;">(Норма: ${targetRefMin}–${targetRefMax})</span>`
                    : ""
                }
              </div>
            </div>

            ${chartSvg}

            ${
              detail
                ? `
              <div class="detail-box">
                <div class="detail-box-title">${language === "ru" ? "Что обозначает показатель" : "Biomarker explanation"}</div>
                <div class="detail-box-content">${detail.whatIs}</div>
                <div class="detail-box-title" style="color: #b45309; margin-top: 4px;">${language === "ru" ? "Клиническое значение и на что влияет" : "Clinical impact"}</div>
                <div class="detail-box-content" style="color: #92400e;">${detail.clinicalImpact}</div>
              </div>
            `
                : ""
            }

            ${
              measurementsRowsHtml
                ? `
              <div class="section-title">
                <span>${language === "ru" ? "Хронология измерений" : "Measurement History"} (${targetMetric})</span>
                <span style="font-size: 8.5pt; font-weight: normal; color: #64748b;">${targetHistory.length} ${language === "ru" ? "измерений" : "data points"}</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>${language === "ru" ? "Дата" : "Date"}</th>
                    <th>${language === "ru" ? "Значение" : "Value"}</th>
                    <th>${language === "ru" ? "Референс" : "Reference"}</th>
                    <th>${language === "ru" ? "Статус" : "Status"}</th>
                    <th>${language === "ru" ? "Динамика" : "Change"}</th>
                    <th>${language === "ru" ? "Примечание" : "Notes"}</th>
                  </tr>
                </thead>
                <tbody>
                  ${measurementsRowsHtml}
                </tbody>
              </table>
            `
                : ""
            }
          </div>
        `
            : ""
        }

        ${
          panelSummaryList.length > 0
            ? `
          <div style="page-break-before: auto;">
            <div class="section-title">
              <span>${language === "ru" ? "Сводная таблица панели:" : "Panel Summary Matrix:"} ${activePanel.name}</span>
              <span style="font-size: 8.5pt; font-weight: normal; color: #64748b;">${panelSummaryList.length} ${language === "ru" ? "биомаркеров" : "biomarkers"}</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>${language === "ru" ? "Показатель" : "Biomarker"}</th>
                  <th>${language === "ru" ? "Текущее" : "Latest"}</th>
                  <th>${language === "ru" ? "Дата" : "Date"}</th>
                  <th>${language === "ru" ? "Референсный интервал" : "Reference Range"}</th>
                  <th>${language === "ru" ? "Статус" : "Status"}</th>
                  <th style="text-align: center; width: 100px;">${language === "ru" ? "Тренд" : "Trend"}</th>
                </tr>
              </thead>
              <tbody>
                ${summaryRowsHtml}
              </tbody>
            </table>
          </div>
        `
            : ""
        }

        <div class="footer">
          ${
            language === "ru"
              ? "Документ сформирован системой MY_DOC на основе лабораторных исследований и доказательной медицины. Не является диагнозом и подлежит оценке лечащим врачом."
              : "Generated by MY_DOC clinical system based on diagnostic laboratory tests. This report is for clinical evaluation and does not constitute a standalone medical diagnosis."
          }
        </div>
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2500);
    }, 250);
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
            onClick={handlePrintReport}
            className="px-3.5 py-2 bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-zinc-200 dark:border-zinc-700 shadow-2xs whitespace-nowrap"
            title={t.labs.savePdfTooltip || (language === "ru" ? "Сохранить отчет с графиками в PDF / Печать" : "Save lab report with charts to PDF / Print")}
          >
            <Printer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{t.labs.savePdfBtn || (language === "ru" ? "Сохранить в PDF" : "Save to PDF")}</span>
          </button>

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
            {panelSummaryList.map(({ latest, history }, index) => {
              const isSelected = selectedMetric === latest.metric_name;
              const isHigh = latest.status === "high";
              const isLow = latest.status === "low";
              const isBorderline = latest.status === "borderline";
              const isTooltipActive = hoveredTooltip === latest.metric_name || activeTooltip === latest.metric_name;

              const statusBadgeText = isHigh 
                ? (language === "ru" ? "Выше" : "High") 
                : isLow 
                ? (language === "ru" ? "Ниже" : "Low") 
                : isBorderline 
                ? (language === "ru" ? "Граница" : "Border") 
                : (language === "ru" ? "Норма" : "Normal");

              const info = getBiomarkerDetail(latest.metric_name, language) || {
                category: language === "ru" ? "Лабораторный показатель" : "Lab Biomarker",
                whatIs: language === "ru" 
                  ? `Количественное измерение показателя «${latest.metric_name}» в биоматериале пациента.`
                  : `Quantitative measurement of "${latest.metric_name}" in the patient's biological sample.`,
                clinicalImpact: language === "ru"
                  ? "Используется для оценки текущего функционального состояния организма и мониторинга динамики."
                  : "Used to assess current organ function and monitor physiological trends over time."
              };

              // Responsive positioning for popover
              const isFirstColMobile = index % 2 === 0;
              const isFirstColDesktop = index % 5 === 0;
              const isLastColDesktop = index % 5 === 4;

              const tooltipPos = `${isFirstColMobile ? "left-0" : "right-0"} ${
                isFirstColDesktop 
                  ? "lg:left-0 lg:right-auto lg:translate-x-0" 
                  : isLastColDesktop 
                  ? "lg:right-0 lg:left-auto lg:translate-x-0" 
                  : "lg:left-1/2 lg:right-auto lg:-translate-x-1/2"
              }`;

              const arrowPos = `${isFirstColMobile ? "left-6" : "right-6"} ${
                isFirstColDesktop 
                  ? "lg:left-6 lg:right-auto lg:translate-x-0" 
                  : isLastColDesktop 
                  ? "lg:right-6 lg:left-auto lg:translate-x-0" 
                  : "lg:left-1/2 lg:right-auto lg:-translate-x-1/2"
              }`;

              return (
                <div
                  key={latest.metric_name}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedMetric(latest.metric_name)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedMetric(latest.metric_name);
                    }
                  }}
                  className={`relative text-left p-3 rounded-xl border transition-all flex flex-col justify-between cursor-pointer select-none ${
                    isSelected
                      ? "border-emerald-500 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500 shadow-sm"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                  } ${isTooltipActive ? "z-40" : "hover:z-20"}`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span 
                      className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1 flex-1 pr-0.5" 
                      title={latest.metric_name}
                    >
                      {latest.metric_name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
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
                      {/* Little circular 'i' icon in the corner */}
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTooltip(activeTooltip === latest.metric_name ? null : latest.metric_name);
                        }}
                        onMouseEnter={() => setHoveredTooltip(latest.metric_name)}
                        onMouseLeave={() => setHoveredTooltip(null)}
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-serif font-bold italic transition-all cursor-pointer ${
                          isTooltipActive
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 hover:text-emerald-700 dark:hover:text-emerald-300"
                        }`}
                        title={language === "ru" ? "Что обозначает показатель и на что влияет" : "Biomarker details & clinical significance"}
                      >
                        i
                      </span>
                    </div>
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

                  {/* Tooltip Popover */}
                  {isTooltipActive && (
                    <div
                      role="tooltip"
                      onClick={(e) => e.stopPropagation()}
                      onMouseEnter={() => setHoveredTooltip(latest.metric_name)}
                      onMouseLeave={() => setHoveredTooltip(null)}
                      className={`absolute z-50 bottom-[calc(100%+8px)] ${tooltipPos} w-72 sm:w-80 p-3.5 bg-zinc-900/95 dark:bg-zinc-950/95 text-zinc-100 rounded-2xl shadow-2xl border border-zinc-700/80 backdrop-blur-md text-xs pointer-events-auto transition-all animate-in fade-in zoom-in-95 duration-150`}
                    >
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2.5 gap-2">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-400 truncate">
                          <Info className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{latest.metric_name}</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-normal px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700 shrink-0">
                          {info.category}
                        </span>
                      </div>

                      <div className="space-y-2.5 text-left">
                        <div>
                          <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 dark:text-emerald-300 flex items-center gap-1">
                            <span>{language === "ru" ? "Что обозначает показатель:" : "What it means:"}</span>
                          </div>
                          <p className="text-[11px] text-zinc-200 mt-0.5 leading-relaxed font-normal">
                            {info.whatIs}
                          </p>
                        </div>

                        <div>
                          <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400 dark:text-amber-300 flex items-center gap-1">
                            <span>{language === "ru" ? "На что влияет / значение:" : "Clinical impact / significance:"}</span>
                          </div>
                          <p className="text-[11px] text-zinc-300 mt-0.5 leading-relaxed font-normal">
                            {info.clinicalImpact}
                          </p>
                        </div>

                        {latest.reference_min !== undefined && latest.reference_max !== undefined && (
                          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400 font-normal">
                            <span>{language === "ru" ? "Референс:" : "Reference range:"}</span>
                            <span className="font-semibold text-emerald-400">
                              {latest.reference_min} – {latest.reference_max} {latest.unit}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Triangle Pointer */}
                      <div className={`absolute top-full -mt-px border-4 border-transparent border-t-zinc-900/95 dark:border-t-zinc-950/95 ${arrowPos}`} />
                    </div>
                  )}
                </div>
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
                <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 font-mono">
                  {currentUnit}
                </span>
                <button
                  onClick={handlePrintReport}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 border border-zinc-200 dark:border-zinc-700 transition flex items-center gap-1.5 shadow-2xs"
                  title={language === "ru" ? "Сохранить этот график и показатели в PDF" : "Save this chart and metrics to PDF"}
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{language === "ru" ? "В PDF" : "PDF"}</span>
                </button>
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

          {/* Biomarker Meaning and Clinical Significance Callout for Selected Metric */}
          {(() => {
            const selectedDetail = selectedMetric ? getBiomarkerDetail(selectedMetric, language) : null;
            if (!selectedDetail) return null;
            return (
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 text-xs transition-all">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span>{language === "ru" ? "Что обозначает показатель" : "What it means"}</span>
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed text-xs">
                      {selectedDetail.whatIs}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      <span>{language === "ru" ? "На что влияет / клиническое значение" : "Clinical impact / significance"}</span>
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed text-xs">
                      {selectedDetail.clinicalImpact}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

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
