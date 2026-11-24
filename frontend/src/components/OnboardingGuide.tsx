"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  User,
  FolderOpen,
  LineChart,
  Utensils,
  Activity,
  HeartPulse,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Check
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface OnboardingGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: string) => void;
  onOpenSettings?: () => void;
}

interface GuideStep {
  id: string;
  tab?: string;
  icon: React.ReactNode;
  accent: string;
  titleRu: string;
  titleEn: string;
  descRu: string;
  descEn: string;
  tipRu: string;
  tipEn: string;
}

const GUIDE_STEPS: GuideStep[] = [
  {
    id: "chat",
    tab: "chat",
    icon: <MessageSquare className="w-5 h-5" />,
    accent: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    titleRu: "Чат с ИИ-доктором",
    titleEn: "AI Doctor Consultation",
    descRu:
      "Задавайте любые медицинские вопросы — ассистент автоматически учитывает карту пациента, все загруженные анализы и актуальные исследования из PubMed.",
    descEn:
      "Ask any medical question — the assistant automatically uses the patient profile, uploaded lab results, and peer-reviewed PubMed studies.",
    tipRu: "Вверху чата можно выбрать любую модель (Gemini, GPT-4o, Claude, DeepSeek, Grok, Qwen) и сохранить ответ в PDF кнопкой принтера.",
    tipEn: "Choose any AI model at the top of the chat (Gemini, GPT-4o, Claude, DeepSeek, Grok, Qwen) and export any reply to PDF."
  },
  {
    id: "profile",
    tab: "profile",
    icon: <User className="w-5 h-5" />,
    accent: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/25",
    titleRu: "Карта пациента",
    titleEn: "Patient Profile Card",
    descRu:
      "Здесь хранятся ключевые данные: рост, вес (ИМТ рассчитывается автоматически), группа крови, критические аллергии, хронические заболевания и текущие препараты.",
    descEn:
      "Stores key clinical info: height, weight (auto BMI), blood type, critical allergies, chronic conditions, and current medications.",
    tipRu: "Чем подробнее заполнена карта, тем точнее и безопаснее будут рекомендации ИИ-доктора.",
    tipEn: "The more complete the profile, the safer and more personalized the AI Doctor's recommendations will be."
  },
  {
    id: "folders",
    tab: "folders",
    icon: <FolderOpen className="w-5 h-5" />,
    accent: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/25",
    titleRu: "Папки и загрузка анализов",
    titleEn: "Folders & Document Upload",
    descRu:
      "Загружайте PDF-бланки, фотографии анализов крови, УЗИ, МРТ и выписки врачей. Система сама распознаёт текст (включая фото и сканы) и извлекает числовые показатели.",
    descEn:
      "Upload PDF lab reports, photos, ultrasound/MRI scans, and doctor notes. The system automatically OCRs text and extracts biomarkers.",
    tipRu: "Можно выделять и загружать сразу несколько файлов одним действием.",
    tipEn: "You can select and upload multiple lab reports at once."
  },
  {
    id: "labs",
    tab: "labs",
    icon: <LineChart className="w-5 h-5" />,
    accent: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/25",
    titleRu: "Динамика анализов",
    titleEn: "Lab Dynamics & Charts",
    descRu:
      "Все извлечённые показатели автоматически группируются по панелям (ОАК, Биохимия, Липиды, Гормоны, Витамины и микроэлементы) и строятся в наглядные графики с нормами.",
    descEn:
      "Extracted biomarkers are organized by panel (CBC, CMP, Lipids, Hormones, Vitamins & Microelements) with interactive trend charts and reference ranges.",
    tipRu: "Вы также можете добавлять любые показатели вручную или нажать «Пересканировать» после добавления API-ключа.",
    tipEn: "You can also add biomarkers manually or click 'Reparse' after configuring an API key."
  },
  {
    id: "nutrition",
    tab: "nutrition",
    icon: <Utensils className="w-5 h-5" />,
    accent: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    titleRu: "Персональное питание",
    titleEn: "Personalized Nutrition",
    descRu:
      "Составляйте индивидуальное меню и план питания с учётом дефицитов по анализам, аллергий, веса и диагнозов пациента.",
    descEn:
      "Generate a tailored meal plan based on lab deficiencies, allergies, BMI, and clinical conditions.",
    tipRu: "Перед отправкой запроса можно выбрать нужную модель ИИ-доктора, а готовое меню распечатать в PDF.",
    tipEn: "Select your preferred AI model before sending, then export the finished meal plan to PDF."
  },
  {
    id: "lifestyle",
    tab: "lifestyle",
    icon: <Activity className="w-5 h-5" />,
    accent: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/25",
    titleRu: "Образ жизни",
    titleEn: "Lifestyle Plan",
    descRu:
      "Персональная программа по физической активности, восстановлению сна, управлению стрессом и профилактическим привычкам на основе ваших данных.",
    descEn:
      "Personalized recommendations for exercise, sleep hygiene, stress management, and preventive habits based on your health profile.",
    tipRu: "Готовый план образа жизни также можно сохранить в PDF одним кликом.",
    tipEn: "Your generated lifestyle plan can also be saved to PDF with one click."
  },
  {
    id: "prevent",
    tab: "prevent",
    icon: <HeartPulse className="w-5 h-5" />,
    accent: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/25",
    titleRu: "Калькулятор рисков PREVENT",
    titleEn: "AHA PREVENT Risk Calculator",
    descRu:
      "Сертифицированный расчёт 10-летнего и 30-летнего сердечно-сосудистого риска (AHA PREVENT 2024). Параметры автоматически подтягиваются из карты и анализов.",
    descEn:
      "Certified 10-year and 30-year cardiovascular risk calculator (AHA PREVENT 2024), auto-filled from your profile and lab results.",
    tipRu: "Вы можете вручную корректировать давление, холестерин и курение, чтобы моделировать снижение риска.",
    tipEn: "Adjust blood pressure, cholesterol, or smoking status interactively to see how risk changes."
  },
  {
    id: "settings",
    icon: <Settings className="w-5 h-5" />,
    accent: "text-zinc-700 dark:text-zinc-200 bg-zinc-500/10 border-zinc-500/25",
    titleRu: "Настройки и API-ключи",
    titleEn: "Settings & API Keys",
    descRu:
      "Нажмите на шестерёнку в левой панели, чтобы ввести свои API-ключи (Gemini, OpenAI, Claude, DeepSeek, Grok, Qwen) для полноценной работы ИИ-доктора и OCR распознавания фото.",
    descEn:
      "Click the gear icon in the sidebar to add your API keys (Gemini, OpenAI, Claude, DeepSeek, Grok, Qwen) for full AI consultations and Vision OCR.",
    tipRu: "Этот гайд всегда можно открыть снова, нажав на значок «?» в правом верхнем углу экрана.",
    tipEn: "You can reopen this guide anytime by clicking the '?' icon in the top-right corner."
  }
];

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onOpenSettings
}) => {
  const { language } = useLanguage();
  const isRu = language === "ru";
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setStepIndex(0);
      if (GUIDE_STEPS[0].tab) {
        onSelectTab(GUIDE_STEPS[0].tab);
      }
    }
  }, [isOpen]);

  const goToStep = (idx: number) => {
    const clamped = Math.max(0, Math.min(GUIDE_STEPS.length - 1, idx));
    setStepIndex(clamped);
    const targetTab = GUIDE_STEPS[clamped].tab;
    if (targetTab) {
      onSelectTab(targetTab);
    }
  };

  if (!isOpen) return null;

  const step = GUIDE_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === GUIDE_STEPS.length - 1;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[410px] max-w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-300 dark:border-zinc-700/90 rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-300"
            style={{ width: `${((stepIndex + 1) / GUIDE_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${step.accent}`}>
              {step.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>
                  {isRu
                    ? `Гид по MY_DOC • Шаг ${stepIndex + 1} из ${GUIDE_STEPS.length}`
                    : `MY_DOC Tour • Step ${stepIndex + 1} of ${GUIDE_STEPS.length}`}
                </span>
              </div>
              <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 truncate mt-0.5">
                {isRu ? step.titleRu : step.titleEn}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            title={isRu ? "Закрыть гайд" : "Close guide"}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-4 space-y-3">
          <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
            {isRu ? step.descRu : step.descEn}
          </p>

          <div className="p-2.5 rounded-xl bg-zinc-100/90 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
            💡 {isRu ? step.tipRu : step.tipEn}
          </div>

          {step.id === "settings" && onOpenSettings && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center gap-1.5 transition"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{isRu ? "Открыть настройки API" : "Open API Settings"}</span>
            </button>
          )}
        </div>

        {/* Footer Controls: Skip (left) | Step Dots (center) | Arrows (right) */}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/60 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition whitespace-nowrap"
          >
            {isRu ? "Пропустить гайд" : "Skip guide"}
          </button>

          {/* Clickable Step Dots */}
          <div className="flex items-center gap-1.5">
            {GUIDE_STEPS.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goToStep(idx)}
                title={isRu ? s.titleRu : s.titleEn}
                className={`h-1.5 rounded-full transition-all ${
                  idx === stepIndex
                    ? "w-5 bg-zinc-900 dark:bg-zinc-100"
                    : "w-1.5 bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-500"
                }`}
              />
            ))}
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isFirst}
              onClick={() => goToStep(stepIndex - 1)}
              title={isRu ? "Назад" : "Previous"}
              className="p-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {isLast ? (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 text-xs font-semibold flex items-center gap-1 transition shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isRu ? "Готово" : "Done"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => goToStep(stepIndex + 1)}
                title={isRu ? "Далее" : "Next"}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 text-xs font-semibold flex items-center gap-0.5 transition shadow-xs"
              >
                <span>{isRu ? "Далее" : "Next"}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
