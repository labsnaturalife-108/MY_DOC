"use client";

import React, { useState, useEffect } from "react";
import { 
  HeartPulse, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Info, 
  RotateCcw, 
  MessageSquare, 
  ExternalLink, 
  FileText, 
  CheckCircle2, 
  Activity, 
  TrendingUp,
  Heart,
  Droplets,
  Scale,
  Sparkles,
  Loader2
} from "lucide-react";
import { Patient, api, PreventInputs, PreventRiskResult } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";

interface PreventCalculatorViewProps {
  patient: Patient;
  onNavigateToChat?: (prefillQuery?: string) => void;
}

export const PreventCalculatorView: React.FC<PreventCalculatorViewProps> = ({
  patient,
  onNavigateToChat
}) => {
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState<boolean>(true);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [sex, setSex] = useState<string>("male");
  const [age, setAge] = useState<number>(patient.age || 50);
  
  // Cholesterol inputs (kept in sync)
  const [totalCholMmol, setTotalCholMmol] = useState<number>(5.2);
  const [hdlCholMmol, setHdlCholMmol] = useState<number>(1.3);
  
  // Blood pressure & BMI
  const [systolicBp, setSystolicBp] = useState<number>(120);
  const [bmi, setBmi] = useState<number>(patient.bmi || 25.0);
  
  // Renal function
  const [creatinineUmol, setCreatinineUmol] = useState<number>(85.0);
  const [egfr, setEgfr] = useState<number>(90.0);

  // Risk switches
  const [hasDiabetes, setHasDiabetes] = useState<boolean>(false);
  const [currentSmoker, setCurrentSmoker] = useState<boolean>(false);
  const [onHtnMeds, setOnHtnMeds] = useState<boolean>(false);
  const [onCholesterolMeds, setOnCholesterolMeds] = useState<boolean>(false);

  // Extra risk factors & source documents
  const [riskModifiers, setRiskModifiers] = useState<string[]>([]);
  const [sourcesDetected, setSourcesDetected] = useState<Record<string, string>>({});

  // Calculation Results
  const [riskResult, setRiskResult] = useState<PreventRiskResult | null>(null);

  // Load initial parameters from patient records & documents
  const loadPreventData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPreventParams(patient.id);
      
      const inp = data.inputs;
      setSex(inp.sex || "male");
      setAge(inp.age || patient.age || 50);
      setTotalCholMmol(inp.total_cholesterol_mmol || 5.2);
      setHdlCholMmol(inp.hdl_cholesterol_mmol || 1.3);
      setSystolicBp(inp.systolic_bp || 120);
      setBmi(inp.bmi || 25.0);
      setEgfr(inp.egfr || 90.0);
      setCreatinineUmol(inp.creatinine_umol || 85.0);
      setHasDiabetes(Boolean(inp.has_diabetes));
      setCurrentSmoker(Boolean(inp.current_smoker));
      setOnHtnMeds(Boolean(inp.on_htn_meds));
      setOnCholesterolMeds(Boolean(inp.on_cholesterol_meds));
      setRiskModifiers(inp.risk_modifiers || []);
      setSourcesDetected(inp.sources_detected || {});

      setRiskResult(data.risk);
    } catch (err: any) {
      console.error("Error loading PREVENT data:", err);
      setError(err?.message || (language === "ru" ? "Не удалось загрузить параметры из анализов" : "Failed to load parameters from reports"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreventData();
  }, [patient.id]);

  // Recalculate risk on demand or parameter change
  const handleRecalculate = async (overrides?: Partial<PreventInputs>) => {
    try {
      setCalculating(true);
      const payload: Partial<PreventInputs> = {
        sex,
        age: Number(age),
        total_cholesterol_mmol: Number(totalCholMmol),
        hdl_cholesterol_mmol: Number(hdlCholMmol),
        systolic_bp: Number(systolicBp),
        bmi: Number(bmi),
        egfr: Number(egfr),
        creatinine_umol: Number(creatinineUmol),
        has_diabetes: hasDiabetes,
        current_smoker: currentSmoker,
        on_htn_meds: onHtnMeds,
        on_cholesterol_meds: onCholesterolMeds,
        risk_modifiers: riskModifiers,
        ...overrides
      };

      const result = await api.calculatePreventRisk(patient.id, payload);
      setRiskResult(result);
    } catch (err: any) {
      console.error("Error calculating risk:", err);
      setError(err?.message || (language === "ru" ? "Ошибка расчета риска" : "Error calculating risk"));
    } finally {
      setCalculating(false);
    }
  };

  // Color helper based on risk badge
  const getRiskTheme = (category?: string) => {
    const cat = (category || "").toLowerCase();
    if (cat.includes("низк") || cat.includes("low")) {
      return {
        bg: "bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300",
        badge: "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30",
        accent: "text-emerald-600 dark:text-emerald-400",
        bar: "bg-emerald-500",
        title: "text-emerald-900 dark:text-zinc-100",
        icon: ShieldCheck
      };
    }
    if (cat.includes("погран") || cat.includes("borderline")) {
      return {
        bg: "bg-amber-50/70 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/60 text-amber-800 dark:text-amber-300",
        badge: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30",
        accent: "text-amber-600 dark:text-amber-400",
        bar: "bg-amber-500",
        title: "text-amber-900 dark:text-zinc-100",
        icon: AlertTriangle
      };
    }
    if (cat.includes("умерен") || cat.includes("промежут") || cat.includes("intermediate")) {
      return {
        bg: "bg-orange-50/70 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800/60 text-orange-800 dark:text-orange-300",
        badge: "bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-500/30",
        accent: "text-orange-600 dark:text-orange-400",
        bar: "bg-orange-500",
        title: "text-orange-900 dark:text-zinc-100",
        icon: TrendingUp
      };
    }
    return {
      bg: "bg-rose-50/70 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800/60 text-rose-800 dark:text-rose-300",
      badge: "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-500/30",
      accent: "text-rose-600 dark:text-rose-400",
      bar: "bg-rose-500",
      title: "text-rose-900 dark:text-zinc-100",
      icon: ShieldAlert
    };
  };

  const getRiskCategoryLabel = (category?: string) => {
    if (!category) return "";
    if (language === "ru") return category;
    const cat = category.toLowerCase();
    if (cat.includes("низк") || cat.includes("low")) return t.prevent.riskCategories.low;
    if (cat.includes("погран") || cat.includes("borderline")) return t.prevent.riskCategories.borderline;
    if (cat.includes("умерен") || cat.includes("промежут") || cat.includes("intermediate")) return t.prevent.riskCategories.intermediate;
    return t.prevent.riskCategories.high;
  };

  const theme = getRiskTheme(riskResult?.risk_category);

  const handleConsultDoctor = () => {
    if (!onNavigateToChat) return;
    const query = language === "ru"
      ? `Рассчитай и проанализируй мой 10-летний риск по калькулятору AHA PREVENT™ 2023–2024 (Суммарный риск CVD: ${riskResult?.cvd_10yr ?? "—"}%, ASCVD: ${riskResult?.ascvd_10yr ?? "—"}%, СН: ${riskResult?.heart_failure_10yr ?? "—"}%). Учти мои параметры: Общий холестерин ${totalCholMmol} ммоль/л, ЛПВП ${hdlCholMmol} ммоль/л, САД ${systolicBp} мм рт. ст., eGFR ${egfr} мл/мин, а также факторы риска (${riskModifiers.join(", ") || "нет"}). Каковы целевые показатели ЛПНП и нужна ли терапия статинами согласно рекомендациям AHA/ACC?`
      : `Please analyze my 10-year cardiovascular risk according to the AHA PREVENT™ 2023–2024 calculator (Total CVD Risk: ${riskResult?.cvd_10yr ?? "—"}%, ASCVD: ${riskResult?.ascvd_10yr ?? "—"}%, Heart Failure: ${riskResult?.heart_failure_10yr ?? "—"}%). My parameters: Total Cholesterol ${totalCholMmol} mmol/L, HDL ${hdlCholMmol} mmol/L, SBP ${systolicBp} mmHg, eGFR ${egfr} ml/min, and clinical risk factors (${riskModifiers.join(", ") || "none"}). What are the target LDL levels and is statin therapy indicated per AHA/ACC guidelines?`;
    onNavigateToChat(query);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
        <p className="text-sm text-zinc-400">
          {language === "ru" 
            ? "Анализ бланков и расчет кардиориска AHA PREVENT™..." 
            : "Parsing reports and computing AHA PREVENT™ cardiovascular risk..."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-xl relative overflow-hidden transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    {t.prevent.title}
                  </h2>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    AHA/ACC 2023–2024
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t.prevent.subtitle}
                </p>
              </div>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed pt-1">
              {language === "ru" ? (
                <>
                  Модель <strong className="text-zinc-800 dark:text-zinc-300">PREVENT</strong> (Predicting Risk of cardiovascular disease EVENTs) 
                  впервые объединяет оценку атеросклеротических осложнений (инфаркт, инсульт) с риском сердечной недостаточности (Heart Failure) 
                  и функцией почек (eGFR), обеспечивая точнейшую персонализацию терапии статинами и контроля давления.
                </>
              ) : (
                <>
                  The <strong className="text-zinc-800 dark:text-zinc-300">PREVENT</strong> (Predicting Risk of cardiovascular disease EVENTs) 
                  model integrates atherosclerotic complications (MI, ischemic stroke) with incident Heart Failure (HF) and kidney function (eGFR), 
                  delivering state-of-the-art precision for statin and blood pressure management.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => loadPreventData()}
              title={t.prevent.autoFillBtn}
              className="px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white text-xs font-medium flex items-center gap-2 transition shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              {t.prevent.autoFillBtn}
            </button>
            <a
              href="https://professional.heart.org/en/guidelines-and-statements/prevent-calculator"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-zinc-100/60 dark:bg-zinc-800/50 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {language === "ru" ? "AHA Руководство" : "AHA Guidelines"}
            </a>
          </div>
        </div>

        {/* Source tags */}
        {Object.keys(sourcesDetected).length > 0 && (
          <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {language === "ru" ? "Данные получены из документов:" : "Data extracted from documents:"}
            </span>
            {Object.entries(sourcesDetected).map(([param, fname]) => (
              <span 
                key={param} 
                className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300 font-mono text-[10px] flex items-center gap-1"
              >
                <FileText className="w-3 h-3 text-zinc-400" />
                {fname}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main Results Grid */}
      {riskResult && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Total CVD Risk (Main) */}
          <div className={`p-6 rounded-3xl border shadow-sm dark:shadow-xl relative overflow-hidden transition ${theme.bg}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">
                  {language === "ru" ? "10-летний суммарный риск" : "10-Year Cumulative Risk"}
                </span>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-rose-500" />
                  {t.prevent.totalCvd}
                </h3>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border font-mono ${theme.badge}`}>
                {riskResult.risk_badge}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-white font-mono">
                {riskResult.cvd_10yr}%
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {language === "ru" ? "вероятность за 10 лет" : "10-year probability"}
              </span>
            </div>

            {/* Gauge progress bar */}
            <div className="w-full bg-zinc-200/80 dark:bg-zinc-800/80 rounded-full h-2 mb-3 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${theme.bar}`}
                style={{ width: `${Math.min(100, (riskResult.cvd_10yr / 25) * 100)}%` }}
              />
            </div>

            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-snug">
              {language === "ru" ? "Категория: " : "Category: "}
              <strong className="text-zinc-900 dark:text-white">{getRiskCategoryLabel(riskResult.risk_category)}</strong>. 
              {" "}{t.prevent.totalCvdDesc}.
            </p>
          </div>

          {/* Card 2: ASCVD Risk (Atherosclerosis) */}
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-xl relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">
                  {language === "ru" ? "10-летний риск атеросклероза" : "10-Year Atherosclerotic Risk"}
                </span>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-amber-500" />
                  {t.prevent.ascvd}
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 text-[11px] font-mono border">
                {language === "ru" ? "Инфаркт / Инсульт" : "MI / Stroke"}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-white font-mono">
                {riskResult.ascvd_10yr}%
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {language === "ru" ? "ишемические события" : "ischemic events"}
              </span>
            </div>

            <div className="w-full bg-zinc-200/80 dark:bg-zinc-800/80 rounded-full h-2 mb-3 overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (riskResult.ascvd_10yr / 20) * 100)}%` }}
              />
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-snug">
              {t.prevent.ascvdDesc}
            </p>
          </div>

          {/* Card 3: Heart Failure Risk & 30-Year Horizon */}
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-xl relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">
                  {language === "ru" ? "Сердечная недостаточность" : "Heart Failure (10-Yr)"}
                </span>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  {t.prevent.heartFailure}
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20 text-[11px] font-mono border">
                HF
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-white font-mono">
                {riskResult.heart_failure_10yr}%
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {language === "ru" ? "риск декомпенсации" : "incident risk"}
              </span>
            </div>

            {/* 30-Year Forecast Preview */}
            <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-zinc-500 dark:text-zinc-400">
                {language === "ru" ? "30-летний горизонт:" : "30-Year Lifetime Horizon:"}
              </span>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-zinc-700 dark:text-zinc-300">CVD: <strong className="text-zinc-900 dark:text-white">{riskResult.cvd_30yr ?? "—"}%</strong></span>
                <span className="text-zinc-300 dark:text-zinc-600">|</span>
                <span className="text-zinc-700 dark:text-zinc-300">ASCVD: <strong className="text-zinc-900 dark:text-white">{riskResult.ascvd_30yr ?? "—"}%</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clinical Modifiers & Risk Enhancers Alert */}
      {riskModifiers.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {language === "ru" ? "Выявлены клинические усилители риска (AHA/ACC Risk Enhancers):" : "Identified AHA/ACC Clinical Risk Enhancers:"}
            </h4>
            <ul className="text-xs text-amber-800 dark:text-amber-300/90 list-disc list-inside space-y-0.5">
              {riskModifiers.map((mod, i) => (
                <li key={i}>{mod}</li>
              ))}
            </ul>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 pt-1">
              {language === "ru" ? (
                <>
                  Примечание эксперта: Согласно руководству AHA/ACC 2023, наличие визуализированного субклинического атеросклероза 
                  (бляшки в сонных артериях) или повышенного уровня Lp(a) реклассифицирует пациента в группу высокого приоритета 
                  для медикаментозной коррекции липидов (статины), даже если 10-летний базовый балл находится в диапазоне низкого или умеренного риска.
                </>
              ) : (
                <>
                  Expert Note: Per 2023 AHA/ACC guidelines, presence of imaged subclinical atherosclerosis 
                  (carotid plaques) or elevated Lp(a) reclassifies patient into a high-priority category 
                  for lipid-lowering therapy (statins), even when 10-year score falls into borderline or intermediate risk.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Interactive Parameters Panel */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-xl space-y-6 transition-colors">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Scale className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              {t.prevent.parametersTitle}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {language === "ru" 
                ? "Вы можете изменить значения параметров, чтобы оценить эффект снижения давления или холестерина" 
                : "Modify values dynamically to observe the clinical benefit of lowering blood pressure or cholesterol"}
            </p>
          </div>
          <button
            onClick={() => handleRecalculate()}
            disabled={calculating}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
          >
            {calculating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t.common.loading}
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                {t.prevent.calculateBtn}
              </>
            )}
          </button>
        </div>

        {/* Input Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sex */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{t.prevent.sex}</label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-100 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => { setSex("male"); handleRecalculate({ sex: "male" }); }}
                className={`py-1.5 rounded-lg text-xs font-medium transition ${
                  sex === "male"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {t.common.male}
              </button>
              <button
                type="button"
                onClick={() => { setSex("female"); handleRecalculate({ sex: "female" }); }}
                className={`py-1.5 rounded-lg text-xs font-medium transition ${
                  sex === "female"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {t.common.female}
              </button>
            </div>
          </div>

          {/* Age */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{t.prevent.age}</label>
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{age} {t.common.yearsOld}</span>
            </div>
            <input
              type="number"
              min={30}
              max={79}
              value={age}
              onChange={(e) => {
                const val = Number(e.target.value);
                setAge(val);
              }}
              onBlur={() => handleRecalculate({ age: Number(age) })}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 font-mono outline-none focus:border-zinc-500"
            />
          </div>

          {/* Total Cholesterol */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{t.prevent.totalChol}</label>
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                {(totalCholMmol * 38.67).toFixed(0)} mg/dL
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={totalCholMmol}
                onChange={(e) => setTotalCholMmol(Number(e.target.value))}
                onBlur={() => handleRecalculate({ total_cholesterol_mmol: Number(totalCholMmol) })}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 font-mono outline-none focus:border-zinc-500"
              />
              <span className="absolute right-3 top-2.5 text-xs text-zinc-400 dark:text-zinc-500 font-sans">
                mmol/L
              </span>
            </div>
          </div>

          {/* HDL Cholesterol */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{t.prevent.hdlChol}</label>
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                {(hdlCholMmol * 38.67).toFixed(0)} mg/dL
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={hdlCholMmol}
                onChange={(e) => setHdlCholMmol(Number(e.target.value))}
                onBlur={() => handleRecalculate({ hdl_cholesterol_mmol: Number(hdlCholMmol) })}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 font-mono outline-none focus:border-zinc-500"
              />
              <span className="absolute right-3 top-2.5 text-xs text-zinc-400 dark:text-zinc-500 font-sans">
                mmol/L
              </span>
            </div>
          </div>

          {/* Systolic BP */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{t.prevent.sbp}</label>
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">SBP</span>
            </div>
            <div className="relative">
              <input
                type="number"
                value={systolicBp}
                onChange={(e) => setSystolicBp(Number(e.target.value))}
                onBlur={() => handleRecalculate({ systolic_bp: Number(systolicBp) })}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 font-mono outline-none focus:border-zinc-500"
              />
              <span className="absolute right-3 top-2.5 text-xs text-zinc-400 dark:text-zinc-500 font-sans">
                mmHg
              </span>
            </div>
          </div>

          {/* BMI */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{t.patientCard.bmi}</label>
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">kg/m²</span>
            </div>
            <input
              type="number"
              step="0.1"
              value={bmi}
              onChange={(e) => setBmi(Number(e.target.value))}
              onBlur={() => handleRecalculate({ bmi: Number(bmi) })}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 font-mono outline-none focus:border-zinc-500"
            />
          </div>

          {/* eGFR / Creatinine */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{t.prevent.egfr}</label>
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{creatinineUmol} µmol/L</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={egfr}
                onChange={(e) => setEgfr(Number(e.target.value))}
                onBlur={() => handleRecalculate({ egfr: Number(egfr) })}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 font-mono outline-none focus:border-zinc-500"
              />
              <span className="absolute right-3 top-2.5 text-xs text-zinc-400 dark:text-zinc-500 font-sans">
                ml/min
              </span>
            </div>
          </div>

          {/* Creatinine */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {language === "ru" ? "Креатинин сыворотки" : "Serum Creatinine"}
              </label>
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">µmol/L</span>
            </div>
            <input
              type="number"
              step="0.1"
              value={creatinineUmol}
              onChange={(e) => setCreatinineUmol(Number(e.target.value))}
              onBlur={() => handleRecalculate({ creatinine_umol: Number(creatinineUmol) })}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 font-mono outline-none focus:border-zinc-500"
            />
          </div>
        </div>

        {/* Toggles / Clinical Switches */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Diabetes */}
          <label className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition">
            <input
              type="checkbox"
              checked={hasDiabetes}
              onChange={(e) => {
                const val = e.target.checked;
                setHasDiabetes(val);
                handleRecalculate({ has_diabetes: val });
              }}
              className="w-4 h-4 rounded text-rose-500 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 focus:ring-0"
            />
            <div>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{t.prevent.diabetes}</p>
              <p className="text-[11px] text-zinc-500">
                {language === "ru" ? "Гликемический статус" : "Glycemic status"}
              </p>
            </div>
          </label>

          {/* Smoking */}
          <label className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition">
            <input
              type="checkbox"
              checked={currentSmoker}
              onChange={(e) => {
                const val = e.target.checked;
                setCurrentSmoker(val);
                handleRecalculate({ current_smoker: val });
              }}
              className="w-4 h-4 rounded text-rose-500 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 focus:ring-0"
            />
            <div>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{t.prevent.smoker}</p>
              <p className="text-[11px] text-zinc-500">
                {language === "ru" ? "Текущий курильщик" : "Tobacco use"}
              </p>
            </div>
          </label>

          {/* HTN meds */}
          <label className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition">
            <input
              type="checkbox"
              checked={onHtnMeds}
              onChange={(e) => {
                const val = e.target.checked;
                setOnHtnMeds(val);
                handleRecalculate({ on_htn_meds: val });
              }}
              className="w-4 h-4 rounded text-rose-500 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 focus:ring-0"
            />
            <div>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{t.prevent.antihypertensive}</p>
              <p className="text-[11px] text-zinc-500">
                {language === "ru" ? "Прием препаратов от АД" : "Blood pressure therapy"}
              </p>
            </div>
          </label>

          {/* Statins */}
          <label className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition">
            <input
              type="checkbox"
              checked={onCholesterolMeds}
              onChange={(e) => {
                const val = e.target.checked;
                setOnCholesterolMeds(val);
                handleRecalculate({ on_cholesterol_meds: val });
              }}
              className="w-4 h-4 rounded text-rose-500 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 focus:ring-0"
            />
            <div>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{t.prevent.statins}</p>
              <p className="text-[11px] text-zinc-500">
                {language === "ru" ? "Липидоснижающие препараты" : "Lipid-lowering therapy"}
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Clinical Recommendations & AI Consult Card */}
      {riskResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Guidelines */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-xl space-y-4 transition-colors">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-zinc-300" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {language === "ru" ? "Клинические рекомендации по гайдлайнам AHA/ACC 2023–2024" : "AHA/ACC 2023–2024 Clinical Guidelines & Care Pathways"}
              </h3>
            </div>

            <div className="space-y-2.5">
              {riskResult.recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 mt-1.5 shrink-0" />
                  <p>{rec}</p>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800/80 text-[11px] text-zinc-500">
              {language === "ru" 
                ? "* Расчет риска носит информационный характер и предназначен для содействия врачу в рамках совместного принятия клинических решений (Shared Decision-Making)." 
                : "* Cardiovascular risk calculation is intended for shared clinical decision-making and does not substitute for physician evaluation."}
            </div>
          </div>

          {/* Action Call to AI Doctor */}
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-xl flex flex-col justify-between transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shadow-sm">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {t.prevent.discussInChat}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {language === "ru" 
                  ? "Передайте вычисленные параметры риска калькулятора PREVENT в диалоговое окно для полного клинического разбора с учетом всех анализов, УЗИ и индивидуальной тактики." 
                  : "Forward calculated PREVENT risk parameters into the AI doctor chat for an in-depth clinical consultation incorporating imaging and lab history."}
              </p>
            </div>

            <button
              onClick={handleConsultDoctor}
              className="mt-6 w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-semibold rounded-2xl text-xs flex items-center justify-center gap-2 transition shadow-md"
            >
              <Sparkles className="w-4 h-4" />
              {t.prevent.discussInChat}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
