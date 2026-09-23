import re
from typing import List, Dict, Any, Optional
from pypdf import PdfReader

# Known biomarker patterns for auto-extraction from Russian/English lab test sheets
BIOMARKER_PATTERNS = [
    # (regex_pattern, canonical_name, default_unit, default_min, default_max)
    (r"(?:гемоглобин|hgb|hb)[\s:]+([0-9]+(?:[.,][0-9]+)?)", "Гемоглобин", "г/л", 120.0, 160.0),
    (r"(?:ферритин|ferritin)[\s:]+([0-9]+(?:[.,][0-9]+)?)", "Ферритин", "мкг/л", 30.0, 200.0),
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
    (r"(?:лейкоциты|wbc)[\s:]+([0-9]+(?:[.,][0-9]+)?)", "Лейкоциты", "10^9/л", 4.0, 9.0),
    (r"(?:эритроциты|rbc)[\s:]+([0-9]+(?:[.,][0-9]+)?)", "Эритроциты", "10^12/л", 3.8, 5.3),
    (r"(?:тромбоциты|plt)[\s:]+([0-9]+(?:[.,][0-9]+)?)", "Тромбоциты", "10^9/л", 150.0, 400.0),
]

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
    """Extracts text depending on extension."""
    ext = filename.lower().split(".")[-1]
    if ext == "pdf":
        return extract_text_from_pdf(filepath)
    elif ext in ["txt", "md", "csv"]:
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        except Exception as e:
            return f"Ошибка чтения текстового файла: {str(e)}"
    else:
        return f"Текстовое содержимое для файла {filename} (тип: {ext})"

def parse_lab_metrics(text: str, default_date: str) -> List[Dict[str, Any]]:
    """Automatically scans text for known lab metrics and extracted values."""
    metrics = []
    lower_text = text.lower()
    
    # Try finding an explicit date in the text (e.g. 12.05.2024 or 2024-05-12)
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
                # take first match for this biomarker to prevent duplicates in one doc
                break
            except ValueError:
                continue

    return metrics
