import re
import os
from typing import List, Dict, Any, Optional
from pypdf import PdfReader

# Known biomarker patterns for auto-extraction from Russian/English/Bulgarian lab test sheets
BIOMARKER_PATTERNS = [
    # (regex_pattern, canonical_name, default_unit, default_min, default_max)
    (r"(?:гемоглобин|хемоглобин|hgb|hb)[\s:]+([0-9]+(?:[.,][0-9]+)?)", "Гемоглобин", "г/л", 135.0, 180.0),
    (r"(?:ферритин|феритин|ferritin)[\s:]+([0-9]+(?:[.,][0-9]+)?)", "Ферритин", "мкг/л", 30.0, 400.0),
    (r"(?:lipoprotein\s*\(a\)|липопротеин\s*\(а\)|lp\s*\(a\))[\s:]+([0-9]+(?:[.,][0-9]+)?)", "Липопротеин (a)", "нмоль/л", 0.0, 75.0),
    (r"(?:витамин\s*d|25-oh|vit\s*d)[\s:]+([0-9]+(?:[.,][0-9]+)?)", "Витамин D (25-OH)", "нг/мл", 30.0, 100.0),
    (r"(?:глюкоза|glucose|сахар)[\s:]+([0-9]+(?:[.,][0-9]+)?)", "Глюкоза", "ммоль/л", 3.9, 6.1),
    (r"(?:холестерин\s*общий|холестерин|cholesterol)[\s:]+([0-9]+(?:[.,][0-9]+)?)", "Холестерин общий", "ммоль/л", 3.0, 5.2),
    (r"(?:ттг|tsh)[\s:]+([0-9]+(?:[.,][0-9]+)?)", "ТТГ (Тиреотропный гормон)", "мЕд/л", 0.4, 4.0),
    (r"(?:т4\s*свободный|ft4)[\s:]+([0-9]+(?:[.,][0-9]+)?)", "Т4 свободный", "пмоль/л", 9.0, 19.0),
    (r"(?:алт|alt)[\s:]+([0-9]+(?:[.,][0-9]+)?)", "АЛТ", "Ед/л", 0.0, 41.0),
    (r"(?:аст|ast)[\s:]+([0-9]+(?:[.,][0-9]+)?)", "АСТ", "Ед/л", 0.0, 37.0),
    (r"(?:креатинин|creatinine)[\s:]+([0-9]+(?:[.,][0-9]+)?)", "Креатинин", "мкмоль/л", 62.0, 115.0),
    (r"(?:мочевая\s*кислота|uric\s*acid)[\s:]+([0-9]+(?:[.,][0-9]+)?)", "Мочевая кислота", "мкмоль/л", 200.0, 420.0),
    (r"(?:с-реактивный\s*белок|срб|crp)[\s:]+([0-9]+(?:[.,][0-9]+)?)", "С-реактивный белок (СРБ)", "мг/л", 0.0, 5.0),
    (r"(?:лейкоциты|леbкоцити|wbc)[\s:]+([0-9]+(?:[.,][0-9]+)?)", "Лейкоциты", "10^9/л", 4.0, 9.0),
    (r"(?:эритроциты|еритроцити|rbc)[\s:]+([0-9]+(?:[.,][0-9]+)?)", "Эритроциты", "10^12/л", 4.4, 5.9),
    (r"(?:тромбоциты|тромбоцити|plt)[\s:]+([0-9]+(?:[.,][0-9]+)?)", "Тромбоциты", "10^9/л", 150.0, 400.0),
    (r"(?:хематокрит|гематокрит|hct)[\s:]+([0-9]+(?:[.,][0-9]+)?)", "Гематокрит", "л/л", 0.40, 0.50),
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

def parse_lab_metrics(text: str, default_date: str) -> List[Dict[str, Any]]:
    """Automatically scans text for known lab metrics and extracted values."""
    metrics = []
    lower_text = text.lower()
    
    # Try finding an explicit date in the text (e.g. 26.05.2026 or 2026-05-26)
    date_match = re.search(r"(\d{2})[./](\d{2})[./](\d{4})", text)
    record_date = default_date
    if date_match:
        d, m, y = date_match.groups()
        record_date = f"{y}-{m}-{d}"
    
    for pattern, name, unit, ref_min, ref_max in BIOMARKER_PATTERNS:
        matches = re.finditer(pattern, lower_text)
        for match in matches:
            val_str = match.group(1).replace(",", ".")
            try:
                val = float(val_str)
                # Check status
                status = "normal"
                if ref_min is not None and val < ref_min:
                    status = "low"
                elif ref_max is not None and val > ref_max:
                    status = "high"
                
                metrics.append({
                    "metric_name": name,
                    "value": val,
                    "unit": unit,
                    "reference_min": ref_min,
                    "reference_max": ref_max,
                    "status": status,
                    "record_date": record_date,
                    "notes": f"Найдено в документе: {match.group(0)}"
                })
                break
            except ValueError:
                continue

    return metrics
