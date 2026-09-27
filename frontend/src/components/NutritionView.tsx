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
  Leaf,
  Wheat,
  Fish,
  Coffee
} from "lucide-react";
import { Patient, LabMetric, api } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";

export type DietType = "omnivore" | "vegetarian" | "vegan";

interface NutritionViewProps {
  patient: Patient;
  onNavigateToChat?: (prefillQuery?: string) => void;
  onStartNewChatWithQuery?: (query: string, title?: string, autoSend?: boolean) => void;
}

export const NutritionView: React.FC<NutritionViewProps> = ({
  patient,
  onNavigateToChat,
  onStartNewChatWithQuery,
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

  // Chat prefill & auto-create consultation generator
  const handleConsultAi = () => {
    let dietTitleRu = "";
    let dietTitleEn = "";
    let dietRulesRu = "";
    let dietRulesEn = "";

    if (dietType === "vegetarian") {
      dietTitleRu = "ВЕГЕТАРИАНСКИЙ (лакто-вегетарианство)";
      dietTitleEn = "VEGETARIAN (Lacto-vegetarian)";
      dietRulesRu = `• ПОЛНОСТЬЮ ИСКЛЮЧЕНЫ: мясо, птица, рыба, морепродукты, яйца.
• РАЗРЕШЕНЫ И ПРИВЕТСТВУЮТСЯ: натуральные молочные продукты (творог 2–5%, греческий йогурт, кефир, качественные сыры), все виды чечевицы, нут, маш, фасоль, тофу, темпе, цельные злаки, овощи, свежая зелень, орехи, семена и полезные масла.`;
      dietRulesEn = `• STRICTLY EXCLUDED: meat, poultry, fish, seafood, and eggs.
• ALLOWED & ENCOURAGED: natural dairy (cottage cheese 2–5%, Greek yogurt, kefir, cheeses), all lentils, chickpeas, mung beans, tofu, tempeh, whole grains, vegetables, fresh greens, nuts, seeds, and healthy oils.`;
    } else if (dietType === "vegan") {
      dietTitleRu = "ВЕГАНСКИЙ (100% растительный рацион)";
      dietTitleEn = "VEGAN (100% plant-based)";
      dietRulesRu = `• ПОЛНОСТЬЮ ИСКЛЮЧЕНЫ ЛЮБЫЕ ЖИВОТНЫЕ ПРОДУКТЫ: мясо, птица, рыба, яйца, молоко, творог, сыры, мед, животные жиры.
• РАЗРЕШЕНЫ И ПРИВЕТСТВУЮТСЯ: только растительные источники белка (органический тофу, темпе, бобы эдамаме, чечевица, нут, фасоль, очищенные семена конопли), цельные крупы (киноа, гречка, овес), семена, орехи, овощи, зелень, полезные растительные масла.`;
      dietRulesEn = `• STRICTLY EXCLUDED: all animal products (meat, poultry, fish, eggs, milk, cottage cheese, cheese, butter, honey, animal fats).
• ALLOWED & ENCOURAGED: plant-based proteins only (organic tofu, tempeh, edamame, lentils, chickpeas, beans, hemp seeds), whole grains (quinoa, buckwheat, oats), seeds, nuts, vegetables, greens, and healthy plant oils.`;
    } else {
      dietTitleRu = "СБАЛАНСИРОВАННЫЙ ВСЕЯДНЫЙ (средиземноморский стиль)";
      dietTitleEn = "BALANCED OMNIVORE (Mediterranean style)";
      dietRulesRu = `• ИСКЛЮЧЕНО / ОГРАНИЧЕНО: ультра-обработанные мясные продукты (колбасы, сосиски, копчености), трансжиры, фастфуд, избыток рафинированных сахаров.
• РАЗРЕШЕНО И ПРИВЕТСТВУЮТСЯ: дикая морская рыба (богатая омега-3), постная птица (индейка, курица), яйца, бобовые, цельные злаки, овощи, ягоды, полезные ненасыщенные жиры (EVOO, авокадо, орехи).`;
      dietRulesEn = `• EXCLUDED / RESTRICTED: ultra-processed meats (sausages, hot dogs, bacon, deli meats), trans fats, deep-fried food, excess refined sugars.
• ALLOWED & ENCOURAGED: wild omega-3 rich fish, lean poultry (turkey, chicken), eggs, legumes, whole grains, vegetables, berries, healthy unsaturated fats (EVOO, avocado, nuts).`;
    }

    const sessionTitle = language === "ru"
      ? (dietType === "vegetarian" ? "Меню: Вегетарианское (на неделю)" : dietType === "vegan" ? "Меню: Веганское (на неделю)" : "Меню: Сбалансированное (на неделю)")
      : (dietType === "vegetarian" ? "Menu: Vegetarian (7-day)" : dietType === "vegan" ? "Menu: Vegan (7-day)" : "Menu: Balanced (7-day)");

    const query = language === "ru"
      ? `Здравствуйте, доктор! Составьте для меня подробный персонализированный план питания и пример меню на неделю.

[КРИТИЧЕСКИ ВАЖНО: Пожалуйста, НЕ пишите общее медицинское заключение, разбор анализов и клинические преамбулы. Сразу предоставьте готовое структурированное меню на 7 дней по дням недели!]

🥗 Выбранный тип рациона: ${dietTitleRu}
Правила рациона:
${dietRulesRu}

📊 Мои клинические данные:
- Возраст: ${age} лет, пол: ${isMale ? "мужской" : "женский"}, рост: ${height} см, вес: ${weight} кг, ИМТ: ${bmi}.
- Расчетные целевые нормы: ~${targetCalories} ккал/сутки (Белки: ${targetProteinGrams}г, Жиры: ${targetFatGrams}г, Углеводы: ${targetCarbsGrams}г).
${patient.chronic_diseases ? `- Диагнозы в анамнезе: ${patient.chronic_diseases}.` : ""}
${patient.allergies ? `- Аллергии / непереносимости: ${patient.allergies}.` : ""}
${hasElevatedGlucose ? "- Лабораторные маркеры: повышен уровень глюкозы крови (учитывать гликемический индекс продуктов)." : ""}
${hasElevatedCholesterol ? "- Лабораторные маркеры: повышен холестерин/ЛПНП (минимизировать насыщенные жиры, исключить трансжиры)." : ""}
${hasLowEgfr ? "- Лабораторные маркеры: снижена расчетная СКФ (контролировать солевую нагрузку и поддерживать почки)." : ""}
${hasHighUricAcid ? "- Лабораторные маркеры: повышена мочевая кислота (строго исключить продукты с высокой пуриновой нагрузкой: шпинат, щавель, спаржу, дрожжевые экстракты)." : ""}

Пожалуйста, составьте подробное меню на 7 дней (с понедельника по воскресенье):
1. Для каждого дня распишите Завтрак, Обед, Ужин и Полезный перекус.
2. Укажите примерную калорийность каждого приема пищи.
3. Строго соблюдайте правила выбранного типа рациона (${dietTitleRu})! Начните ответ сразу с меню, без медицинских заключений.`
      : `Hello, Doctor! Please design a detailed personalized nutrition plan and a 7-day meal plan for me.

[CRITICAL: Please DO NOT write a medical conclusion, review of lab tests, or clinical preambles. Directly provide the structured 7-day meal plan by days of the week!]

🥗 Selected Dietary Pattern: ${dietTitleEn}
Dietary rules:
${dietRulesEn}

📊 My Clinical Profile:
- Age: ${age}, Gender: ${isMale ? "Male" : "Female"}, Height: ${height} cm, Weight: ${weight} kg, BMI: ${bmi}.
- Daily Targets: ~${targetCalories} kcal/day (Proteins: ${targetProteinGrams}g, Fats: ${targetFatGrams}g, Carbs: ${targetCarbsGrams}g).
${patient.chronic_diseases ? `- Diagnoses: ${patient.chronic_diseases}.` : ""}
${patient.allergies ? `- Allergies: ${patient.allergies}.` : ""}
${hasElevatedGlucose ? "- Lab markers: elevated blood glucose (monitor glycemic index)." : ""}
${hasElevatedCholesterol ? "- Lab markers: elevated cholesterol/LDL (minimize saturated fats)." : ""}
${hasLowEgfr ? "- Lab markers: reduced eGFR (limit sodium, protect kidneys)." : ""}
${hasHighUricAcid ? "- Lab markers: elevated uric acid (strictly restrict purines: spinach, sorrel, asparagus)." : ""}

Please write out a full 7-day meal plan (Monday to Sunday) with Breakfast, Lunch, Dinner, and Healthy Snack, strictly adhering to the ${dietTitleEn} pattern! Begin directly with the meal plan without medical conclusions.`;

    if (onStartNewChatWithQuery) {
      onStartNewChatWithQuery(query, sessionTitle, false);
    } else if (onNavigateToChat) {
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
          className="flex items-center gap-3 px-4.5 py-2.5 rounded-2xl text-sm font-semibold border border-emerald-500/30 dark:border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/15 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/25 text-emerald-950 dark:text-emerald-100 backdrop-blur-md shadow-sm transition-all hover:scale-[1.01] shrink-0"
        >
          <Sparkles className="w-5 h-5 text-yellow-500 dark:text-yellow-400 shrink-0" />
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm leading-tight text-emerald-900 dark:text-emerald-200">
              {language === "ru" 
                ? (dietType === "vegetarian" 
                    ? "Составить Вегетарианское меню на неделю" 
                    : dietType === "vegan" 
                    ? "Составить Веганское меню на неделю" 
                    : "Составить Сбалансированное меню на неделю")
                : (dietType === "vegetarian" 
                    ? "Generate Vegetarian Weekly Meal Plan" 
                    : dietType === "vegan" 
                    ? "Generate Vegan Weekly Meal Plan" 
                    : "Generate Balanced Weekly Meal Plan")}
            </span>
            <span className="text-[11px] font-normal text-emerald-700/80 dark:text-emerald-300/80 flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              <span>{language === "ru" ? "Режим:" : "Diet:"}</span>
              <span className="font-bold underline decoration-emerald-500/40">
                {dietType === "vegetarian" 
                  ? (language === "ru" ? "Вегетарианец (Лакто)" : "Vegetarian (Lacto)")
                  : dietType === "vegan"
                  ? (language === "ru" ? "Веган (100% растительный)" : "Vegan (Plant-based)")
                  : (language === "ru" ? "Всеядный" : "Omnivore")}
              </span>
              <span>• {language === "ru" ? "откроется диалог с готовым запросом" : "opens dialogue with prompt"}</span>
            </span>
          </div>
          <ChevronRight className="w-4 h-4 ml-1 text-emerald-600 dark:text-emerald-400 shrink-0" />
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
            className={`flex flex-col text-left p-4 rounded-xl border transition-all relative ${
              dietType === "omnivore"
                ? "bg-blue-500/10 dark:bg-blue-500/15 border-2 border-blue-500/60 dark:border-blue-400/50 shadow-sm ring-2 ring-blue-500/20 backdrop-blur-sm"
                : "bg-zinc-50/50 dark:bg-zinc-800/20 border-zinc-200/80 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40"
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="flex items-center gap-2">
                <Beef className={`w-5 h-5 ${dietType === "omnivore" ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 dark:text-zinc-500"}`} />
                <span className={`font-bold text-sm ${dietType === "omnivore" ? "text-blue-950 dark:text-blue-100" : "text-zinc-800 dark:text-zinc-200"}`}>{t.nutrition.dietTypes.omnivore}</span>
              </div>
              {dietType === "omnivore" ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/15 dark:bg-blue-400/20 text-blue-700 dark:text-blue-300 border border-blue-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                  {language === "ru" ? "✓ ВЫБРАНО" : "✓ SELECTED"}
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60">
                  {t.nutrition.dietTypes.omnivoreBadge}
                </span>
              )}
            </div>
            <p className={`text-xs leading-relaxed ${dietType === "omnivore" ? "text-blue-900/80 dark:text-blue-200/80" : "text-zinc-500 dark:text-zinc-400"}`}>
              {t.nutrition.dietTypes.omnivoreDesc}
            </p>
          </button>

          {/* 2. Vegetarian (Lacto-vegetarian) */}
          <button
            onClick={() => handleSelectDiet("vegetarian")}
            className={`flex flex-col text-left p-4 rounded-xl border transition-all relative ${
              dietType === "vegetarian"
                ? "bg-emerald-500/10 dark:bg-emerald-500/15 border-2 border-emerald-500/60 dark:border-emerald-400/50 shadow-sm ring-2 ring-emerald-500/20 backdrop-blur-sm"
                : "bg-zinc-50/50 dark:bg-zinc-800/20 border-zinc-200/80 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40"
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="flex items-center gap-2">
                <Milk className={`w-5 h-5 ${dietType === "vegetarian" ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-zinc-500"}`} />
                <span className={`font-bold text-sm ${dietType === "vegetarian" ? "text-emerald-950 dark:text-emerald-100" : "text-zinc-800 dark:text-zinc-200"}`}>{t.nutrition.dietTypes.vegetarian}</span>
              </div>
              {dietType === "vegetarian" ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  {language === "ru" ? "✓ ВЫБРАНО" : "✓ SELECTED"}
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60">
                  {t.nutrition.dietTypes.vegetarianBadge}
                </span>
              )}
            </div>
            <p className={`text-xs leading-relaxed ${dietType === "vegetarian" ? "text-emerald-900/80 dark:text-emerald-200/80" : "text-zinc-500 dark:text-zinc-400"}`}>
              {t.nutrition.dietTypes.vegetarianDesc}
            </p>
          </button>

          {/* 3. Vegan */}
          <button
            onClick={() => handleSelectDiet("vegan")}
            className={`flex flex-col text-left p-4 rounded-xl border transition-all relative ${
              dietType === "vegan"
                ? "bg-teal-500/10 dark:bg-teal-500/15 border-2 border-teal-500/60 dark:border-teal-400/50 shadow-sm ring-2 ring-teal-500/20 backdrop-blur-sm"
                : "bg-zinc-50/50 dark:bg-zinc-800/20 border-zinc-200/80 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40"
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="flex items-center gap-2">
                <Leaf className={`w-5 h-5 ${dietType === "vegan" ? "text-teal-600 dark:text-teal-400" : "text-zinc-400 dark:text-zinc-500"}`} />
                <span className={`font-bold text-sm ${dietType === "vegan" ? "text-teal-950 dark:text-teal-100" : "text-zinc-800 dark:text-zinc-200"}`}>{t.nutrition.dietTypes.vegan}</span>
              </div>
              {dietType === "vegan" ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-500/15 dark:bg-teal-400/20 text-teal-700 dark:text-teal-300 border border-teal-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 dark:bg-teal-400" />
                  {language === "ru" ? "✓ ВЫБРАНО" : "✓ SELECTED"}
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60">
                  {t.nutrition.dietTypes.veganBadge}
                </span>
              )}
            </div>
            <p className={`text-xs leading-relaxed ${dietType === "vegan" ? "text-teal-900/80 dark:text-teal-200/80" : "text-zinc-500 dark:text-zinc-400"}`}>
              {t.nutrition.dietTypes.veganDesc}
            </p>
          </button>
        </div>

        {/* Action bar under switcher cards */}
        <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{language === "ru" ? "Активный рацион для меню:" : "Active pattern for meal plan:"}</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {dietType === "vegetarian" ? (language === "ru" ? "Вегетарианец (Лакто)" : "Vegetarian (Lacto)") : dietType === "vegan" ? (language === "ru" ? "Веган (100% растительный)" : "Vegan (Plant-based)") : (language === "ru" ? "Всеядный" : "Omnivore")}
            </span>
          </div>
          <button
            onClick={handleConsultAi}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-emerald-500/30 dark:border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/15 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/25 text-emerald-900 dark:text-emerald-200 backdrop-blur-md shadow-sm transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-500 dark:text-yellow-400" />
            <span>
              {language === "ru" 
                ? (dietType === "vegetarian" ? "Создать вегетарианское меню с AI-доктором" : dietType === "vegan" ? "Создать веганское меню с AI-доктором" : "Создать сбалансированное меню с AI-доктором")
                : (dietType === "vegetarian" ? "Generate Vegetarian Meal Plan" : dietType === "vegan" ? "Generate Vegan Meal Plan" : "Generate Balanced Meal Plan")}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
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
              {/* 1. Protein Section tailored to diet */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                  {t.nutrition.categories.proteins}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {dietType === "omnivore" && (
                    <>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Дикая морская рыба: лосось, треска, минтай, скумбрия (омега-3 для эндотелия)" : "Wild ocean fish: salmon, cod, pollock, mackerel (EPA/DHA for endothelium)"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Филе индейки и куриная грудка без кожи (постный белок)" : "Skinless turkey and chicken breast (lean protein)"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Постная телятина и мясо кролика (минимум насыщенных жиров)" : "Lean veal and rabbit meat (low saturated fat)"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Куриные и перепелиные яйца пашот / всмятку (холин и лецитин)" : "Poached / soft-boiled eggs (choline & lecithin)"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Красная и зеленая чечевица, маш (растительный белок и клетчатка)" : "Red & green lentils, mung beans (fiber & plant protein)"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Нут и натуральный хумус с тахини" : "Chickpeas & natural hummus with tahini"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Органический тофу и темпе" : "Organic tofu & tempeh"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Изолят горохового или сывороточного протеина (без сахара)" : "Pea or whey protein isolate (sugar-free)"}
                      </span>
                    </>
                  )}

                  {dietType === "vegetarian" && (
                    <>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Творог 2–5% натуральный (казеиновый белок, кальций)" : "Natural cottage cheese 2–5% (casein & calcium)"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Греческий йогурт без сахара, простокваша, ацидофилин" : "Plain Greek yogurt, kefir & acidophilus"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Сыры с низкой соленостью: адыгейский, моцарелла, рикотта" : "Low-sodium cheeses: paneer, fresh mozzarella, ricotta"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Пармезан выдержанный (20–30г — источник биодоступного кальция)" : "Aged Parmesan (20–30g — bioavailable calcium)"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Чечевица: красная, зеленая, черная белуга (до 24г белка)" : "Lentils: red, green, black beluga (up to 24g protein)"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Нут, маш и фасоль (предварительно вымоченные)" : "Chickpeas, mung & kidney beans (pre-soaked)"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Хумус натуральный с кунжутной пастой тахини" : "Natural hummus with sesame tahini"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Органический тофу и темпе" : "Organic tofu & tempeh"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Изолят конопляного, тыквенного и горохового протеина" : "Hemp, pumpkin & pea protein isolate"}
                      </span>
                    </>
                  )}

                  {dietType === "vegan" && (
                    <>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Тофу органический, ферментированный темпе, бобы эдамаме" : "Organic tofu, fermented tempeh, edamame"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Чечевица всех видов: красная, зеленая, черная (до 18г белка на порцию)" : "Lentils: red, green, black (up to 18g protein/serving)"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Нут, маш, черная и белая фасоль (с вымачиванием)" : "Chickpeas, mung, black & white beans (pre-soaked)"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Сейтан домашний (чистый пшеничный глютеновый белок)" : "Homemade seitan (pure wheat gluten protein)"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Очищенные семена конопли (все 9 незаменимых аминокислот)" : "Hemp hearts (all 9 essential amino acids)"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Семена тыквы и подсолнечника (цинк, магний, аргинин)" : "Pumpkin & sunflower seeds (zinc, magnesium, arginine)"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Семена кунжута и паста тахини (кальций и растительный белок)" : "Sesame seeds & tahini paste (calcium & protein)"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Урбеч из льна или конопли (без добавленного сахара)" : "Raw flax or hemp seed paste (sugar-free)"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                        {language === "ru" ? "Изолят горохового и рисового протеина (чистый аминопрофиль)" : "Pea & brown rice protein isolate (clean amino profile)"}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* 2. Vegetables & Greens */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-1.5">
                  <Salad className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                  {t.nutrition.categories.vegetables}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Руккола, кейл, салат романо, айсберг, листовой латук" : "Arugula, kale, romaine, iceberg & leaf lettuce"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Пекинская и китайская капуста (пак-чой)" : "Napa cabbage & bok choy"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Брокколи и цветная капуста (сульфорафан для сосудов)" : "Broccoli & cauliflower (sulforaphane for vessels)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Кабачки, цукини и патиссоны (легко усваиваются, поддержка почек)" : "Zucchini, summer squash & pattypan (kidney-friendly)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Огурцы грунтовые (гидратация и калий)" : "Fresh cucumbers (hydration & potassium)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Болгарский перец всех цветов (чемпион по витамину C)" : "Bell peppers all colors (high vitamin C)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Томаты спелые (источник антиоксиданта ликопина)" : "Ripe tomatoes (lycopene antioxidant)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Стеблевой сельдерей и фенхель (фталиды снижают тонус артерий)" : "Celery stalks & fennel (phthalides for arterial tone)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Тыква запеченная и морковь (бета-каротин и калий)" : "Baked pumpkin & carrots (beta-carotene & potassium)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Артишоки и запеченные баклажаны (пектин и гепатопротекция)" : "Artichokes & roasted eggplant (liver & vascular support)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Свежая пряная зелень: укроп, петрушка, кинза, базилик" : "Fresh herbs: dill, parsley, cilantro, basil"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Редис, дайкон, репа и кольраби (растительные волокна)" : "Radish, daikon, turnips & kohlrabi (dietary fiber)"}
                  </span>
                </div>
              </div>

              {/* 3. Complex Carbs & Grains */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-1.5">
                  <Wheat className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                  {t.nutrition.categories.carbs}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Гречневая крупа: зеленая и ядрица (рутин укрепляет капилляры)" : "Buckwheat: green & roasted (rutin capillary support)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Киноа: белая, красная, трехцветная (низкий ГИ, без глютена)" : "Quinoa: white, red, tricolor (low GI, gluten-free)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Бурый, дикий и красный рис (оболочка богата магнием и витаминами B)" : "Brown, wild & red rice (magnesium & B-vitamins)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Овсяные хлопья долгой варки (15–20 мин) (бета-глюкан снижает ЛПНП)" : "Rolled whole oats (15-20m) (beta-glucan lowers LDL)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Полба (спельта), перловая крупа и ячмень (медленные углеводы)" : "Spelt, pearl barley & whole barley (slow carbs)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Булгур из твердых сортов пшеницы (низкий гликемический индекс)" : "Whole grain bulgur (low glycemic index)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Батат и печеный картофель в кожуре (калий для кардиомиоцитов)" : "Sweet potato & jacket baked potato (potassium for heart)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Цельнозерновой бездрожжевой хлеб на ржаной закваске" : "100% whole grain sourdough rye bread"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Паста из твердых сортов пшеницы al dente или гречневая соба" : "Durum wheat pasta al dente or 100% buckwheat soba"}
                  </span>
                </div>
              </div>

              {/* 4. Berries & Low-GI Fruits */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-1.5">
                  <Apple className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                  {t.nutrition.categories.fruits}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Черника, голубика, брусника (антоцианы защищают сосудистую стенку)" : "Blueberries, wild bilberries, lingonberries (endothelial anthocyanins)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Малина, ежевика, клубника (высокое содержание клетчатки и эллаговой кислоты)" : "Raspberries, blackberries, strawberries (ellagic acid & fiber)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Вишня и черешня (доказано снижают уровень мочевой кислоты в крови)" : "Tart cherries & sweet cherries (clinically reduce serum uric acid)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Зеленые яблоки (пектин связывает и выводит избыточный холестерин)" : "Crisp green apples (soluble pectin binds excess cholesterol)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Гранат и свежие зерна граната (пуникалагин препятствует окислению ЛПНП)" : "Pomegranate seeds (punicalagins inhibit LDL oxidation)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Груши, сливы и абрикосы (растворимая клетчатка для микробиоты)" : "Pears, plums & fresh apricots (gut microbiota prebiotic fiber)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Грейпфрут, апельсины, лимонный сок (витамин C и цитраты против камней в почках)" : "Grapefruit, oranges & lemon juice (citrates protect kidneys)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Киви (1–2 плода в день поддерживают липидный профиль и моторику ЖКТ)" : "Kiwi fruit (1-2 daily supports lipid profile & motility)"}
                  </span>
                </div>
              </div>

              {/* 5. Healthy Fats, Nuts & Seeds */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-1.5">
                  <Droplet className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                  {t.nutrition.categories.fats}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Оливковое масло Extra Virgin первого холодного отжима (EVOO с высоким полифенолом)" : "Extra virgin cold-pressed olive oil (high-polyphenol EVOO)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Свежее авокадо и масло авокадо (мононенасыщенная олеиновая кислота Омега-9)" : "Fresh avocado & avocado oil (Omega-9 oleic acid)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Грецкие орехи (рекордсмен среди орехов по омега-3 АЛК для сосудов)" : "Raw walnuts (highest plant ALA Omega-3 among nuts)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Миндаль сырой (витамин E и магний для эластичности сосудистой стенки)" : "Raw almonds (vitamin E & magnesium for arterial elasticity)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Фундук, кешью и несоленые фисташки (богаты фитостеролами)" : "Hazelnuts, cashews & unsalted pistachios (phytosterols)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Свежемолотые семена льна и льняное масло холодного отжима (растительная омега-3)" : "Freshly ground flaxseeds & cold-pressed flax oil (plant ALA)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Семена чиа (растворимая слизистая клетчатка и омега-3)" : "Chia seeds (soluble mucilage fiber & ALA omega-3)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Очищенные семена тыквы и кунжут (цинк, магний, сезамин)" : "Pumpkin seeds & raw sesame (zinc, magnesium, sesamin)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Рыжиковое масло и масло грецкого ореха холодного отжима" : "Camelina oil & walnut oil (cold-pressed)"}
                  </span>
                </div>
              </div>

              {/* 6. Fermented Foods & Probiotics */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                  {t.nutrition.categories.fermented}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Квашеная капуста без сахара (богата лактобактериями и натуральным витамином C)" : "Naturally fermented sauerkraut (no sugar, high vitamin C & lactobacilli)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Натуральный кефир, простокваша, ряженка (живые штаммы бифидо- и лактокультур)" : "Natural kefir, plain buttermilk (live probiotic cultures)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Слабосоленое кимчи ферментированное (поддержка кишечного микробиома)" : "Mild fermented kimchi (gut microbiota & metabolism support)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Органическая мисо-паста из ферментированных бобов (ферменты пищеварения)" : "Organic traditional miso paste (digestive enzymes)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Натуральная комбуча без добавленного сахара (чайный квас для пищеварения)" : "Raw sugar-free kombucha (probiotic fermented tea)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Яблочный нефильтрованный уксус с «маточным осадком» (улучшает метаболизм)" : "Unfiltered raw apple cider vinegar with 'mother' (metabolic enzymes)"}
                  </span>
                </div>
              </div>

              {/* 7. Anti-Inflammatory Herbs, Spices & Teas */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-1.5">
                  <Coffee className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                  {t.nutrition.categories.herbs}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Куркума с черным перцем (куркумин + пиперин снижают воспаление сосудистой стенки)" : "Turmeric with black pepper (curcumin + piperine reduce vascular inflammation)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Свежий корень имбиря (гингеролы улучшают микроциркуляцию и липиды)" : "Fresh ginger root (gingerols support microcirculation)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Чеснок и репчатый лук (аллицин препятствует окислению липидов и тромбообразованию)" : "Fresh garlic & onions (allicin inhibits platelet aggregation & lipid oxidation)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Розмарин, тимьян, орегано, базилик (высокая концентрация полифенолов)" : "Rosemary, thyme, oregano & basil (high polyphenol herbs)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Зеленый чай листовой и матча (полифенол EGCG — доказанный кардиопротектор)" : "Loose-leaf green tea & ceremonial matcha (EGCG cardiovascular protection)"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Травяные настои: ромашка, мята, мелисса, плоды шиповника, каркаде" : "Herbal teas: chamomile, mint, lemon balm, rosehip & hibiscus"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    {language === "ru" ? "Минеральная гидрокарбонатная щелочная вода (способствует выведению мочевой кислоты)" : "Alkaline bicarbonate mineral water (assists uric acid excretion)"}
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
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                    {language === "ru" ? "Вегетарианские продукты, требующие ограничения при ваших показателях:" : "Vegetarian foods to limit based on your clinical profile:"}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                      {language === "ru" ? "Высокожирные молочные продукты: жирные и плавленые сыры, сливочное масло, сливки 30%+, избыток гхи (насыщенные жиры повышают ЛПНП и риск роста бляшек)" : "High-fat dairy: aged & processed cheeses, butter, heavy cream, excess ghee (saturated fats elevate LDL and plaque risk)"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                      {language === "ru" ? "Соленые и рассольные сыры (сулугуни, брынза, фета) — избыток натрия перегружает сосуды и почки" : "High-sodium brined cheeses (feta, sulguni, brynza) — excess sodium strains vascular wall & kidneys"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                      {language === "ru" ? "Тропические масла (кокосовое, пальмовое) — содержат до 85% насыщенных жирных кислот, атерогенны" : "Tropical oils (coconut, palm) — up to 85% saturated fatty acids, highly atherogenic"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                      {language === "ru" ? "Избыток пуринов: шпинат, щавель, спаржа, грибы, избыток бобовых без вымачивания (нагрузка при повышенной мочевой кислоте)" : "High purine foods: spinach, sorrel, asparagus, mushrooms, unsoaked legumes (strains uric acid levels)"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                      {language === "ru" ? "Сладкие творожные массы, глазированные сырки, десерты с сахаром (скачки глюкозы, триглицеридов и инсулина)" : "Sweet dairy desserts, glazed curd bars, sweetened condensed milk (spikes glucose & triglycerides)"}
                    </span>
                  </div>
                </div>
              )}

              {dietType === "vegan" && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                    {language === "ru" ? "Веганские продукты, требующие ограничения при ваших показателях:" : "Vegan foods to limit based on your clinical profile:"}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                      {language === "ru" ? "Кокосовое масло, кокосовые сливки и молоко, пальмовый жир (скрытые насыщенные жиры, резко повышающие ЛПНП)" : "Coconut oil, coconut cream/milk, palm fat (hidden saturated fats drastically elevating LDL)"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                      {language === "ru" ? "Ультра-обработанные веганские сыры на крахмале/кокосовом жире и жареные веганские полуфабрикаты" : "Processed vegan 'cheeses' (starch + coconut oil) and commercial fried mock-meats"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                      {language === "ru" ? "Концентрированная фруктоза: сироп агавы, финиковые сиропы в избытке (стимулируют выработку мочевой кислоты и триглицеридов)" : "Concentrated fructose: agave syrup, heavy date syrup (stimulates liver production of uric acid & triglycerides)"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                      {language === "ru" ? "Избыток соевого соуса, консервации и соленых снеков (натриевая перегрузка сосудистого русла и почек)" : "Excess soy sauce, pickles & salted snacks (sodium overload damaging vascular bed and kidneys)"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                      {language === "ru" ? "Рафинированные растительные масла с избытком омега-6 (подсолнечное, кукурузное) — провоцируют воспаление сосудов" : "Refined omega-6 vegetable oils (sunflower, corn) — fuel systemic vascular inflammation"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                      {language === "ru" ? "Дрожжевые хлопья (nutritional yeast) и грибы в больших количествах (высокая пуриновая нагрузка)" : "Nutritional yeast and mushrooms in large amounts (high purine load for uric acid management)"}
                    </span>
                  </div>
                </div>
              )}

              {dietType === "omnivore" && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                    {language === "ru" ? "Ультра-обработанные мясные продукты:" : "Ultra-processed meat products:"}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                      {language === "ru" ? "Колбасы, сосиски, салями, ветчина" : "Sausages, hot dogs, salami, bacon"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                      {language === "ru" ? "Копчености и полуфабрикаты глубокой заморозки" : "Smoked meats and commercial frozen meals"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                      {language === "ru" ? "Жирные сорта свинины и баранины" : "Fatty pork & mutton cuts"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                      {language === "ru" ? "Субпродукты и избыток пуринов: печень, почки, шпинат, щавель, спаржа" : "Offal & high-purine foods: liver, kidneys, spinach, sorrel, asparagus"}
                    </span>
                  </div>
                </div>
              )}

              {/* General Metabolic & Cardiovascular Restrictions */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
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
