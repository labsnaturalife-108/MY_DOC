import re
import os
from typing import List, Dict, Any, Optional
from pypdf import PdfReader

# Comprehensive definitions of all medical biomarker panels
# (Panel, Canonical Name, Default Unit, Default Min, Default Max, Regex Patterns)
BIOMARKER_DEFS = [
    # -------------------------------------------------------------
    # 1. Complete Blood Count (CBC) — Общий анализ крови с формулой
    # -------------------------------------------------------------
    ('CBC', 'Гемоглобин (Hb)', 'г/л', 130.0, 175.0, [
        r'(?:хемоглобин|гемоглобин|hemoglobin|hgb|(?<![a-zA-Zа-яА-Я0-9])hb)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CBC', 'Эритроциты (RBC)', '10^12/л', 4.0, 5.7, [
        r'(?:еритроцити|эритроциты|red\s*blood\s*cells?|(?<![a-zA-Zа-яА-Я0-9])rbc)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CBC', 'Лейкоциты (WBC)', '10^9/л', 4.0, 9.0, [
        r'(?:левкоцити|лейкоциты|white\s*blood\s*cells?|(?<![a-zA-Zа-яА-Я0-9])wbc)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CBC', 'Тромбоциты (PLT)', '10^9/л', 150.0, 400.0, [
        r'(?:тромбоцити|тромбоциты|platelets?|(?<![a-zA-Zа-яА-Я0-9])plt)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CBC', 'Гематокрит (HCT)', '%', 38.0, 50.0, [
        r'(?:хематорит|хематокрит|гематокрит|hematocrit|(?<![a-zA-Zа-яА-Я0-9])hct)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CBC', 'СОЭ / СУЕ (ESR)', 'мм/ч', 2.0, 30.0, [
        r'(?:суе|соэ|esr)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),

    # -------------------------------------------------------------
    # 2. Comprehensive Metabolic Panel (CMP) — Метаболическая панель
    # -------------------------------------------------------------
    ('CMP', 'Глюкоза (Glucose)', 'ммоль/л', 3.9, 6.1, [
        r'(?:глюкоза(?:\s*серумна)?|glucose|сахар\s*крови)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'Креатинин', 'мкмоль/л', 62.0, 115.0, [
        r'(?:креатинин|creatinine|creat)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'Мочевина / Урея (BUN)', 'ммоль/л', 2.5, 8.3, [
        r'(?:урея|азот\s*мочевины|мочевина|bun|blood\s*urea\s*nitrogen|urea)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'eGFR (СКФ)', 'мл/мин/1.73м²', 90.0, 120.0, [
        r'(?:egfr|скф|скорость\s*клубочковой\s*фильтрации)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'АЛТ / АЛАТ (ALT)', 'Ед/л', 0.0, 41.0, [
        r'(?:алат|алт|аланинаминотрансфераза|alt|sgpt)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'АСТ / АСАТ (AST)', 'Ед/л', 0.0, 37.0, [
        r'(?:асат|аст|аспартатаминотрансфераза|ast|sgot)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'Щелочная фосфатаза (ALP)', 'Ед/л', 40.0, 130.0, [
        r'(?:алкална\s*фосфатаза|щелочная\s*фосфатаза|аф(?:\s*\(\s*alp\s*\))?|alp|alkaline\s*phosphatase)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'Общий билирубин', 'мкмоль/л', 3.4, 21.0, [
        r'(?:билирубин-общ|общий\s*билирубин|билирубин\s*общ(?:ий)?|total\s*bilirubin|bill-t)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'Общий белок (Total Protein)', 'г/л', 60.0, 83.0, [
        r'(?:общ\s*белтък|общий\s*белок|белок\s*общий|total\s*protein)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'Альбумин', 'г/л', 35.0, 52.0, [
        r'(?:албумин|альбумин|albumin)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'Натрий (Na)', 'ммоль/л', 135.0, 148.0, [
        r'(?:натрий|sodium|na)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'Калий (K)', 'ммоль/л', 3.5, 5.2, [
        r'(?:калий|potassium|k)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'Хлориды (Cl)', 'ммоль/л', 96.0, 110.0, [
        r'(?:хлориди|хлориды|хлор|chloride|cl)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'Кальций общий (Ca)', 'ммоль/л', 2.15, 2.55, [
        r'(?:калций(?:\s*общ)?|кальций\s*общий|общий\s*кальций|calcium|ca)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'Бикарбонат / CO2', 'ммоль/л', 22.0, 29.0, [
        r'(?:бикарбонат|бикарбонаты|углекислый\s*газ|bicarbonate|co2|hco3)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),

    # -------------------------------------------------------------
    # 3. Lipid Panel (Липидограмма — Сердечно-сосудистый профиль)
    # -------------------------------------------------------------
    ('Lipid Panel', 'Общий холестерин', 'ммоль/л', 3.0, 5.2, [
        r'(?:общ\s*холестерол|холестерол(?:\s*общ)?|общий\s*холестерин|холестерин\s*общий|total\s*cholesterol)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Lipid Panel', 'Холестерин ЛПНП (LDL)', 'ммоль/л', 1.4, 3.0, [
        r'(?:ldl-холестерол|ldl\s*холестерол|холестерин\s*лпнп|холестерол\s*лпнп|лпнп|ldl-c|ldl\s*cholesterol)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Lipid Panel', 'Холестерин ЛПВП (HDL)', 'ммоль/л', 1.2, 2.0, [
        r'(?<!non-)(?<!non\s)(?<!non\s-)(?<!non)hdl[-\s]*(?:холестерол|холестерин|cholesterol|c)?(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Lipid Panel', 'Триглицериды', 'ммоль/л', 0.5, 1.7, [
        r'(?:триглицериди|триглицериды|triglycerides|trg)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Lipid Panel', 'Липопротеин (a)', 'нмоль/л', 0.0, 75.0, [
        r'(?:lipoprotein\s*\(a\)|липопротеин\s*\(а\)|lp\s*\(a\))(?:\s*\([^)]*\))?[\s\S]{0,100}?([0-9]+(?:[.,][0-9]+)?)\s*nmol',
        r'(?:lipoprotein\s*\(a\)|липопротеин\s*\(а\)|lp\s*\(a\))(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),

    # -------------------------------------------------------------
    # 4. Hemoglobin A1c (HbA1c — Гликированный гемоглобин / Диабет)
    # -------------------------------------------------------------
    ('HbA1c / Диабет', 'Гликированный гемоглобин (HbA1c)', '%', 4.0, 5.7, [
        r'(?:hba1c|гликированный\s*гемоглобин|гликозилированный\s*гемоглобин|a1c)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),

    # -------------------------------------------------------------
    # 5. Urinalysis (UA — Общий анализ мочи)
    # -------------------------------------------------------------
    ('Urinalysis', 'Относительная плотность мочи', 'г/мл', 1.008, 1.030, [
        r'(?:относително\s*тегло|удельный\s*вес|specific\s*gravity)(?:\s*\([^)]*\))?[\s:=|\t\n]+([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Urinalysis', 'pH мочи', 'pH', 5.0, 7.5, [
        r'(?:ph\s*\(\s*урина\s*\)|ph\s*мочи|urinary\s*ph)(?:\s*\([^)]*\))?[\s:=|\t\n]+([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Urinalysis', 'Лейкоциты в моче (WBC мочи)', 'в п/зр', 0.0, 5.0, [
        r'(?:седимент\s*-\s*левкоцити|лейкоциты\s*в\s*моче|sediment\s*wbcs?)(?:\s*\([^)]*\))?[\s:=|\t\n]+([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Urinalysis', 'Эритроциты в моче (RBC мочи)', 'в п/зр', 0.0, 2.0, [
        r'(?:седимент\s*-\s*еритроцити|эритроциты\s*в\s*моче|sediment\s*rbcs?)(?:\s*\([^)]*\))?[\s:=|\t\n]+([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Urinalysis', 'Белок в моче', 'г/л', 0.0, 0.14, [
        r'(?:белок\s*в\s*моче|белтък\s*в\s*урина|protein\s*urine)(?:\s*\([^)]*\))?[\s:=|\t\n]+([0-9]+(?:[.,][0-9]+)?)',
    ]),

    # -------------------------------------------------------------
    # 6. Другие ключевые биомаркеры (дефициты, щитовидная железа)
    # -------------------------------------------------------------
    ('Другие маркеры', 'Ферритин', 'мкг/л', 30.0, 400.0, [
        r'(?:ferritin|ферритин|феритин)[\s\S]{0,120}?([0-9]+(?:[.,][0-9]+)?)\s*(?:ug|µg|мкг|ng)',
        r'(?:феритин|ферритин|ferritin)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Другие маркеры', 'Витамин D (25-OH)', 'нг/мл', 30.0, 100.0, [
        r'(?:витамин\s*d|25-oh|vit\s*d)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Другие маркеры', 'С-реактивный белок (СРБ)', 'мг/л', 0.0, 5.0, [
        r'(?:с-реактивный\s*белок|срб|crp)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Другие маркеры', 'Мочевая кислота', 'мкмоль/л', 200.0, 420.0, [
        r'(?:пикочна\s*киселина|мочевая\s*кислота|uric\s*acid)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Другие маркеры', 'ТТГ (Тиреотропный гормон)', 'мЕд/л', 0.4, 4.0, [
        r'(?:ттг|tsh)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Другие маркеры', 'Т4 свободный', 'пмоль/л', 9.0, 19.0, [
        r'(?:т4\s*свободный|ft4)(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
]

def extract_text_from_image(filepath: str) -> str:
    """Uses macOS Apple Vision framework to OCR images accurately in Russian, English, Bulgarian."""
    try:
        import Vision
        from Cocoa import NSURL, NSDictionary
        url = NSURL.fileURLWithPath_(filepath)
        handler = Vision.VNImageRequestHandler.alloc().initWithURL_options_(url, NSDictionary.dictionary())
        request = Vision.VNRecognizeTextRequest.alloc().init()
        request.setRecognitionLanguages_(['ru-RU', 'en-US', 'bg-BG'])
        request.setRecognitionLevel_(Vision.VNRequestTextRecognitionLevelAccurate)
        success, error = handler.performRequests_error_([request], None)
        results = request.results()
        text = []
        if results:
            for r in results:
                candidates = r.topCandidates_(1)
                if candidates:
                    text.append(candidates[0].string())
        if text:
            return "\n".join(text)
    except Exception as e:
        print(f"OCR error: {e}")
    return ""

def extract_text_from_pdf(filepath: str) -> str:
    """Extracts text content from a PDF file."""
    text_chunks = []
    try:
        reader = PdfReader(filepath)
        for page_idx, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text_chunks.append(f"--- Страница {page_idx + 1} ---\n{page_text.strip()}")
    except Exception as e:
        return f"Ошибка чтения PDF: {str(e)}"
    return "\n\n".join(text_chunks)

def extract_text_from_file(filepath: str, filename: str) -> str:
    """Extracts text depending on extension, using Vision OCR for images."""
    ext = filename.lower().split(".")[-1]
    if ext == "pdf":
        return extract_text_from_pdf(filepath)
    elif ext in ["png", "jpg", "jpeg", "webp", "tiff", "bmp"]:
        ocr_text = extract_text_from_image(filepath)
        if ocr_text:
            return f"--- Распознанный текст исследования ({filename}) ---\n{ocr_text}"
        return f"Медицинское изображение: {filename}"
    elif ext in ["txt", "md", "csv"]:
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        except Exception as e:
            return f"Ошибка чтения текстового файла: {str(e)}"
    else:
        return f"Документ: {filename}"

def extract_test_date(text: str, default_date: str) -> str:
    """
    Intelligently extracts the test sample / registration date (YYYY-MM-DD),
    prioritizing sampling indicators and ignoring birth dates.
    """
    # 1. Look for explicit sample collection or test date
    sample_match = re.search(
        r'(?:материал\s*взет\s*на|дата\s*взятия|дата\s*забора|дата\s*исследования|регистрация|справката\s*е\s*отпечатана\s*на|отпечатана\s*на|изследване\s*на)[\s:]+(\d{2})[./](\d{2})[./](\d{4})',
        text,
        re.IGNORECASE
    )
    if sample_match:
        d, m, y = sample_match.groups()
        return f"{y}-{m}-{d}"

    # 2. Look for any DD.MM.YYYY or YYYY-MM-DD not preceded by birth date keywords
    all_dates = re.finditer(r'(\d{2})[./](\d{2})[./](\d{4})', text)
    for match in all_dates:
        start = max(0, match.start() - 30)
        prefix = text[start:match.start()].lower()
        if any(w in prefix for w in ["роден", "рожд", "birth", "д.р.", "р.р."]):
            continue
        d, m, y = match.groups()
        if int(y) >= 2000:
            return f"{y}-{m}-{d}"

    iso_date = re.search(r'(\d{4})-(\d{2})-(\d{2})', text)
    if iso_date:
        y, m, d = iso_date.groups()
        if int(y) >= 2000:
            return f"{y}-{m}-{d}"

    return default_date

def parse_lab_metrics(text: str, default_date: str, patient_age: Optional[int] = 50, patient_gender: Optional[str] = "male") -> List[Dict[str, Any]]:
    """
    Automatically scans text for known lab metrics and extracted values
    across CBC, CMP, Lipid Panel, HbA1c, Urinalysis, and other panels.
    """
    metrics = []
    record_date = extract_test_date(text, default_date)
    found_names = set()

    creatinine_val = None

    for panel, name, unit, default_min, default_max, pattern_list in BIOMARKER_DEFS:
        if name in found_names:
            continue

        for pattern in pattern_list:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                val_str = match.group(1).replace(",", ".")
                try:
                    val = float(val_str)
                    
                    # Convert Hematocrit to percentage if recorded in L/L (e.g. 0.49 -> 49%)
                    if 'гематокрит' in name.lower() and val < 1.0:
                        val = round(val * 100, 1)

                    ref_min = default_min
                    ref_max = default_max

                    # Check status
                    status = "normal"
                    if ref_min is not None and val < ref_min:
                        status = "low"
                    elif ref_max is not None and val > ref_max:
                        status = "high"

                    metrics.append({
                        "metric_name": name,
                        "panel": panel,
                        "value": val,
                        "unit": unit,
                        "reference_min": ref_min,
                        "reference_max": ref_max,
                        "status": status,
                        "record_date": record_date,
                        "notes": f"[{panel}] Распознано из бланка анализа"
                    })
                    found_names.add(name)

                    if name == "Креатинин":
                        creatinine_val = val

                    break
                except ValueError:
                    continue

    # Auto-calculate eGFR (CKD-EPI 2021) if Creatinine was found but eGFR wasn't printed
    if creatinine_val and "eGFR (СКФ)" not in found_names:
        try:
            # Creatinine in mg/dL
            scr = creatinine_val / 88.4
            is_female = (patient_gender or "").lower() in ["female", "f", "женский", "ж"]
            age_val = patient_age or 50

            if is_female:
                kappa = 0.7
                alpha = -0.241
                gender_mult = 1.012
            else:
                kappa = 0.9
                alpha = -0.302
                gender_mult = 1.0

            ratio = scr / kappa
            calculated_egfr = 142.0 * (min(ratio, 1.0) ** alpha) * (max(ratio, 1.0) ** -1.200) * (0.9938 ** age_val) * gender_mult
            egfr_val = round(calculated_egfr, 1)

            metrics.append({
                "metric_name": "eGFR (СКФ)",
                "panel": "CMP",
                "value": egfr_val,
                "unit": "мл/мин/1.73м²",
                "reference_min": 90.0,
                "reference_max": 120.0,
                "status": "normal" if egfr_val >= 90.0 else ("low" if egfr_val < 60.0 else "borderline"),
                "record_date": record_date,
                "notes": "[CMP] Расчет по формуле CKD-EPI на основе креатинина"
            })
        except Exception:
            pass

    return metrics
