"use client";

import React, { useState } from "react";
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
  Zap
} from "lucide-react";
import { Patient } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";

interface LifestyleViewProps {
  patient: Patient;
  onNavigateToChat?: (prefillQuery?: string) => void;
}

export const LifestyleView: React.FC<LifestyleViewProps> = ({
  patient,
  onNavigateToChat,
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

  // AI habit generator prefill
  const handleConsultAi = () => {
    const query = language === "ru"
      ? `Здравствуйте, доктор! Составьте для меня персональную программу здорового образа жизни и расписание полезных привычек на день.
Клинический профиль: возраст ${age} лет, пол ${isMale ? "мужской" : "женский"}, рост ${height} см, вес ${weight} кг, ИМТ ${bmi}.
Целевые показатели: норма чистой воды ~${dailyWaterLiters} л/день (${dailyGlasses} стаканов), цель по шагам ~${targetSteps.toLocaleString()} шагов/день.
${patient.chronic_diseases ? `Мои хронические диагнозы: ${patient.chronic_diseases}.` : ""}
${patient.current_medications ? `Принимаемые препараты: ${patient.current_medications}.` : ""}
Включите в план:
1. Почасовой режим гидратации.
2. Программу аэробных тренировок Zone 2 и силовой активности.
3. Протокол гигиены сна и циркадных ритмов.
4. Техники снижения кортизола и стресс-менеджмента.`
      : `Hello, Doctor! Please create a personalized healthy lifestyle protocol and daily habit schedule for me.
Profile: age ${age}, gender ${isMale ? "male" : "female"}, height ${height} cm, weight ${weight} kg, BMI ${bmi}.
Calculated targets: clean water intake ~${dailyWaterLiters} L/day (${dailyGlasses} glasses), daily steps goal ~${targetSteps.toLocaleString()} steps/day.
${patient.chronic_diseases ? `Chronic conditions: ${patient.chronic_diseases}.` : ""}
${patient.current_medications ? `Current medications: ${patient.current_medications}.` : ""}
Please include:
1. Hourly hydration schedule.
2. Zone 2 aerobic cardio and resistance routine.
3. Sleep hygiene and circadian rhythm protocol.
4. Stress & cortisol regulation practices.`;

    if (onNavigateToChat) {
      onNavigateToChat(query);
    }
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

        <button
          onClick={handleConsultAi}
          className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-cyan-600/20 transition shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>{t.lifestyle.askAiButton}</span>
        </button>
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
    </div>
  );
};
