export interface BiomarkerDetail {
  whatIs: string;
  clinicalImpact: string;
  category: string;
}

export const BIOMARKER_INFO_RU: Record<string, BiomarkerDetail> = {
  // CBC
  "hgb": {
    category: "Общий анализ крови (CBC)",
    whatIs: "Основной железосодержащий белок внутри эритроцитов, который связывает кислород в легких и доставляет его ко всем тканям и органам организма, а обратно уносит углекислый газ.",
    clinicalImpact: "Критически важен для тканевого дыхания, выносливости и работы мозга. Снижение указывает на анемию, скрытую кровопотерю или дефицит железа/витаминов (слабость, одышка, тахикардия); повышение — на сгущение крови, гипоксию или обезвоживание."
  },
  "rbc": {
    category: "Общий анализ крови (CBC)",
    whatIs: "Красные кровяные клетки (эритроциты), циркулирующие в сосудистом русле и переносящие гемоглобин.",
    clinicalImpact: "Определяет общую кислородную емкость и вязкость крови. Низкий уровень приводит к тканевой гипоксии; высокий — увеличивает риск образования тромбов и нагрузку на сердечно-сосудистую систему."
  },
  "wbc": {
    category: "Общий анализ крови (CBC)",
    whatIs: "Белые кровяные тельца (лейкоциты) — ключевые клетки иммунной системы, защищающие организм от вирусов, бактерий, грибков и токсинов.",
    clinicalImpact: "Индикатор иммунной активности. Повышение свидетельствует об инфекции, воспалении, аллергической реакции или стрессе; снижение — об истощении иммунитета, вирусной супрессии или дефицитах."
  },
  "plt": {
    category: "Общий анализ крови (CBC)",
    whatIs: "Кровяные пластинки (тромбоциты), отвечающие за первичный гемостаз, свертывание крови и заживление повреждений сосудов.",
    clinicalImpact: "Определяет способность крови образовывать тромбы при травмах. Низкий уровень грозит кровоточивостью, кровоизлияниями и синяками; высокий — повышает опасность тромбоза сосудов, инфаркта и инсульта."
  },
  "hct": {
    category: "Общий анализ крови (CBC)",
    whatIs: "Гематокрит — процентное соотношение объема форменных элементов (в основном эритроцитов) к общему объему плазмы крови (густота крови).",
    clinicalImpact: "Влияет на реологию (текучесть) крови и сердечную нагрузку. Повышен при сгущении крови и обезвоживании; снижен при анемиях и избытке жидкости."
  },
  "esr": {
    category: "Общий анализ крови (CBC)",
    whatIs: "Скорость оседания эритроцитов (СОЭ / СУЕ) — неспецифический маркер воспалительной активности и белкового состава плазмы.",
    clinicalImpact: "Отражает наличие системного воспаления, аутоиммунных заболеваний, инфекций или тканевого некроза в организме."
  },
  "mcv": {
    category: "Эритроцитарные индексы (CBC)",
    whatIs: "Средний объем одного эритроцита (Mean Corpuscular Volume) в фемтолитрах (фл).",
    clinicalImpact: "Главный дифференциальный маркер типа анемии: низкий MCV (микроцитоз) указывает на железодефицит; высокий MCV (макроцитоз) — на дефицит витамина B12, фолатов или патологию печени."
  },
  "mch": {
    category: "Эритроцитарные индексы (CBC)",
    whatIs: "Среднее содержание гемоглобина в одном эритроците (в пикограммах).",
    clinicalImpact: "Оценивает степень насыщения эритроцита гемоглобином. Снижается при гипохромии (дефицит железа, талассемия)."
  },
  "mchc": {
    category: "Эритроцитарные индексы (CBC)",
    whatIs: "Средняя концентрация гемоглобина в эритроцитарной массе (в г/л).",
    clinicalImpact: "Показывает плотность заполнения клеток гемоглобином. Один из самых стабильных показателей, изменяется при нарушениях формы мембран эритроцитов."
  },
  "rdw": {
    category: "Эритроцитарные индексы (CBC)",
    whatIs: "Ширина распределения эритроцитов по объему — степень неоднородности размеров красных кровяных клеток (анизоцитоз).",
    clinicalImpact: "Самый ранний маркер скрытого дефицита железа, реагирующий еще до снижения уровня гемоглобина."
  },

  // CMP
  "glucose": {
    category: "Метаболическая панель (CMP)",
    whatIs: "Глюкоза крови — базовый источник энергии для клеток организма, головного мозга и скелетных мышц.",
    clinicalImpact: "Контроль углеводного обмена. Постоянно повышенный уровень повреждает внутреннюю стенку сосудов (эндотелий), ускоряет атеросклероз и свидетельствует об инсулинорезистентности или сахарном диабете."
  },
  "creatinine": {
    category: "Функция почек (CMP)",
    whatIs: "Конечный продукт мышечного энергообмена (распада креатинфосфата), выводящийся почками через клубочковую фильтрацию.",
    clinicalImpact: "Прямой маркер работы почек. Рост креатинина указывает на снижение фильтрации почек, почечную недостаточность или тяжелое обезвоживание."
  },
  "urea": {
    category: "Функция почек (CMP)",
    whatIs: "Мочевина (BUN) — продукт метаболизма белков, синтезируемый печенью и фильтруемый почками.",
    clinicalImpact: "Отражает баланс белкового питания и выделительную способность почек. Повышается при патологии почек, избытке белка, катаболизме или обезвоживании."
  },
  "egfr": {
    category: "Функция почек (CMP)",
    whatIs: "Расчетная скорость клубочковой фильтрации (eGFR по формуле CKD-EPI) — главный показатель функционального резерва почек (мл/мин/1.73м²).",
    clinicalImpact: "Определяет стадию здоровья почек. Значения выше 90 — норма; снижение ниже 60 указывает на хроническую болезнь почек (ХБП) и требует защиты сосудов и почек."
  },
  "alt": {
    category: "Печеночные ферменты (CMP)",
    whatIs: "Аланинаминотрансфераза (АЛТ / АЛАТ) — внутриклеточный фермент, содержащийся преимущественно в клетках печени (гепатоцитах).",
    clinicalImpact: "Высокочувствительный индикатор повреждения печени. Повышается при жировом гепатозе (стеатозе), токсическом поражении лекарствами или алкоголем, гепатитах."
  },
  "ast": {
    category: "Печеночные ферменты (CMP)",
    whatIs: "Аспартатаминотрансфераза (АСТ / АСАТ) — фермент, присутствующий в миокарде (сердце), печени и скелетных мышцах.",
    clinicalImpact: "Оценивается в паре с АЛТ (коэффициент де Ритиса). Повышение указывает на поражение печени, повреждение сердечной мышцы или выраженные мышечные нагрузки."
  },
  "alp": {
    category: "Печеночные ферменты (CMP)",
    whatIs: "Щелочная фосфатаза (ALP) — фермент, участвующий в фосфорном обмене в клетках желчных протоков и костной ткани.",
    clinicalImpact: "Главный маркер холестаза (застоя желчи, камней в желчных путях), а также метаболизма и обновления костей."
  },
  "bilirubin_total": {
    category: "Функция печени (CMP)",
    whatIs: "Общий билирубин — желчный пигмент, образующийся при распаде гемоглобина и утилизируемый печенью.",
    clinicalImpact: "Отражает проходимость желчевыводящих путей и детоксикационную функцию печени. Повышение вызывает желтушность и зуд, указывает на застой желчи или синдром Жильбера."
  },
  "protein_total": {
    category: "Белковый обмен (CMP)",
    whatIs: "Общий белок — суммарная концентрация альбуминов и глобулинов в сыворотке крови.",
    clinicalImpact: "Поддерживает онкотическое давление (препятствует выходу жидкости в ткани и отекам), переносит питательные вещества и обеспечивает иммунитет."
  },
  "albumin": {
    category: "Белковый обмен (CMP)",
    whatIs: "Альбумин — важнейший транспортный белок крови, синтезируемый печенью (около 60% всего сывороточного белка).",
    clinicalImpact: "Предотвращает отеки, транспортирует гормоны, кальций, жирные кислоты и лекарственные препараты. Снижается при голодании, болезнях печени или потере через почки."
  },
  "sodium": {
    category: "Электролиты (CMP)",
    whatIs: "Натрий (Na) — главный внеклеточный электролит, регулирующий водный объем организма.",
    clinicalImpact: "Определяет осмолярность крови, передачу нервных импульсов и уровень артериального давления."
  },
  "potassium": {
    category: "Электролиты (CMP)",
    whatIs: "Калий (K) — ведущий внутриклеточный катион, необходимый для поляризации мембран.",
    clinicalImpact: "Жизненно важен для регулярности сердечного ритма, тонуса миокарда и нервно-мышечной возбудимости. Как дефицит, так и избыток опасны аритмиями!"
  },
  "chloride": {
    category: "Электролиты (CMP)",
    whatIs: "Хлориды (Cl) — основной анион внеклеточной жидкости, работающий в связке с натрием.",
    clinicalImpact: "Поддерживает кислотно-щелочной баланс, осмотическое давление и участвует в синтезе желудочного сока."
  },
  "calcium": {
    category: "Электролиты (CMP)",
    whatIs: "Общий кальций (Ca) — ключевой макроэлемент минерализации костей, свертывания крови и сокращения мышц.",
    clinicalImpact: "Влияет на прочность костей, сократимость сердца и нервно-мышечную передачу. Регулируется паратгормоном и витамином D."
  },
  "uric_acid": {
    category: "Метаболизм пуринов (CMP)",
    whatIs: "Мочевая кислота — продукт распада пуриновых оснований из пищи и разрушающихся клеток.",
    clinicalImpact: "Избыток кристаллизуется в суставах (подагра) и в почках (уратные камни/МКБ), а также вызывает микровоспаление в стенках сосудов."
  },

  // Lipids
  "cholesterol": {
    category: "Липидограмма (Кардиориск)",
    whatIs: "Общий холестерин — сумма всех фракций холестерина (ЛПНП, ЛПВП, ЛПОНП), циркулирующих в крови.",
    clinicalImpact: "Необходим для строительства клеточных мембран и стероидных гормонов, но при избытке откладывается в стенках артерий, приводя к атеросклерозу."
  },
  "ldl": {
    category: "Липидограмма (Кардиориск)",
    whatIs: "Холестерин липопротеинов низкой плотности (ЛПНП / LDL) — «плохой» атерогенный холестерин.",
    clinicalImpact: "Основной фактор формирования атеросклеротических бляшек в сонных и коронарных артериях. Целевой уровень напрямую определяет риск инфаркта и инсульта."
  },
  "hdl": {
    category: "Липидограмма (Кардиориск)",
    whatIs: "Холестерин липопротеинов высокой плотности (ЛПВП / HDL) — «хороший» антиатерогенный холестерин.",
    clinicalImpact: "Очищает стенки артерий, забирая излишки свободного холестерина и транспортируя их в печень для выведения (кардиопротектор)."
  },
  "triglycerides": {
    category: "Липидограмма (Кардиориск)",
    whatIs: "Триглицериды — нейтральные жиры крови, главный энергетический резерв организма.",
    clinicalImpact: "Повышение связано с инсулинорезистентностью, избытком углеводов/алкоголя в диете и ускоряет атеросклероз. При уровнях >5 ммоль/л резко возрастает риск острого панкреатита."
  },
  "lpa": {
    category: "Липидограмма (Кардиориск)",
    whatIs: "Липопротеин (a) — генетически обусловленная высокоатерогенная и протромботическая частица.",
    clinicalImpact: "Независимый генетический фактор раннего сердечно-сосудистого риска, кальциноза аортального клапана и тромбозов, не зависящий от диеты."
  },

  // Other & Markers
  "crp": {
    category: "Маркеры воспаления",
    whatIs: "С-реактивный белок (СРБ / CRP) — высокочувствительный протеин острой фазы воспаления, вырабатываемый печенью.",
    clinicalImpact: "Главный индикатор активности воспалительного процесса, инфекций, тканевого повреждения и латентного воспаления в сосудистой стенке."
  },
  "ferritin": {
    category: "Обмен железа",
    whatIs: "Ферритин — белковый комплекс, депонирующий запасы железа в тканях и органах (печень, селезенка, костный мозг).",
    clinicalImpact: "Наиболее точный маркер реального запаса железа в организме. Падение указывает на скрытый железодефицит даже при нормальном гемоглобине; резкий рост бывает при системном воспалении."
  },
  "psa_total": {
    category: "Онкомаркеры",
    whatIs: "Общий простат-специфический антиген (PSA) — органоспецифический белок, вырабатываемый эпителием предстательной железы.",
    clinicalImpact: "Основной маркер для раннего скрининга здоровья простаты. Повышается при доброкачественной гиперплазии (аденоме), простатите, а также опухолях."
  },
  "psa_free": {
    category: "Онкомаркеры",
    whatIs: "Свободная фракция ПСА (Free PSA), не связанная с транспортными белками крови.",
    clinicalImpact: "Оценивается в соотношении (Free PSA / Total PSA) для точной дифференциации доброкачественного воспаления от онкориска."
  },
  "hba1c": {
    category: "Углеводный обмен",
    whatIs: "Гликированный гемоглобин — процент гемоглобина эритроцитов, необратимо связанного с молекулами глюкозы.",
    clinicalImpact: "Отражает средний уровень сахара в крови за последние 3 месяца (срок жизни эритроцитов). Главный критерий диагностики и контроля компенсации сахарного диабета."
  },
  "vit_d": {
    category: "Витамины и гормоны",
    whatIs: "Витамин D (25-OH) — жирорастворимый прогормон, регулирующий минеральный обмен и экспрессию генов.",
    clinicalImpact: "Необходим для всасывания кальция, минерализации костей, крепкого иммунитета, мышечной силы и регуляции настроения."
  },
  "tsh": {
    category: "Щитовидная железа",
    whatIs: "Тиреотропный гормон (ТТГ) — регуляторный гормон гипофиза, управляющий выработкой гормонов щитовидной железы.",
    clinicalImpact: "Главный маркер баланса щитовидной железы. Рост ТТГ указывает на гипотиреоз (замедление метаболизма, набор веса, зябкость); снижение — на гипертиреоз."
  },
  "ft4": {
    category: "Щитовидная железа",
    whatIs: "Свободный тироксин (Т4 свободный) — основной активный гормон щитовидной железы.",
    clinicalImpact: "Регулирует скорость основного энергообмена, метаболизм белков, жиров и углеводов, температуру тела и частоту пульса."
  },

  // Urinalysis
  "urine_density": {
    category: "Общий анализ мочи",
    whatIs: "Относительная плотность (удельный вес) мочи — концентрация растворенных веществ (солей, мочевины) в моче.",
    clinicalImpact: "Отражает способность почек концентрировать мочу и степень водного баланса (гидратации) организма."
  },
  "urine_ph": {
    category: "Общий анализ мочи",
    whatIs: "pH мочи — показатель кислотности или щелочности мочи.",
    clinicalImpact: "Критический фактор камнеобразования при мочекаменной болезни (МКБ): кислая моча (pH < 5.5) провоцирует образование уратных камней; щелочная (pH > 7.0) — фосфатных."
  },
  "urine_wbc": {
    category: "Общий анализ мочи",
    whatIs: "Лейкоциты в осадке мочи (в поле зрения).",
    clinicalImpact: "Указывает на наличие воспалительного процесса или инфекции в мочевыделительной системе (цистит, уретрит, пиелонефрит)."
  },
  "urine_rbc": {
    category: "Общий анализ мочи",
    whatIs: "Эритроциты в осадке мочи (микрогематурия).",
    clinicalImpact: "Появление эритроцитов свидетельствует о травматизации слизистой камнями при МКБ, воспалении или сосудистых нарушениях в почках."
  },
  "urine_protein": {
    category: "Общий анализ мочи",
    whatIs: "Белок (протеин) в моче — появление молекул белка в моче при нарушении почечного барьера.",
    clinicalImpact: "Ключевой маркер повреждения почечных клубочков при нефропатии, артериальной гипертензии или воспалении."
  }
};

export const BIOMARKER_INFO_EN: Record<string, BiomarkerDetail> = {
  "hgb": {
    category: "Complete Blood Count (CBC)",
    whatIs: "The primary iron-containing protein inside red blood cells that transports oxygen from the lungs to all body tissues and carries carbon dioxide back.",
    clinicalImpact: "Crucial for cellular respiration, physical endurance, and brain function. Low levels indicate anemia (fatigue, shortness of breath); high levels suggest dehydration, hemoconcentration, or hypoxia."
  },
  "rbc": {
    category: "Complete Blood Count (CBC)",
    whatIs: "Red blood cells (erythrocytes) circulating in the bloodstream that carry hemoglobin molecules.",
    clinicalImpact: "Determines overall blood oxygen carrying capacity and viscosity. Low counts lead to hypoxia; elevated counts raise thrombosis risk."
  },
  "wbc": {
    category: "Complete Blood Count (CBC)",
    whatIs: "White blood cells (leukocytes) — essential immune system cells defending the body against pathogens and infection.",
    clinicalImpact: "Key marker of immune status. Elevated levels indicate infection, inflammation, or stress; low levels signal bone marrow suppression or viral vulnerability."
  },
  "plt": {
    category: "Complete Blood Count (CBC)",
    whatIs: "Blood platelets (thrombocytes) responsible for clot formation and vascular wall repair.",
    clinicalImpact: "Governs hemostasis. Low counts increase bruising and hemorrhage risk; excessive counts raise thrombosis and cardiovascular event risk."
  },
  "hct": {
    category: "Complete Blood Count (CBC)",
    whatIs: "Hematocrit — the proportion of blood volume made up of red blood cells (blood density percentage).",
    clinicalImpact: "Governs blood viscosity and cardiac workload. High in dehydration and polycythemia; low in anemia."
  },
  "esr": {
    category: "Complete Blood Count (CBC)",
    whatIs: "Erythrocyte Sedimentation Rate (ESR) — a non-specific indicator of systemic inflammation and plasma protein alteration.",
    clinicalImpact: "Reflects active inflammatory, infectious, or autoimmune processes in the body."
  },
  "mcv": {
    category: "RBC Indices (CBC)",
    whatIs: "Mean Corpuscular Volume — average size of red blood cells in femtoliters (fL).",
    clinicalImpact: "Differentiates anemia types: microcytic (<80 fL) indicates iron deficiency; macrocytic (>100 fL) points to B12/folate deficiency or liver disorder."
  },
  "mch": {
    category: "RBC Indices (CBC)",
    whatIs: "Mean Corpuscular Hemoglobin — average amount of hemoglobin inside a single red blood cell (pg).",
    clinicalImpact: "Evaluates red cell hemoglobin filling; decreased in hypochromic iron-deficiency anemias."
  },
  "mchc": {
    category: "RBC Indices (CBC)",
    whatIs: "Mean Corpuscular Hemoglobin Concentration — concentration of hemoglobin in a given volume of packed red cells.",
    clinicalImpact: "Reflects cellular hemoglobin density; changes in hereditary spherocytosis and hemoglobinopathies."
  },
  "rdw": {
    category: "RBC Indices (CBC)",
    whatIs: "Red Cell Distribution Width — variation in red blood cell volume and size (anisocytosis).",
    clinicalImpact: "Early sensitive marker of evolving iron deficiency before hemoglobin drops."
  },
  "glucose": {
    category: "Comprehensive Metabolic Panel (CMP)",
    whatIs: "Fasting blood glucose — the primary source of cellular energy for muscles, organs, and the brain.",
    clinicalImpact: "Evaluates carbohydrate metabolism. Sustained elevations damage arterial walls, accelerate atherosclerosis, and indicate insulin resistance or diabetes."
  },
  "creatinine": {
    category: "Renal Function (CMP)",
    whatIs: "Byproduct of muscle creatine breakdown filtered exclusively by the renal glomeruli.",
    clinicalImpact: "Direct metric of kidney filtration. Rising levels signal declining renal clearance or dehydration."
  },
  "urea": {
    category: "Renal Function (CMP)",
    whatIs: "Blood Urea Nitrogen (BUN) — nitrogen waste from protein breakdown produced in the liver and excreted by kidneys.",
    clinicalImpact: "Evaluates protein metabolism and kidney filtration; elevated in renal impairment, dehydration, or catabolism."
  },
  "egfr": {
    category: "Renal Function (CMP)",
    whatIs: "Estimated Glomerular Filtration Rate (CKD-EPI equation) — key index of overall kidney filtration capacity (mL/min/1.73m²).",
    clinicalImpact: "Stages renal function. Normal is >90; levels below 60 indicate chronic kidney disease (CKD) requiring nephro- and cardioprotection."
  },
  "alt": {
    category: "Liver Enzymes (CMP)",
    whatIs: "Alanine Aminotransferase (ALT / SGPT) — an intracellular enzyme predominantly found inside liver cells (hepatocytes).",
    clinicalImpact: "Highly sensitive marker of hepatic injury; increases in fatty liver (steatosis), toxic exposure, and hepatitis."
  },
  "ast": {
    category: "Liver Enzymes (CMP)",
    whatIs: "Aspartate Aminotransferase (AST / SGOT) — enzyme present in heart muscle, liver, and skeletal muscle tissue.",
    clinicalImpact: "Assessed alongside ALT (De Ritis ratio) to evaluate liver damage and myocardial or muscular strain."
  },
  "alp": {
    category: "Liver & Bone Enzymes (CMP)",
    whatIs: "Alkaline Phosphatase (ALP) — enzyme involved in phosphate transport in bile duct lining and bone tissue.",
    clinicalImpact: "Primary indicator of cholestasis (biliary obstruction/gallstones) and bone turnover."
  },
  "bilirubin_total": {
    category: "Liver Function (CMP)",
    whatIs: "Total Bilirubin — yellow pigment produced from the normal breakdown of hemoglobin and processed by the liver.",
    clinicalImpact: "Reflects biliary clearance and hepatic detoxification; elevated in biliary obstruction, hemolysis, or Gilbert syndrome."
  },
  "protein_total": {
    category: "Protein Metabolism (CMP)",
    whatIs: "Total Protein — combined concentration of serum albumin and globulins.",
    clinicalImpact: "Maintains intravascular oncotic pressure preventing edema, transports molecules, and supports immunity."
  },
  "albumin": {
    category: "Protein Metabolism (CMP)",
    whatIs: "Serum Albumin — major transport protein synthesized by the liver, making up ~60% of total plasma protein.",
    clinicalImpact: "Prevents fluid leakage into tissues (edema), transports hormones, calcium, and drugs. Decreased in liver or kidney disease."
  },
  "sodium": {
    category: "Electrolytes (CMP)",
    whatIs: "Sodium (Na) — dominant extracellular cation governing total body water balance and fluid distribution.",
    clinicalImpact: "Controls blood osmolarity, nerve conduction, and blood pressure regulation."
  },
  "potassium": {
    category: "Electrolytes (CMP)",
    whatIs: "Potassium (K) — primary intracellular electrolyte vital for cell membrane polarization.",
    clinicalImpact: "Crucial for heart rhythm stability and muscle contraction; both high and low levels can cause life-threatening arrhythmias."
  },
  "chloride": {
    category: "Electrolytes (CMP)",
    whatIs: "Chloride (Cl) — major extracellular anion working closely with sodium.",
    clinicalImpact: "Maintains acid-base equilibrium, osmotic pressure, and produces gastric hydrochloric acid."
  },
  "calcium": {
    category: "Electrolytes (CMP)",
    whatIs: "Total Calcium (Ca) — essential mineral for bone density, blood clotting, and neuromuscular signaling.",
    clinicalImpact: "Regulates bone integrity, muscle contraction, and vascular tone; controlled by PTH and vitamin D."
  },
  "uric_acid": {
    category: "Purine Metabolism (CMP)",
    whatIs: "Uric Acid — final oxidation product of purine nucleotide metabolism.",
    clinicalImpact: "Excess forms crystals causing gouty arthritis, kidney stones (nephrolithiasis), and vascular endothelial stress."
  },
  "cholesterol": {
    category: "Lipid Profile (Cardiovascular Risk)",
    whatIs: "Total Cholesterol — sum of all cholesterol fractions circulating in blood plasma.",
    clinicalImpact: "Essential building block for hormones and cell membranes; excess deposits into arterial walls fostering atherosclerotic plaques."
  },
  "ldl": {
    category: "Lipid Profile (Cardiovascular Risk)",
    whatIs: "Low-Density Lipoprotein Cholesterol (LDL-C) — atherogenic 'bad' cholesterol.",
    clinicalImpact: "Directly penetrates arterial intima to form plaques in carotid and coronary arteries; primary target for cardiovascular risk reduction."
  },
  "hdl": {
    category: "Lipid Profile (Cardiovascular Risk)",
    whatIs: "High-Density Lipoprotein Cholesterol (HDL-C) — cardioprotective 'good' cholesterol.",
    clinicalImpact: "Promotes reverse cholesterol transport, removing excess cholesterol from blood vessels back to the liver for excretion."
  },
  "triglycerides": {
    category: "Lipid Profile (Cardiovascular Risk)",
    whatIs: "Triglycerides — primary circulating storage form of dietary and synthesized fat.",
    clinicalImpact: "Elevations correlate with insulin resistance and atherogenesis; levels >5 mmol/L trigger acute pancreatitis risk."
  },
  "lpa": {
    category: "Lipid Profile (Cardiovascular Risk)",
    whatIs: "Lipoprotein(a) — genetically inherited, highly atherogenic and thrombogenic variant of LDL.",
    clinicalImpact: "Independent genetic risk factor for premature coronary artery disease, carotid stenosis, and aortic valve calcification."
  },
  "crp": {
    category: "Inflammatory Markers",
    whatIs: "C-Reactive Protein (CRP) — acute-phase protein synthesized by the liver in response to cytokines.",
    clinicalImpact: "Gold standard marker of systemic inflammation, infection, surgical healing, and latent vascular endothelial inflammation."
  },
  "ferritin": {
    category: "Iron Status",
    whatIs: "Ferritin — intracellular protein that stores iron and releases it in a controlled fashion.",
    clinicalImpact: "Most reliable measure of total body iron stores. Low levels diagnose latent iron deficiency; elevated during systemic inflammation."
  },
  "psa_total": {
    category: "Tumor & Prostate Markers",
    whatIs: "Total Prostate-Specific Antigen (PSA) — enzyme produced by prostate epithelial cells.",
    clinicalImpact: "Primary screening test for prostate conditions (BPH, prostatitis, and early prostate neoplasia detection)."
  },
  "psa_free": {
    category: "Tumor & Prostate Markers",
    whatIs: "Free PSA — unbound fraction of prostate-specific antigen in serum.",
    clinicalImpact: "Ratio of free to total PSA improves diagnostic specificity between benign enlargement and malignant changes."
  },
  "hba1c": {
    category: "Glycemic Control",
    whatIs: "Hemoglobin A1c (Glycated Hemoglobin) — percentage of hemoglobin bound to glucose over red cell lifespan.",
    clinicalImpact: "Reflects mean 3-month blood glucose control; gold standard diagnostic and therapeutic metric for diabetes mellitus."
  },
  "vit_d": {
    category: "Vitamins & Hormones",
    whatIs: "25-Hydroxyvitamin D — circulating pre-hormone crucial for calcium and phosphate homeostasis.",
    clinicalImpact: "Supports bone mineral density, neuromuscular coordination, immune function, and insulin sensitivity."
  },
  "tsh": {
    category: "Thyroid Function",
    whatIs: "Thyroid-Stimulating Hormone (TSH) — pituitary hormone controlling thyroid gland secretion.",
    clinicalImpact: "Primary screening parameter for thyroid dysfunction; elevated in hypothyroidism, suppressed in hyperthyroidism."
  },
  "ft4": {
    category: "Thyroid Function",
    whatIs: "Free Thyroxine (FT4) — unbound active circulating thyroid hormone.",
    clinicalImpact: "Regulates basal metabolic rate, protein synthesis, body temperature, and cardiac contractility."
  },
  "urine_density": {
    category: "Urinalysis",
    whatIs: "Specific Gravity of urine — density of urine relative to water reflecting dissolved solutes.",
    clinicalImpact: "Measures kidney concentrating ability and systemic hydration state."
  },
  "urine_ph": {
    category: "Urinalysis",
    whatIs: "Urinary pH — acidity or alkalinity of urine.",
    clinicalImpact: "Key risk determinant in kidney stone disease (nephrolithiasis); acidic urine promotes uric acid stones, alkaline fosters phosphate stones."
  },
  "urine_wbc": {
    category: "Urinalysis",
    whatIs: "WBC in urinary sediment (pyuria per high-power field).",
    clinicalImpact: "Indicates infection or inflammatory reaction in the urinary tract (cystitis, pyelonephritis)."
  },
  "urine_rbc": {
    category: "Urinalysis",
    whatIs: "RBC in urinary sediment (hematuria per high-power field).",
    clinicalImpact: "Signals mucosal irritation by kidney stones, glomerulonephritis, or urinary tract injury."
  },
  "urine_protein": {
    category: "Urinalysis",
    whatIs: "Urinary protein (proteinuria) — presence of excess serum proteins in urine.",
    clinicalImpact: "Sensitive indicator of glomerular membrane damage, hypertension-induced nephrosclerosis, or renal inflammation."
  }
};

/**
 * Fuzzy matches any metric name to its canonical key and returns localized detailed explanation.
 */
export function getBiomarkerDetail(metricName: string, lang: 'ru' | 'en' = 'ru'): BiomarkerDetail | null {
  const s = metricName.toLowerCase();
  let key: string | null = null;

  if (s.includes('гемоглобин') || s.includes('hgb') || (s.includes('hb') && !s.includes('hba1c'))) key = 'hgb';
  else if (s.includes('эритроциты') || s.includes('rbc') || s.includes('еритроцити')) key = 'rbc';
  else if (s.includes('лейкоциты') || s.includes('wbc') || s.includes('левкоцити')) {
    if (s.includes('моч') || s.includes('урин') || s.includes('седимент')) key = 'urine_wbc';
    else key = 'wbc';
  }
  else if (s.includes('тромбоциты') || s.includes('plt') || s.includes('тромбоцити')) key = 'plt';
  else if (s.includes('гематокрит') || s.includes('hct') || s.includes('хематокрит')) key = 'hct';
  else if (s.includes('соэ') || s.includes('суе') || s.includes('esr')) key = 'esr';
  else if (s.includes('mcv')) key = 'mcv';
  else if (s.includes('mchc')) key = 'mchc';
  else if (s.includes('mch')) key = 'mch';
  else if (s.includes('rdw')) key = 'rdw';
  else if (s.includes('глюкоза') || s.includes('glucose') || s.includes('glu')) key = 'glucose';
  else if (s.includes('креатинин') || s.includes('creatinine') || s.includes('crea')) key = 'creatinine';
  else if (s.includes('мочевина') || s.includes('урея') || s.includes('bun') || s.includes('urea')) key = 'urea';
  else if (s.includes('egfr') || s.includes('скф')) key = 'egfr';
  else if (s.includes('алт') || s.includes('алат') || s.includes('alt')) key = 'alt';
  else if (s.includes('аст') || s.includes('асат') || s.includes('ast')) key = 'ast';
  else if (s.includes('фосфатаза') || s.includes('alp')) key = 'alp';
  else if (s.includes('билирубин') || s.includes('bilirubin')) key = 'bilirubin_total';
  else if (s.includes('общий белок') || s.includes('общ белтък') || s.includes('total protein')) key = 'protein_total';
  else if (s.includes('альбумин') || s.includes('албумин') || s.includes('albumin')) key = 'albumin';
  else if (s.includes('натрий') || s.includes('sodium') || s.includes('na')) key = 'sodium';
  else if (s.includes('калий') || s.includes('potassium') || s.includes('k')) key = 'potassium';
  else if (s.includes('хлор') || s.includes('хлориды') || s.includes('chloride') || s.includes('cl')) key = 'chloride';
  else if (s.includes('кальций') || s.includes('калций') || s.includes('calcium') || s.includes('ca')) key = 'calcium';
  else if (s.includes('мочевая кислота') || s.includes('пикочна') || s.includes('uric')) key = 'uric_acid';
  else if (s.includes('лпнп') || s.includes('ldl')) key = 'ldl';
  else if (s.includes('лпвп') || s.includes('hdl')) key = 'hdl';
  else if (s.includes('триглицериды') || s.includes('триглицериди') || s.includes('triglyceride')) key = 'triglycerides';
  else if (s.includes('холестерин') || s.includes('холестерол') || s.includes('cholesterol')) key = 'cholesterol';
  else if (s.includes('липопротеин') || s.includes('lipoprotein')) key = 'lpa';
  else if (s.includes('срб') || s.includes('crp') || s.includes('реактивен протеин')) key = 'crp';
  else if (s.includes('ферритин') || s.includes('феритин') || s.includes('ferritin')) key = 'ferritin';
  else if (s.includes('свободный') && (s.includes('пса') || s.includes('psa'))) key = 'psa_free';
  else if (s.includes('пса') || s.includes('psa')) key = 'psa_total';
  else if (s.includes('гликированный') || s.includes('hba1c') || s.includes('a1c')) key = 'hba1c';
  else if (s.includes('витамин d') || s.includes('25-oh')) key = 'vit_d';
  else if (s.includes('ттг') || s.includes('tsh')) key = 'tsh';
  else if (s.includes('т4') || s.includes('ft4')) key = 'ft4';
  else if (s.includes('плотность') || s.includes('удельный') || s.includes('тегло') || s.includes('gravity')) key = 'urine_density';
  else if (s.includes('ph') || s.includes('рн')) key = 'urine_ph';
  else if (s.includes('белок в моче') || s.includes('белтък в урина')) key = 'urine_protein';
  else if (s.includes('эритроциты в моче') || s.includes('еритроцити урина')) key = 'urine_rbc';

  if (!key) return null;

  const dict = lang === 'ru' ? BIOMARKER_INFO_RU : BIOMARKER_INFO_EN;
  return dict[key] || null;
}
