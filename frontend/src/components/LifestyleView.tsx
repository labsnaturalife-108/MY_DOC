"use client";

import React from "react";
import { 
  Activity, 
  Droplets, 
  Moon, 
  Sun, 
  Heart, 
  Sparkles, 
  Footprints, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  Flame, 
  Smile, 
  TrendingUp, 
  Gauge,
  Thermometer,
  Zap,
  Printer,
  ChevronRight,
  Info
} from "lucide-react";
import { Patient } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";

interface LifestyleViewProps {
  patient: Patient;
  onNavigateToChat?: (prefillQuery?: string) => void;
  onStartNewChatWithQuery?: (query: string, title?: string, autoSend?: boolean) => void;
}

export const LifestyleView: React.FC<LifestyleViewProps> = ({
  patient,
  onNavigateToChat,
  onStartNewChatWithQuery,
}) => {
  const { language, t } = useLanguage();

  const weight = patient.weight || 70;
  const height = patient.height || 175;
  const age = patient.age || 45;
  const isMale = (patient.gender || "").toLowerCase().includes("m") || (patient.gender || "").toLowerCase().includes("муж");
  const bmi = patient.bmi || Number((weight / ((height / 100) * (height / 100))).toFixed(1));

  // Hydration calculation: 32 ml per kg
  const dailyWaterLiters = Number(((weight * 32) / 1000).toFixed(1));
  const dailyGlasses = Math.round((dailyWaterLiters * 1000) / 250);

  // Steps goal based on age & BMI
  let targetSteps = 9000;
  if (age > 65) targetSteps = 7500;
  if (bmi >= 30) targetSteps = 8000;

  // AI habit generator prefill (opens new chat without medical conclusion, autoSend = false)
  const handleConsultAi = () => {
    const sessionTitle = language === "ru" 
      ? "Образ жизни: Персональные рекомендации" 
      : "Lifestyle: Personal Protocol";

    const query = language === "ru"
      ? `Здравствуйте, доктор! Составьте для меня персональную программу здорового образа жизни и расписание полезных привычек на каждый день.

[КРИТИЧЕСКИ ВАЖНО: Пожалуйста, НЕ пишите общее медицинское заключение, разбор анализов и клинические преамбулы. Сразу предоставьте структурированную программу здорового образа жизни и расписание полезных привычек по блокам!]

📊 Мои клинические данные:
- Возраст: ${age} лет, пол: ${isMale ? "мужской" : "женский"}, рост: ${height} см, вес: ${weight} кг, ИМТ: ${bmi}.
- Расчетная суточная норма чистой воды: ~${dailyWaterLiters} л/день (~${dailyGlasses} стаканов по 250 мл).
- Рекомендованная двигательная норма: ~${targetSteps.toLocaleString()} шагов/день.
${patient.chronic_diseases ? `- Диагнозы в анамнезе: ${patient.chronic_diseases}.` : ""}
${patient.current_medications ? `- Принимаемые препараты: ${patient.current_medications}.` : ""}
${patient.allergies ? `- Аллергии / особенности: ${patient.allergies}.` : ""}

Пожалуйста, составьте практический распорядок дня и протокол полезных привычек:
1. Почасовой питьевой режим (от утреннего стакана до вечера).
2. План двигательной активности: аэробное кардио в Пульсовой Зоне 2 (минуты, пульс), силовые нагрузки и бытовая активность (NEAT) после еды.
3. Протокол циркадных ритмов и гигиены сна (подготовка, освещение, температура, утренний солнечный свет).
4. Стресс-менеджмент: дыхательные техники (4-7-8 или квадрат), снижение кортизола и цифровой детокс.
5. Индивидуальный график домашнего мониторинга (АД, пульс, вес).

Начните ответ сразу с практической программы привычек по разделам, БЕЗ медицинских заключений и вступительных диагнозов.`
      : `Hello, Doctor! Please create a personalized healthy lifestyle protocol and daily habit schedule for me.

[CRITICAL: Please DO NOT write a medical conclusion, review of lab tests, or clinical preambles. Directly provide the structured lifestyle routine and habit schedule by blocks!]

📊 My Clinical Profile:
- Age: ${age}, Gender: ${isMale ? "Male" : "Female"}, Height: ${height} cm, Weight: ${weight} kg, BMI: ${bmi}.
- Hydration Target: ~${dailyWaterLiters} L/day (~${dailyGlasses} glasses of 250ml).
- Daily Steps Target: ~${targetSteps.toLocaleString()} steps/day.
${patient.chronic_diseases ? `- Diagnoses: ${patient.chronic_diseases}.` : ""}
${patient.current_medications ? `- Current medications: ${patient.current_medications}.` : ""}
${patient.allergies ? `- Allergies: ${patient.allergies}.` : ""}

Please structure the practical plan:
1. Hourly hydration protocol (from morning activation to evening taper).
2. Physical activity plan: Zone 2 aerobic cardio, resistance routine, and post-meal NEAT movement.
3. Sleep & circadian rhythm hygiene protocol.
4. Stress & cortisol regulation techniques (4-7-8 breathing, digital detox).
5. Home health tracking routine (blood pressure, pulse, weight).

Begin directly with the practical protocol, without medical conclusions.`;

    if (onStartNewChatWithQuery) {
      onStartNewChatWithQuery(query, sessionTitle, false);
    } else if (onNavigateToChat) {
      onNavigateToChat(query);
    }
  };

  // Printable A4 Clinical Lifestyle Plan
  const handlePrintLifestylePlan = () => {
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
      `BMI (ИМТ): ${bmi}`,
      patient.blood_type ? `${language === "ru" ? "Группа крови:" : "Blood group:"} ${patient.blood_type}` : "",
    ]
      .filter(Boolean)
      .join("  •  ");

    const dateStr = new Date().toLocaleString(language === "ru" ? "ru-RU" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>${language === "ru" ? "Программа образа жизни" : "Lifestyle Protocol"} - ${patientName}</title>
        <style>
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm 12mm;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 8.5pt;
            line-height: 1.35;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0891b2;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .logo-title {
            font-size: 14pt;
            font-weight: 800;
            color: #0e7490;
            letter-spacing: -0.5px;
          }
          .doc-subtitle {
            font-size: 8pt;
            color: #475569;
            font-weight: 600;
            margin-top: 1px;
            text-transform: uppercase;
          }
          .header-meta {
            text-align: right;
            font-size: 7.5pt;
            color: #64748b;
          }
          .patient-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 7px;
            padding: 8px 10px;
            margin-bottom: 10px;
          }
          .patient-name {
            font-size: 11pt;
            font-weight: 700;
            color: #0f172a;
          }
          .patient-meta {
            font-size: 8pt;
            color: #475569;
            margin-top: 2px;
          }
          .targets-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 10px;
          }
          .target-card {
            background: #ecfeff;
            border: 1px solid #a5f3fc;
            border-radius: 6px;
            padding: 6px 8px;
            text-align: center;
          }
          .target-val {
            font-size: 13pt;
            font-weight: 800;
            color: #0e7490;
            line-height: 1.1;
          }
          .target-lbl {
            font-size: 7pt;
            color: #155e75;
            font-weight: 700;
            text-transform: uppercase;
            margin-top: 2px;
          }
          .target-sub {
            font-size: 6.8pt;
            color: #64748b;
            margin-top: 1px;
          }
          .section {
            margin-bottom: 9px;
            border: 1px solid #e2e8f0;
            border-radius: 7px;
            overflow: hidden;
          }
          .section-head {
            background: #f1f5f9;
            padding: 5px 9px;
            font-size: 8.5pt;
            font-weight: 700;
            color: #0f172a;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .section-head-badge {
            font-size: 7pt;
            background: #e0f2fe;
            color: #0369a1;
            padding: 1px 6px;
            border-radius: 4px;
            font-weight: 600;
          }
          .section-body {
            padding: 7px 9px;
            background: #ffffff;
          }
          .pillar-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .pillar-item {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 5px;
            padding: 5px 7px;
          }
          .pillar-title {
            font-size: 8pt;
            font-weight: 700;
            color: #0e7490;
            margin-bottom: 3px;
          }
          .pillar-text {
            font-size: 7.5pt;
            color: #334155;
            line-height: 1.3;
          }
          .rule-list {
            margin: 0;
            padding-left: 14px;
            font-size: 7.5pt;
            color: #334155;
            line-height: 1.35;
          }
          .rule-list li {
            margin-bottom: 3px;
          }
          .footer-box {
            margin-top: 10px;
            padding-top: 6px;
            border-top: 1px dashed #cbd5e1;
            font-size: 7pt;
            color: #64748b;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <div class="header-row">
          <div>
            <div class="logo-title">MY_DOC • CLINICAL HEALTH</div>
            <div class="doc-subtitle">${language === "ru" ? "Персональная программа образа жизни и расписание привычек" : "Personalized Healthy Lifestyle & Habit Protocol"}</div>
          </div>
          <div class="header-meta">
            <div><strong>${dateStr}</strong></div>
            <div>ID пациента: #${patient.id}</div>
          </div>
        </div>

        <div class="patient-box">
          <div class="patient-name">${patientName}</div>
          <div class="patient-meta">${patientMetrics}</div>
          ${patient.chronic_diseases ? `<div style="font-size: 7.5pt; color: #b91c1c; margin-top: 3px;"><strong>${language === "ru" ? "Хронические диагнозы:" : "Diagnoses:"}</strong> ${patient.chronic_diseases}</div>` : ""}
          ${patient.current_medications ? `<div style="font-size: 7.5pt; color: #475569; margin-top: 2px;"><strong>${language === "ru" ? "Терапия:" : "Medications:"}</strong> ${patient.current_medications}</div>` : ""}
        </div>

        <div class="targets-grid">
          <div class="target-card">
            <div class="target-val">${dailyWaterLiters} ${language === "ru" ? "л" : "L"}</div>
            <div class="target-lbl">${language === "ru" ? "Суточная вода" : "Daily Water"}</div>
            <div class="target-sub">~${dailyGlasses} ${language === "ru" ? "стаканов (32 мл/кг)" : "glasses (32 ml/kg)"}</div>
          </div>
          <div class="target-card">
            <div class="target-val">${targetSteps.toLocaleString()}</div>
            <div class="target-lbl">${language === "ru" ? "Целевые шаги" : "Daily Steps"}</div>
            <div class="target-sub">${language === "ru" ? "шагов в сутки" : "steps / day"}</div>
          </div>
          <div class="target-card">
            <div class="target-val">7.5 - 8.5 ч</div>
            <div class="target-lbl">${language === "ru" ? "Здоровый сон" : "Target Sleep"}</div>
            <div class="target-sub">${language === "ru" ? "отбой до 23:00" : "lights out by 23:00"}</div>
          </div>
          <div class="target-card">
            <div class="target-val">&lt; 120/80</div>
            <div class="target-lbl">${language === "ru" ? "Целевое АД" : "Target BP"}</div>
            <div class="target-sub">${language === "ru" ? "мм рт. ст. (норма)" : "mmHg (optimal)"}</div>
          </div>
        </div>

        <!-- Pillar 1 & 2 -->
        <div class="section">
          <div class="section-head">
            <span>1. ${language === "ru" ? "Питьевой режим (Гидратация)" : "Hydration Protocol"}</span>
            <span class="section-head-badge">${language === "ru" ? "30-35 мл на 1 кг массы тела" : "30-35 ml/kg"}</span>
          </div>
          <div class="section-body">
            <ul class="rule-list">
              <li><strong>${language === "ru" ? "Утренний запуск:" : "Morning jumpstart:"}</strong> ${language === "ru" ? "1 стакан теплой воды (35-40°C) сразу после пробуждения натощак для активации перистальтики ЖКТ и мягкого оттока желчи." : "1 glass of warm water on an empty stomach to kickstart digestion and bile flow."}</li>
              <li><strong>${language === "ru" ? "Равномерность:" : "Pacing:"}</strong> ${language === "ru" ? "Пейте небольшими порциями (по 100-150 мл) каждые 40-60 минут. Избегайте употребления больших объемов залпом." : "Sip 100-150 ml every 40-60 minutes rather than drinking large quantities at once."}</li>
              <li><strong>${language === "ru" ? "Вечерний баланс:" : "Evening taper:"}</strong> ${language === "ru" ? "Ограничьте обильное питье за 1.5-2 часа до отхода ко сну для предотвращения ночных пробуждений и отечности." : "Taper fluids 1.5-2 hours before bedtime to protect unbroken sleep."}</li>
            </ul>
          </div>
        </div>

        <div class="section">
          <div class="section-head">
            <span>2. ${language === "ru" ? "Двигательная активность и тренировочный режим" : "Physical Activity & Training"}</span>
            <span class="section-head-badge">AHA / WHO Guidelines</span>
          </div>
          <div class="section-body">
            <div class="pillar-grid">
              <div class="pillar-item">
                <div class="pillar-title">${language === "ru" ? "Кардио Пульсовая Зона 2" : "Zone 2 Aerobic Cardio"}</div>
                <div class="pillar-text">${language === "ru" ? "150 минут в неделю (быстрая ходьба, плавание, велотренажер) при пульсе 60-70% от максимального. Стимулирует митохондриальный биогенез и окисление липидов." : "150 min/week brisk walking or cycling at 60-70% max heart rate to enhance mitochondrial fat oxidation."}</div>
              </div>
              <div class="pillar-item">
                <div class="pillar-title">${language === "ru" ? "Силовые нагрузки и NEAT" : "Resistance Routine & NEAT"}</div>
                <div class="pillar-text">${language === "ru" ? "2-3 раза в неделю для сохранения мышечной массы и чувствительности к инсулину. Легкая прогулка 10-15 минут после основных приемов пищи сглаживает скачки глюкозы." : "2-3 strength sessions weekly to support muscle mass and insulin sensitivity. 10-15 min post-meal walks blunt glucose spikes."}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pillar 3 & 4 -->
        <div class="section">
          <div class="section-head">
            <span>3. ${language === "ru" ? "Сон и циркадные биоритмы" : "Sleep & Circadian Rhythm"}</span>
            <span class="section-head-badge">${language === "ru" ? "Фазы глубокого сна" : "Deep Sleep Phases"}</span>
          </div>
          <div class="section-body">
            <ul class="rule-list">
              <li><strong>${language === "ru" ? "Режим:" : "Schedule:"}</strong> ${language === "ru" ? "Отход ко сну строго до 23:00, подъем в одно и то же время в будни и выходные (разница не более 30 минут)." : "Lights out before 23:00, consistent waking time across both weekdays and weekends."}</li>
              <li><strong>${language === "ru" ? "Световая синхронизация:" : "Light synchronization:"}</strong> ${language === "ru" ? "Яркий естественный дневной свет в первые 30 минут после пробуждения для подавления мелатонина и запуска бодрости." : "Natural sunlight exposure within 30 min of waking resets the master circadian clock."}</li>
              <li><strong>${language === "ru" ? "Гигиена спальни:" : "Bedroom hygiene:"}</strong> ${language === "ru" ? "Прохладная температура (18-20°C), полная темнота (шторы blackout), отказ от синих экранов смартфонов/ТВ за 1 час до сна." : "Cool bedroom (18-20°C), blackout dark, zero screens for 60 min prior to sleep."}</li>
            </ul>
          </div>
        </div>

        <div class="section">
          <div class="section-head">
            <span>4. ${language === "ru" ? "Стресс-менеджмент и клинический самоконтроль" : "Stress Regulation & Monitoring"}</span>
            <span class="section-head-badge">${language === "ru" ? "Регуляция блуждающего нерва" : "Vagal Tone"}</span>
          </div>
          <div class="section-body">
            <div class="pillar-grid">
              <div class="pillar-item">
                <div class="pillar-title">${language === "ru" ? "Дыхание 4-7-8 и квадратное дыхание" : "4-7-8 & Box Breathing"}</div>
                <div class="pillar-text">${language === "ru" ? "Вдох 4 сек, пауза 7 сек, выдох 8 сек (или квадрат 4-4-4-4). Активирует парасимпатический тонус, быстро снижает острый кортизол и частоту пульса." : "Inhale 4s, hold 7s, exhale 8s to engage the parasympathetic nervous system and mitigate cortisol."}</div>
              </div>
              <div class="pillar-item">
                <div class="pillar-title">${language === "ru" ? "Домашний мониторинг" : "Home Vital Tracking"}</div>
                <div class="pillar-text">${language === "ru" ? "Регулярный замер АД и пульса утром и вечером в состоянии покоя. Фиксация массы тела 1 раз в неделю натощак." : "Routine morning & evening resting blood pressure tracking, weekly fasting weight checks."}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="footer-box">
          <div>MY_DOC Clinical Platform • ${language === "ru" ? "Рекомендации соответствуют стандартам кардиометаболической профилактики (AHA/ESC)" : "Guidelines align with cardiometabolic prevention standards (AHA/ESC)"}</div>
          <div>${language === "ru" ? "При острых симптомах проконсультируйтесь с лечащим врачом" : "Consult your physician for acute symptoms"}</div>
        </div>
      </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(html);
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
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Activity className="w-4 h-4" />
            <span>{t.lifestyle.title}</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {t.lifestyle.title}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t.lifestyle.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">
          <button
            onClick={handlePrintLifestylePlan}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-zinc-250 dark:border-zinc-700 bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 transition shadow-2xs shrink-0 cursor-pointer"
            title={t.lifestyle?.savePdfTooltip || (language === "ru" ? "Сохранить программу образа жизни в PDF / Распечатать" : "Save lifestyle protocol to PDF / Print")}
          >
            <Printer className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>{t.lifestyle?.savePdfBtn || (language === "ru" ? "Сохранить в PDF" : "Save to PDF")}</span>
          </button>

          <button
            onClick={handleConsultAi}
            className="flex items-center gap-3 px-4.5 py-2.5 rounded-2xl text-sm font-semibold border border-cyan-500/30 dark:border-cyan-500/30 bg-cyan-500/10 dark:bg-cyan-500/15 hover:bg-cyan-500/20 dark:hover:bg-cyan-500/25 text-cyan-950 dark:text-cyan-100 backdrop-blur-md shadow-sm transition-all hover:scale-[1.01] shrink-0 cursor-pointer"
          >
            <Sparkles className="w-5 h-5 text-yellow-500 dark:text-yellow-400 shrink-0" />
            <div className="flex flex-col text-left">
              <span className="font-bold text-sm leading-tight text-cyan-900 dark:text-cyan-200">
                {t.lifestyle.askAiButton}
              </span>
              <span className="text-[11px] font-normal text-cyan-700/80 dark:text-cyan-300/80">
                {language === "ru" ? "• откроется диалог с готовым запросом" : "• opens dialogue with ready prompt"}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Grid: Hydration & Physical Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Hydration Protocol */}
        <div className="bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-900/40 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-blue-100 dark:border-blue-900/40">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold text-sm">
                <Droplets className="w-5 h-5 text-blue-500" />
                <span>{t.lifestyle.hydrationTitle}</span>
              </div>
              <span className="text-[11px] font-mono bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                {t.lifestyle.hydrationFormula}
              </span>
            </div>

            {/* Target Display */}
            <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 mb-4">
              <span className="text-xs font-semibold text-blue-800 dark:text-blue-300 block mb-1">
                {t.lifestyle.hydrationTarget}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-blue-950 dark:text-blue-100 font-mono">
                  {dailyWaterLiters}
                </span>
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  {t.lifestyle.litersPerDay}
                </span>
                <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">
                  (~{dailyGlasses} {t.lifestyle.glasses})
                </span>
              </div>
            </div>

            {/* Water Glasses visual indicators */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Array.from({ length: Math.min(10, dailyGlasses) }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 text-xs font-bold"
                  title={`Стакан ${i + 1} (250 мл)`}
                >
                  <Droplets className="w-4 h-4" />
                </div>
              ))}
            </div>

            {/* Practical Rules */}
            <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  {language === "ru"
                    ? "Утренний запуск: 1 стакан теплой воды (35-40°C) натощак для активации ЖКТ и лимфотока."
                    : "Morning hydration: 1 glass of warm water on an empty stomach to activate digestion."}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  {language === "ru"
                    ? "Равномерность: пейте небольшими порциями (по 100-150 мл) каждые 40-60 минут."
                    : "Pacing: sip small portions (100-150 ml) every 40-60 minutes rather than large chugs."}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  {language === "ru"
                    ? "Перед сном: ограничьте обильное питье за 1.5-2 часа до сна для непрерывного сна."
                    : "Evening cutoff: taper fluids 1.5-2 hours before sleep to prevent nighttime awakenings."}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Physical Activity & Steps */}
        <div className="bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-emerald-100 dark:border-emerald-900/40">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                <Footprints className="w-5 h-5 text-emerald-500" />
                <span>{t.lifestyle.activityTitle}</span>
              </div>
              <span className="text-[11px] font-mono bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                AHA / WHO Guidelines
              </span>
            </div>

            {/* Target Steps Display */}
            <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 mb-4">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 block mb-1">
                {t.lifestyle.stepsTarget}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-950 dark:text-emerald-100 font-mono">
                  {targetSteps.toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  {t.lifestyle.stepsPerDay}
                </span>
              </div>
            </div>

            {/* Activity Pillars */}
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/80">
                <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>{t.lifestyle.cardioTitle}</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {t.lifestyle.cardioDesc}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/80">
                <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                  <Zap className="w-3.5 h-3.5 text-blue-500" />
                  <span>{t.lifestyle.strengthTitle}</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {t.lifestyle.strengthDesc}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/80">
                <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{t.lifestyle.neatTitle}</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {t.lifestyle.neatDesc}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Sleep & Circadian Rhythms, Stress Management, Home Monitoring */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sleep & Circadian Rhythms */}
        <div className="bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-900/40 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-sm mb-4 pb-2 border-b border-indigo-100 dark:border-indigo-900/40">
              <Moon className="w-5 h-5 text-indigo-500" />
              <span>{t.lifestyle.sleepTitle}</span>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 mb-3">
              <span className="text-[11px] font-semibold text-indigo-800 dark:text-indigo-300 block mb-0.5">
                {t.lifestyle.sleepDuration}
              </span>
              <span className="text-xl font-black text-indigo-950 dark:text-indigo-100 font-mono">
                {t.lifestyle.sleepHours}
              </span>
            </div>

            <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <p>
                <strong className="text-zinc-800 dark:text-zinc-200">
                  {language === "ru" ? "Режим: " : "Schedule: "}
                </strong>
                {t.lifestyle.sleepSchedule}
              </p>
              <p>
                <strong className="text-zinc-800 dark:text-zinc-200">
                  {language === "ru" ? "Гигиена: " : "Hygiene: "}
                </strong>
                {t.lifestyle.sleepHygiene}
              </p>
            </div>
          </div>
        </div>

        {/* Stress & Recovery */}
        <div className="bg-white dark:bg-zinc-900 border border-teal-200 dark:border-teal-900/40 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-bold text-sm mb-4 pb-2 border-b border-teal-100 dark:border-teal-900/40">
              <Smile className="w-5 h-5 text-teal-500" />
              <span>{t.lifestyle.stressTitle}</span>
            </div>

            <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/40">
                <span className="font-bold text-teal-950 dark:text-teal-100 block mb-1">
                  {language === "ru" ? "Дыхание 4-7-8 и квадратное дыхание:" : "4-7-8 & Box Breathing:"}
                </span>
                <span>
                  {language === "ru"
                    ? "Вдох 4 сек, задержка 7 сек, выдох 8 сек. Активирует парасимпатическую нервную систему и снижает кортизол."
                    : "Inhale 4s, hold 7s, exhale 8s. Activates parasympathetic tone and lowers cortisol."}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/40">
                <span className="font-bold text-teal-950 dark:text-teal-100 block mb-1">
                  {language === "ru" ? "Цифровой детокс:" : "Digital boundary:"}
                </span>
                <span>
                  {language === "ru"
                    ? "Минимум 1 час без новостей и рабочих чатов перед сном для снижения симпатической гипервозбудимости."
                    : "No news feeds or work emails 1 hour before bed to curb sympathetic hyperarousal."}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Home Monitoring */}
        <div className="bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm mb-4 pb-2 border-b border-rose-100 dark:border-rose-900/40">
              <Gauge className="w-5 h-5 text-rose-500" />
              <span>{t.lifestyle.monitoringTitle}</span>
            </div>

            <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
                <span className="font-bold text-rose-950 dark:text-rose-100 block mb-0.5">
                  {language === "ru" ? "Артериальное давление и пульс:" : "Blood pressure & pulse:"}
                </span>
                <span>{t.lifestyle.bpMonitoring}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
                <span className="font-bold text-rose-950 dark:text-rose-100 block mb-0.5">
                  {language === "ru" ? "Гликемия и вес:" : "Glucose & weight:"}
                </span>
                <span>{t.lifestyle.glucoseMonitoring}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
          <span>
            {language === "ru" 
              ? "Персональные нормы рассчитаны на основе вашего профиля здоровья" 
              : "Personalized targets calculated from your health profile"}
          </span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handlePrintLifestylePlan}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-zinc-250 dark:border-zinc-700 bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 transition shadow-2xs cursor-pointer"
            title={t.lifestyle?.savePdfTooltip || (language === "ru" ? "Сохранить программу в PDF / Распечатать" : "Save lifestyle protocol to PDF / Print")}
          >
            <Printer className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>{t.lifestyle?.savePdfBtn || (language === "ru" ? "Сохранить в PDF" : "Save to PDF")}</span>
          </button>

          <button
            onClick={handleConsultAi}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-cyan-500/30 dark:border-cyan-500/30 bg-cyan-500/10 dark:bg-cyan-500/15 hover:bg-cyan-500/20 dark:hover:bg-cyan-500/25 text-cyan-900 dark:text-cyan-200 backdrop-blur-md shadow-sm transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-500 dark:text-yellow-400" />
            <span>
              {language === "ru" 
                ? "Разработать программу с AI-доктором" 
                : "Create Habit Plan with AI Doctor"}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
