"use client";

import React, { useState, useEffect } from "react";
import { 
  Utensils, 
  Apple, 
  Salad, 
  Flame, 
  Heart, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Sparkles, 
  MessageSquare, 
  Droplet, 
  Scale, 
  Activity, 
  ShieldCheck, 
  ShieldAlert,
  ChevronRight,
  Milk,
  Beef,
  Leaf
} from "lucide-react";
import { Patient, LabMetric, api } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";

export type DietType = "omnivore" | "vegetarian" | "vegan";

interface NutritionViewProps {
  patient: Patient;
  onNavigateToChat?: (prefillQuery?: string) => void;
}

export const NutritionView: React.FC<NutritionViewProps> = ({
  patient,
  onNavigateToChat,
}) => {
  const { language, t } = useLanguage();
  const [dietType, setDietType] = useState<DietType>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`mydoc_diet_${patient.id}`);
      if (saved === "vegetarian" || saved === "vegan" || saved === "omnivore") {
        return saved;
      }
    }
    return "omnivore";
  });

  const [metrics, setMetrics] = useState<LabMetric[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoadingMetrics(true);
        const data = await api.getLabMetrics(patient.id);
        setMetrics(data || []);
      } catch (err) {
        console.error("Failed to load metrics for nutrition view:", err);
      } finally {
        setLoadingMetrics(false);
      }
    };
    fetchMetrics();
  }, [patient.id]);

  const handleSelectDiet = (type: DietType) => {
    setDietType(type);
    if (typeof window !== "undefined") {
      localStorage.setItem(`mydoc_diet_${patient.id}`, type);
    }
  };

  // Clinical calculation: Energy & Macros
  const weight = patient.weight || 70;
  const height = patient.height || 175;
  const age = patient.age || 45;
  const isMale = (patient.gender || "").toLowerCase().includes("m") || (patient.gender || "").toLowerCase().includes("муж");
  const bmi = patient.bmi || Number((weight / ((height / 100) * (height / 100))).toFixed(1));

  // Mifflin-St Jeor BMR
  const bmr = isMale
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;

  // Sedentary / moderate activity factor
  const tdee = Math.round(bmr * 1.35);

  // Target calories based on BMI
  let targetCalories = tdee;
  let caloricGoalLabel = language === "ru" ? "Поддержание веса" : "Weight maintenance";
  if (bmi >= 25 && bmi < 30) {
    targetCalories = Math.round(tdee * 0.85); // 15% deficit for overweight
    caloricGoalLabel = language === "ru" ? "Плавное снижение веса (дефицит 15%)" : "Gradual weight loss (-15% deficit)";
  } else if (bmi >= 30) {
    targetCalories = Math.round(tdee * 0.80); // 20% deficit for obesity
    caloricGoalLabel = language === "ru" ? "Терапевтический дефицит (20%)" : "Therapeutic weight loss (-20% deficit)";
  } else if (bmi < 18.5) {
    targetCalories = Math.round(tdee * 1.15);
    caloricGoalLabel = language === "ru" ? "Восстановление массы тела (+15%)" : "Lean mass gain (+15%)";
  }

  // Macronutrients distribution:
  // Protein: 1.3 g/kg for optimal metabolic preservation
  const targetProteinGrams = Math.round(weight * 1.3);
  const proteinKcal = targetProteinGrams * 4;

  // Fat: 30% of total target calories
  const fatKcal = Math.round(targetCalories * 0.30);
  const targetFatGrams = Math.round(fatKcal / 9);

  // Carbs: Remaining calories
  const carbsKcal = Math.max(0, targetCalories - proteinKcal - fatKcal);
  const targetCarbsGrams = Math.round(carbsKcal / 4);

  // Detect clinical lab markers
  const latestGlucose = metrics.find((m) => m.metric_name.toLowerCase().includes("глюкоз") || m.metric_name.toLowerCase().includes("glucose"));
  const latestChol = metrics.find((m) => m.metric_name.toLowerCase().includes("холестерин") || m.metric_name.toLowerCase().includes("cholesterol"));
  const latestLdl = metrics.find((m) => m.metric_name.toLowerCase().includes("лпнп") || m.metric_name.toLowerCase().includes("ldl"));
  const latestEgfr = metrics.find((m) => m.metric_name.toLowerCase().includes("скф") || m.metric_name.toLowerCase().includes("egfr"));
  const latestUricAcid = metrics.find((m) => m.metric_name.toLowerCase().includes("мочевая кислота") || m.metric_name.toLowerCase().includes("uric"));

  // Check clinical conditions
  const hasElevatedGlucose = latestGlucose && (latestGlucose.value > 5.6 || latestGlucose.status === "high");
  const hasElevatedCholesterol = (latestChol && latestChol.value > 5.2) || (latestLdl && latestLdl.value > 3.0);
  const hasLowEgfr = latestEgfr && latestEgfr.value < 60;
  const hasHighUricAcid = latestUricAcid && (latestUricAcid.value > 420 || latestUricAcid.status === "high");

  // Chat prefill generator
  const handleConsultAi = () => {
    const dietName = 
      dietType === "omnivore" 
        ? (language === "ru" ? "Всеядный" : "Omnivore")
        : dietType === "vegetarian"
        ? (language === "ru" ? "Вегетарианец (лакто: ем творог, сыр и йогурт, но не ем яйца, мясо и рыбу)" : "Lacto-vegetarian (consumes dairy, strictly no meat, fish, or eggs)")
        : (language === "ru" ? "Веган (100% растительный рацион)" : "Vegan (100% plant-based)");

    const query = language === "ru"
      ? `Здравствуйте, доктор! Составьте для меня подробный персонализированный план питания и пример меню на неделю.
Мой тип рациона: ${dietName}.
Клинические данные: возраст ${age} лет, пол ${isMale ? "мужской" : "женский"}, рост ${height} см, вес ${weight} кг, ИМТ ${bmi}.
Суточная норма: ~${targetCalories} ккал (Белки ${targetProteinGrams}г, Жиры ${targetFatGrams}г, Углеводы ${targetCarbsGrams}г).
${patient.chronic_diseases ? `Диагнозы: ${patient.chronic_diseases}.` : ""}
${patient.allergies ? `Аллергии/непереносимости: ${patient.allergies}.` : ""}
${hasElevatedGlucose ? "Обратите внимание: повышен уровень глюкозы крови." : ""}
${hasElevatedCholesterol ? "Обратите внимание: повышен холестерин/ЛПНП." : ""}
Учтите правила моего рациона (если лакто-вегетарианец — никаких яиц и рыбы, но приветствуются творог и качественный сыр; если веган — без любых животных продуктов).`
      : `Hello, Doctor! Please design a detailed personalized nutrition plan and a 7-day meal plan for me.
My dietary pattern: ${dietName}.
Clinical profile: age ${age}, gender ${isMale ? "male" : "female"}, height ${height} cm, weight ${weight} kg, BMI ${bmi}.
Calculated targets: ~${targetCalories} kcal (Proteins ${targetProteinGrams}g, Fats ${targetFatGrams}g, Carbs ${targetCarbsGrams}g).
${patient.chronic_diseases ? `Diagnoses: ${patient.chronic_diseases}.` : ""}
${patient.allergies ? `Allergies: ${patient.allergies}.` : ""}
${hasElevatedGlucose ? "Note: elevated fasting blood glucose." : ""}
${hasElevatedCholesterol ? "Note: elevated cholesterol/LDL." : ""}
Please respect my dietary pattern strictly.`;

    if (onNavigateToChat) {
      onNavigateToChat(query);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Utensils className="w-4 h-4" />
            <span>{t.nutrition.title}</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {t.nutrition.title}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t.nutrition.subtitle}
          </p>
        </div>

        <button
          onClick={handleConsultAi}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-600/20 transition shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>{t.nutrition.askAiButton}</span>
        </button>
      </div>

      {/* Diet Type Switcher (3 Buttons) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t.nutrition.dietTypeTitle}
          </span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {language === "ru" ? "Выберите ваш тип питания:" : "Select your dietary pattern:"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Omnivore */}
          <button
            onClick={() => handleSelectDiet("omnivore")}
            className={`flex flex-col text-left p-4 rounded-xl border transition relative ${
              dietType === "omnivore"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-zinc-900 dark:border-zinc-100 shadow-md"
                : "bg-zinc-50/70 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/80 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600"
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="flex items-center gap-2">
                <Beef className={`w-5 h-5 ${dietType === "omnivore" ? "text-amber-400 dark:text-amber-600" : "text-amber-500"}`} />
                <span className="font-bold text-sm">{t.nutrition.dietTypes.omnivore}</span>
              </div>
              {dietType === "omnivore" && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
              )}
            </div>
            <p className={`text-xs leading-relaxed ${dietType === "omnivore" ? "text-zinc-300 dark:text-zinc-700" : "text-zinc-500 dark:text-zinc-400"}`}>
              {t.nutrition.dietTypes.omnivoreDesc}
            </p>
          </button>

          {/* 2. Vegetarian (Lacto-vegetarian) */}
          <button
            onClick={() => handleSelectDiet("vegetarian")}
            className={`flex flex-col text-left p-4 rounded-xl border transition relative ${
              dietType === "vegetarian"
                ? "bg-emerald-900 text-white dark:bg-emerald-950 dark:text-emerald-100 border-emerald-600 dark:border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                : "bg-zinc-50/70 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/80 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600"
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="flex items-center gap-2">
                <Milk className={`w-5 h-5 ${dietType === "vegetarian" ? "text-emerald-300" : "text-emerald-600 dark:text-emerald-400"}`} />
                <span className="font-bold text-sm">{t.nutrition.dietTypes.vegetarian}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  dietType === "vegetarian" 
                    ? "bg-emerald-800 text-emerald-100" 
                    : "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
                }`}>
                  {t.nutrition.dietTypes.vegetarianBadge}
                </span>
              </div>
              {dietType === "vegetarian" && (
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              )}
            </div>
            <p className={`text-xs leading-relaxed ${dietType === "vegetarian" ? "text-emerald-200" : "text-zinc-500 dark:text-zinc-400"}`}>
              {t.nutrition.dietTypes.vegetarianDesc}
            </p>
          </button>

          {/* 3. Vegan */}
          <button
            onClick={() => handleSelectDiet("vegan")}
            className={`flex flex-col text-left p-4 rounded-xl border transition relative ${
              dietType === "vegan"
                ? "bg-teal-900 text-white dark:bg-teal-950 dark:text-teal-100 border-teal-600 dark:border-teal-500 shadow-md ring-2 ring-teal-500/20"
                : "bg-zinc-50/70 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/80 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600"
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="flex items-center gap-2">
                <Leaf className={`w-5 h-5 ${dietType === "vegan" ? "text-teal-300" : "text-teal-600 dark:text-teal-400"}`} />
                <span className="font-bold text-sm">{t.nutrition.dietTypes.vegan}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  dietType === "vegan" 
                    ? "bg-teal-800 text-teal-100" 
                    : "bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300"
                }`}>
                  {t.nutrition.dietTypes.veganBadge}
                </span>
              </div>
              {dietType === "vegan" && (
                <CheckCircle2 className="w-4 h-4 text-teal-300" />
              )}
            </div>
            <p className={`text-xs leading-relaxed ${dietType === "vegan" ? "text-teal-200" : "text-zinc-500 dark:text-zinc-400"}`}>
              {t.nutrition.dietTypes.veganDesc}
            </p>
          </button>
        </div>

        {/* Note on Lacto-Vegetarian */}
        {dietType === "vegetarian" && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2 text-xs text-emerald-800 dark:text-emerald-300">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <span className="font-semibold">
                {language === "ru" ? "Правило лакто-вегетарианства:" : "Lacto-vegetarian specification:"}
              </span>{" "}
              {language === "ru"
                ? "Разрешены все натуральные молочные продукты (творог, сыры, простокваша, кефир, греческий йогурт). Полностью исключены мясо, птица, морепродукты, рыба и яйца (включая блюда с яичным белком/желтком)."
                : "All natural dairy is permitted (cottage cheese, cheese, yogurt, kefir). Strictly excludes meat, poultry, seafood, fish, and eggs."}
            </div>
          </div>
        )}
      </div>

      {/* Energy & Macros Calculation (КБЖУ) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              {t.nutrition.energyTitle}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t.nutrition.energyFormula}
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-250 dark:border-zinc-700">
            <Scale className="w-3.5 h-3.5 text-emerald-500" />
            <span>{caloricGoalLabel}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Calories */}
          <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                {t.nutrition.calories}
              </span>
              <Flame className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-black text-amber-950 dark:text-amber-100 font-mono">
                {targetCalories}
              </span>
              <span className="text-xs text-amber-700 dark:text-amber-400">
                {t.nutrition.kcal}
              </span>
            </div>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-1">
              {language === "ru" ? `Базовый метаболизм: ~${Math.round(bmr)} ккал` : `BMR: ~${Math.round(bmr)} kcal`}
            </p>
          </div>

          {/* Proteins */}
          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/40 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                {t.nutrition.proteins}
              </span>
              <Activity className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-black text-blue-950 dark:text-blue-100 font-mono">
                {targetProteinGrams}
              </span>
              <span className="text-xs text-blue-700 dark:text-blue-400">
                {t.nutrition.grams}
              </span>
            </div>
            <p className="text-[11px] text-blue-700/80 dark:text-blue-400/80 mt-1">
              {dietType === "vegetarian"
                ? (language === "ru" ? "Творог, сыры, чечевица, тофу" : "Cottage cheese, lentils, tofu")
                : dietType === "vegan"
                ? (language === "ru" ? "Бобовые, сейтан, тофу, конопля" : "Legumes, seitan, tofu, hemp")
                : (language === "ru" ? "Птица, рыба, яйца, бобовые" : "Poultry, fish, eggs, legumes")}
            </p>
          </div>

          {/* Fats */}
          <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-800/40 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                {t.nutrition.fats}
              </span>
              <Droplet className="w-4 h-4 text-rose-500" />
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-black text-rose-950 dark:text-rose-100 font-mono">
                {targetFatGrams}
              </span>
              <span className="text-xs text-rose-700 dark:text-rose-400">
                {t.nutrition.grams}
              </span>
            </div>
            <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-1">
              {language === "ru" ? "Оливковое масло, авокадо, орехи" : "Olive oil, avocado, walnuts"}
            </p>
          </div>

          {/* Carbs */}
          <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                {t.nutrition.carbs}
              </span>
              <Salad className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-black text-emerald-950 dark:text-emerald-100 font-mono">
                {targetCarbsGrams}
              </span>
              <span className="text-xs text-emerald-700 dark:text-emerald-400">
                {t.nutrition.grams}
              </span>
            </div>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1">
              {language === "ru" ? "Цельные крупы, овощи, ягоды" : "Whole grains, veggies, berries"}
            </p>
          </div>
        </div>
      </div>

      {/* Clinical Lab Insights Alerts (if any detected) */}
      {(hasElevatedGlucose || hasElevatedCholesterol || hasLowEgfr || hasHighUricAcid) && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 p-4 rounded-2xl flex flex-col gap-2">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>{t.nutrition.clinicalInsights}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-amber-900 dark:text-amber-200">
            {hasElevatedGlucose && (
              <div className="flex items-center gap-2 bg-white/70 dark:bg-zinc-900/60 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>
                  {language === "ru"
                    ? `Глюкоза (${latestGlucose?.value} ммоль/л): строго ограничить добавленный сахар и быстрые углеводы.`
                    : `Glucose (${latestGlucose?.value} mmol/L): strictly limit refined sugars and high GI foods.`}
                </span>
              </div>
            )}
            {hasElevatedCholesterol && (
              <div className="flex items-center gap-2 bg-white/70 dark:bg-zinc-900/60 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>
                  {language === "ru"
                    ? `Холестерин/ЛПНП выше нормы: минимизировать насыщенные жиры, исключить трансжиры.`
                    : `Cholesterol/LDL elevated: minimize saturated fats, eliminate trans-fats.`}
                </span>
              </div>
            )}
            {hasLowEgfr && (
              <div className="flex items-center gap-2 bg-white/70 dark:bg-zinc-900/60 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span>
                  {language === "ru"
                    ? `СКФ (${latestEgfr?.value}): контролировать нагрузку белком (не превышать 1.0 г/кг) и натрием.`
                    : `eGFR (${latestEgfr?.value}): moderate protein intake (max 1.0 g/kg) and limit sodium.`}
                </span>
              </div>
            )}
            {hasHighUricAcid && (
              <div className="flex items-center gap-2 bg-white/70 dark:bg-zinc-900/60 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>
                  {language === "ru"
                    ? `Мочевая кислота (${latestUricAcid?.value}): диета с низким содержанием пуринов, исключить алкоголь.`
                    : `Uric Acid (${latestUricAcid?.value}): low purine nutrition protocol, eliminate alcohol.`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Two Columns: Recommended Foods vs Restricted Foods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recommended Foods (GREEN) */}
        <div className="bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm mb-4 pb-2 border-b border-emerald-100 dark:border-emerald-900/40">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>{t.nutrition.recommendedTitle}</span>
            </div>

            <div className="space-y-4">
              {/* Protein Section tailored to diet */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  {t.nutrition.categories.proteins}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {dietType === "omnivore" && (
                    <>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Дикая морская рыба (лосось, скумбрия, треска)" : "Wild ocean fish (salmon, mackerel, cod)"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Филе индейки и куриная грудка" : "Turkey breast and chicken fillet"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Яйца (1-2 в день)" : "Eggs (1-2/day)"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Чечевица, нут, фасоль" : "Lentils, chickpeas, black beans"}
                      </span>
                    </>
                  )}

                  {dietType === "vegetarian" && (
                    <>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 border border-emerald-300 dark:border-emerald-700">
                        {language === "ru" ? "Творог 2-5% натуральный" : "Natural cottage cheese (2-5%)"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 border border-emerald-300 dark:border-emerald-700">
                        {language === "ru" ? "Греческий йогурт без сахара" : "Sugar-free Greek yogurt"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 border border-emerald-300 dark:border-emerald-700">
                        {language === "ru" ? "Сыры (моцарелла, пармезан, адыгейский)" : "Cheeses (mozzarella, parmesan, paneer)"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Красная и зеленая чечевица" : "Red & green lentils"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Нут и хумус" : "Chickpeas and hummus"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Органический тофу и темпе" : "Organic tofu & tempeh"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Конопляный и гороховый протеин" : "Hemp & pea protein"}
                      </span>
                    </>
                  )}

                  {dietType === "vegan" && (
                    <>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-900 dark:text-teal-100 border border-teal-300 dark:border-teal-700">
                        {language === "ru" ? "Тофу, темпе, эдамаме" : "Tofu, tempeh, edamame"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-900 dark:text-teal-100 border border-teal-300 dark:border-teal-700">
                        {language === "ru" ? "Чечевица (до 18г белка на порцию)" : "Lentils (up to 18g protein/serving)"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Нут, черная и белая фасоль" : "Chickpeas, black & kidney beans"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Сейтан (пшеничный белок)" : "Seitan (wheat gluten protein)"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Очищенные семена конопли и тыквы" : "Hemp & pumpkin seeds"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Пищевые дрожжи (nooch + B12)" : "Nutritional yeast (+ B12)"}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Vegetables & Greens */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
                  <Salad className="w-3.5 h-3.5" />
                  {t.nutrition.categories.vegetables}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Шпинат, руккола, кейл, салат романо" : "Spinach, arugula, kale, romaine"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Брокколи, цветная капуста, спаржа" : "Broccoli, cauliflower, asparagus"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Кабачки, огурцы, болгарский перец" : "Zucchini, cucumbers, bell peppers"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Томаты (источник ликопина)" : "Tomatoes (lycopene source)"}
                  </span>
                </div>
              </div>

              {/* Complex Carbs */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
                  <Apple className="w-3.5 h-3.5" />
                  {t.nutrition.categories.carbs}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Гречневая крупа, киноа, бурый рис" : "Buckwheat, quinoa, brown rice"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Овсяные хлопья долгой варки" : "Rolled whole oats"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Батат, печеный картофель в кожуре" : "Sweet potato, baked potatoes"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Ягоды (черника, малина, брусника)" : "Berries (blueberries, raspberries)"}
                  </span>
                </div>
              </div>

              {/* Healthy Fats */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
                  <Droplet className="w-3.5 h-3.5" />
                  {t.nutrition.categories.fats}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Оливковое масло первого отжима Extra Virgin" : "Extra virgin olive oil"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Авокадо (мононенасыщенные жиры)" : "Avocado (monounsaturated fats)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Грецкие орехи, миндаль, семена льна и чиа" : "Walnuts, almonds, flax & chia seeds"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Restricted / Avoid Foods (RED) */}
        <div className="bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm mb-4 pb-2 border-b border-rose-100 dark:border-rose-900/40">
              <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <span>{t.nutrition.restrictedTitle}</span>
            </div>

            <div className="space-y-4">
              {/* Diet-specific restrictions */}
              {dietType === "vegetarian" && (
                <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {language === "ru" ? "Строго исключено в лакто-вегетарианстве:" : "Strictly excluded in lacto-vegetarian:"}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-100 border border-rose-300 dark:border-rose-700">
                      {language === "ru" ? "Все виды мяса и птицы (говядина, свинина, птица)" : "All meat & poultry"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-100 border border-rose-300 dark:border-rose-700">
                      {language === "ru" ? "Рыба, морепродукты и икра" : "Fish, seafood and caviar"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-100 border border-rose-300 dark:border-rose-700">
                      {language === "ru" ? "Яйца и любые блюда с яйцами (выпечка, майонез)" : "Eggs & egg products (mayo, baked goods)"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                      {language === "ru" ? "Желатин животного происхождения" : "Animal gelatin"}
                    </span>
                  </div>
                </div>
              )}

              {dietType === "vegan" && (
                <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {language === "ru" ? "Строго исключено в веганстве:" : "Strictly excluded in veganism:"}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-100 border border-rose-300 dark:border-rose-700">
                      {language === "ru" ? "Мясо, птица, рыба, морепродукты" : "Meat, poultry, fish, seafood"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-100 border border-rose-300 dark:border-rose-700">
                      {language === "ru" ? "Молоко, творог, сыры, масло, йогурты" : "Milk, cottage cheese, butter, cheese, yogurt"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-100 border border-rose-300 dark:border-rose-700">
                      {language === "ru" ? "Яйца и продукты с яичным альбумином" : "Eggs & albumin products"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                      {language === "ru" ? "Мед и продукты пчеловодства" : "Honey and bee products"}
                    </span>
                  </div>
                </div>
              )}

              {dietType === "omnivore" && (
                <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {language === "ru" ? "Ультра-обработанные мясные продукты:" : "Ultra-processed meat products:"}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-100 border border-rose-300 dark:border-rose-700">
                      {language === "ru" ? "Колбасы, сосиски, салями, ветчина" : "Sausages, hot dogs, salami, bacon"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-100 border border-rose-300 dark:border-rose-700">
                      {language === "ru" ? "Копчености и полуфабрикаты глубокой заморозки" : "Smoked meats and commercial frozen meals"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-100 border border-rose-300 dark:border-rose-700">
                      {language === "ru" ? "Жирные сорта свинины и баранины" : "Fatty pork & mutton cuts"}
                    </span>
                  </div>
                </div>
              )}

              {/* General Metabolic & Cardiovascular Restrictions */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {language === "ru" ? "Продукты с высоким кардио-метаболическим риском:" : "High cardio-metabolic risk foods:"}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                    {language === "ru" ? "Трансжиры (маргарин, фастфуд, кондитерский жир)" : "Trans-fats (margarine, fast food, shortening)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                    {language === "ru" ? "Добавленный сахар, сиропы и сладкие газировки" : "Added sugar, syrups & sugary sodas"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                    {language === "ru" ? "Рафинированная белая мука и сдобная выпечка" : "Refined white flour & pastries"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                    {language === "ru" ? "Избыток поваренной соли (> 5г / день)" : "Excess sodium (> 5g/day)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                    {language === "ru" ? "Алкогольные напитки" : "Alcoholic beverages"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
