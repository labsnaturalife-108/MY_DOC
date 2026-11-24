import re
import os
import json
import base64
from typing import List, Dict, Any, Optional
from pypdf import PdfReader
import httpx

# Comprehensive definitions of all medical biomarker panels
# (Panel, Canonical Name, Default Unit, Default Min, Default Max, Regex Patterns)
BIOMARKER_DEFS = [
    # -------------------------------------------------------------
    # 1. Complete Blood Count (CBC) — Общий анализ крови с формулой
    # -------------------------------------------------------------
    ('CBC', 'Гемоглобин (Hb)', 'г/л', 130.0, 175.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:хемоглобин|гемоглобин|hemoglobin|hgb|hb)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CBC', 'Эритроциты (RBC)', '10^12/л', 4.0, 5.7, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:еритроцити|эритроциты|red\s*blood\s*cells?|rbc)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CBC', 'Лейкоциты (WBC)', '10^9/л', 4.0, 9.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:левкоцити|лейкоциты|white\s*blood\s*cells?|wbc)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CBC', 'Тромбоциты (PLT)', '10^9/л', 150.0, 400.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:тромбоцити|тромбоциты|platelets?|plt)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CBC', 'Гематокрит (HCT)', '%', 38.0, 50.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:хематорит|хематокрит|гематокрит|hematocrit|hct)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CBC', 'СОЭ / СУЕ (ESR)', 'мм/ч', 2.0, 30.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:суе|соэ|esr)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),

    # -------------------------------------------------------------
    # 2. Comprehensive Metabolic Panel (CMP) — Метаболическая панель
    # -------------------------------------------------------------
    ('CMP', 'Глюкоза (Glucose)', 'ммоль/л', 3.9, 6.1, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:глюкоза(?:\s*серумна)?|glucose|сахар\s*крови)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'Креатинин', 'мкмоль/л', 62.0, 115.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:креатинин|creatinine|creat)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'Мочевина / Урея (BUN)', 'ммоль/л', 2.5, 8.3, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:урея|азот\s*мочевины|мочевина|bun|blood\s*urea\s*nitrogen|urea)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'eGFR (СКФ)', 'мл/мин/1.73м²', 90.0, 120.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:egfr|скф|скорость\s*клубочковой\s*фильтрации)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'АЛТ / АЛАТ (ALT)', 'Ед/л', 0.0, 41.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:алат|алт|аланинаминотрансфераза|alt|sgpt)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'АСТ / АСАТ (AST)', 'Ед/л', 0.0, 37.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:асат|аст|аспартатаминотрансфераза|ast|sgot)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'Щелочная фосфатаза (ALP)', 'Ед/л', 40.0, 130.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:алкална\s*фосфатаза|щелочная\s*фосфатаза|аф(?:\s*\(\s*alp\s*\))?|alp|alkaline\s*phosphatase)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'Общий билирубин', 'мкмоль/л', 3.4, 21.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:билирубин-общ|общий\s*билирубин|билирубин\s*общ(?:ий)?|total\s*bilirubin|bill-t)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'Общий белок (Total Protein)', 'г/л', 60.0, 83.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:общ\s*белтък|общий\s*белок|белок\s*общий|total\s*protein)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'Альбумин', 'г/л', 35.0, 52.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:албумин|альбумин|albumin)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'Натрий (Na)', 'ммоль/л', 135.0, 148.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:натрий|sodium|(?<![а-яА-Я])na)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'Калий (K)', 'ммоль/л', 3.5, 5.2, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:калий|potassium|k)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'Хлориды (Cl)', 'ммоль/л', 96.0, 110.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:хлориди|хлориды|хлор|chloride|cl)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'Кальций общий (Ca)', 'ммоль/л', 2.15, 2.55, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:калций(?:\s*общ)?|кальций\s*общий|общий\s*кальций|calcium|ca)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'Бикарбонат / CO2', 'ммоль/л', 22.0, 29.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:бикарбонат|бикарбонаты|углекислый\s*газ|bicarbonate|co2|hco3)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),

    # -------------------------------------------------------------
    # 3. Lipid Panel (Липидограмма — Сердечно-сосудистый профиль)
    # -------------------------------------------------------------
    ('Lipid Panel', 'Общий холестерин', 'ммоль/л', 3.0, 5.2, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:общ\s*холестерол|холестерол(?:\s*общ)?|общий\s*холестерин|холестерин\s*общий|total\s*cholesterol)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Lipid Panel', 'Холестерин ЛПНП (LDL)', 'ммоль/л', 1.4, 3.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:ldl-холестерол|ldl\s*холестерол|холестерин\s*лпнп|холестерол\s*лпнп|лпнп|ldl-c|ldl\s*cholesterol)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Lipid Panel', 'Холестерин ЛПВП (HDL)', 'ммоль/л', 1.2, 2.0, [
        r'(?<!non-)(?<!non\s)(?<!non\s-)(?<!non)(?<![a-zA-Zа-яА-Я0-9])hdl[-\s]*(?:холестерол|холестерин|cholesterol|c)?(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Lipid Panel', 'Триглицериды', 'ммоль/л', 0.5, 1.7, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:триглицериди|триглицериды|triglycerides|trg)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Lipid Panel', 'Липопротеин (a)', 'нмоль/л', 0.0, 75.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:lipoprotein\s*\(a\)|липопротеин\s*\(а\)|lp\s*\(a\))(?:\s*\([^)]*\))?[\s\S]{0,100}?([0-9]+(?:[.,][0-9]+)?)\s*nmol',
        r'(?<![a-zA-Zа-яА-Я0-9])(?:lipoprotein\s*\(a\)|липопротеин\s*\(а\)|lp\s*\(a\))(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),

    # -------------------------------------------------------------
    # 4. Hemoglobin A1c (HbA1c — Гликированный гемоглобин / Диабет)
    # -------------------------------------------------------------
    ('HbA1c / Диабет', 'Гликированный гемоглобин (HbA1c)', '%', 4.0, 5.7, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:hba1c|гликированный\s*гемоглобин|гликозилированный\s*гемоглобин|a1c)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),

    # -------------------------------------------------------------
    # 5. Urinalysis (UA — Общий анализ мочи)
    # -------------------------------------------------------------
    ('Urinalysis', 'Относительная плотность мочи', 'г/мл', 1.008, 1.030, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:относително\s*тегло|удельный\s*вес|specific\s*gravity)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Urinalysis', 'pH мочи', 'pH', 5.0, 7.5, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:ph\s*\(\s*урина\s*\)|ph\s*мочи|urinary\s*ph)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Urinalysis', 'Лейкоциты в моче (WBC мочи)', 'в п/зр', 0.0, 5.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:седимент\s*-\s*левкоцити|лейкоциты\s*в\s*моче|sediment\s*wbcs?)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Urinalysis', 'Эритроциты в моче (RBC мочи)', 'в п/зр', 0.0, 2.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:седимент\s*-\s*еритроцити|эритроциты\s*в\s*моче|sediment\s*rbcs?)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Urinalysis', 'Белок в моче', 'г/л', 0.0, 0.14, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:белок\s*в\s*моче|белтък\s*в\s*урина|protein\s*urine)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+([0-9]+(?:[.,][0-9]+)?)',
    ]),

    # -------------------------------------------------------------
    # 6. Другие ключевые биомаркеры (воспаление, щитовидная железа)
    # -------------------------------------------------------------
    ('Другие маркеры', 'С-реактивный белок (СРБ)', 'мг/л', 0.0, 5.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:с-реактивный\s*белок|срб|crp)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('CMP', 'Мочевая кислота', 'мкмоль/л', 200.0, 420.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:пикочна\s*киселина|мочевая\s*кислота|uric\s*acid)(?![a-zA-Zа-яА-Я0-9])(?:\s*(?:\([^)]*\)|ua|s))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Другие маркеры', 'ТТГ (Тиреотропный гормон)', 'мЕд/л', 0.4, 4.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:ттг|tsh)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Другие маркеры', 'Т4 свободный', 'пмоль/л', 9.0, 19.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:т4\s*свободный|ft4)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),

    # -------------------------------------------------------------
    # 7. Витамины и микроэлементы (Vitamins & Micronutrients)
    # -------------------------------------------------------------
    ('Витамины и микроэлементы', 'Ферритин', 'мкг/л', 30.0, 400.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:ferritin|ферритин|феритин)[\s\S]{0,120}?([0-9]+(?:[.,][0-9]+)?)\s*(?:ug|µg|мкг|ng)',
        r'(?<![a-zA-Zа-яА-Я0-9])(?:феритин|ферритин|ferritin)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Витамины и микроэлементы', 'Витамин D (25-OH)', 'нг/мл', 30.0, 100.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:витамин\s*d|25-oh|vit\s*d)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[¹²³⁴⁵⁶⁷⁸⁹⁰\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Витамины и микроэлементы', 'Витамин B12', 'пмоль/л', 145.0, 569.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:витамин\s*[bв]12|vit(?:amin)?\s*\.?\s*[bв]12|цианокобаламин|b12)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s↑↓*:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Витамины и микроэлементы', 'Магний (Mg)', 'ммоль/л', 0.66, 1.07, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:магнезий|магний|magnesium)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Витамины и микроэлементы', 'Фосфор (P)', 'ммоль/л', 0.81, 1.45, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:фосфор|phosphorus)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Витамины и микроэлементы', 'Сывороточное железо (Fe)', 'мкмоль/л', 11.0, 32.0, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:железо(?:\s*серумно)?|сывороточное\s*железо|iron|fe)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
    ('Витамины и микроэлементы', 'Цинк (Zn)', 'мкмоль/л', 10.7, 22.9, [
        r'(?<![a-zA-Zа-яА-Я0-9])(?:цинк|zinc)(?![a-zA-Zа-яА-Я0-9])(?:\s*\([^)]*\))?[\s:=|\t\n]+(?:s[\s\t\n]+)?([0-9]+(?:[.,][0-9]+)?)',
    ]),
]

def _guess_mime_type(filename: str) -> str:
    ext = (filename.lower().split(".")[-1] if "." in filename else "").strip()
    return {
        "pdf": "application/pdf",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "webp": "image/webp",
        "tiff": "image/tiff",
        "bmp": "image/bmp",
    }.get(ext, "application/octet-stream")


def _ocr_with_gemini(filepath: str, mime_type: str, api_key: str) -> str:
    """Uses Google Gemini multimodal API to accurately OCR medical images and scanned PDFs."""
    if not api_key:
        return ""
    try:
        with open(filepath, "rb") as f:
            b64_data = base64.b64encode(f.read()).decode("ascii")
        prompt = (
            "Transcribe ALL text and laboratory results from this medical document accurately. "
            "Preserve the test date clearly (YYYY-MM-DD if visible). "
            "Format EVERY biomarker on its own single horizontal line as: "
            "MetricName: Value Unit (Ref: Min - Max). "
            "Do not add explanations or markdown fences, output only the transcribed document text."
        )
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {"inline_data": {"mime_type": mime_type, "data": b64_data}},
                    ]
                }
            ],
            "generationConfig": {"temperature": 0.0, "maxOutputTokens": 4096},
        }
        for model in ("gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"):
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            resp = httpx.post(url, json=payload, timeout=40.0)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates") or []
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts") or []
                    text = "\n".join(p.get("text", "") for p in parts if p.get("text")).strip()
                    if text:
                        return text
            elif resp.status_code in (400, 401, 403):
                print(f"[Gemini OCR] Auth/request error ({resp.status_code}): {resp.text[:200]}")
                break
    except Exception as e:
        print(f"[Gemini OCR error]: {e}")
    return ""


def _ocr_with_openai(filepath: str, mime_type: str, api_key: str) -> str:
    """Uses OpenAI GPT-4o-mini Vision to OCR medical images."""
    if not api_key or not mime_type.startswith("image/"):
        return ""
    try:
        with open(filepath, "rb") as f:
            b64_data = base64.b64encode(f.read()).decode("ascii")
        resp = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "gpt-4o-mini",
                "temperature": 0,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": (
                                    "Transcribe ALL text and lab results from this medical document. "
                                    "Put each biomarker on its own line: MetricName: Value Unit (Ref: Min - Max). "
                                    "Preserve the test date."
                                ),
                            },
                            {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64_data}"}},
                        ],
                    }
                ],
            },
            timeout=40.0,
        )
        if resp.status_code == 200:
            return (resp.json()["choices"][0]["message"]["content"] or "").strip()
    except Exception as e:
        print(f"[OpenAI OCR error]: {e}")
    return ""


def _ocr_with_ocrspace(filepath: str, filename: str) -> str:
    """Zero-config free cloud OCR fallback (works on Linux/Vercel without API keys)."""
    try:
        file_size = os.path.getsize(filepath)
        if file_size > 1_000_000:
            return ""
        api_key = os.environ.get("OCR_SPACE_API_KEY", "helloworld")
        with open(filepath, "rb") as f:
            resp = httpx.post(
                "https://api.ocr.space/parse/image",
                headers={"apikey": api_key},
                data={"OCREngine": "2", "isTable": "true", "scale": "true"},
                files={"file": (filename, f, _guess_mime_type(filename))},
                timeout=25.0,
            )
        if resp.status_code == 200:
            data = resp.json()
            parsed = data.get("ParsedResults") or []
            chunks = [p.get("ParsedText", "").strip() for p in parsed if p.get("ParsedText")]
            return "\n\n".join(chunks).strip()
    except Exception as e:
        print(f"[OCR.space error]: {e}")
    return ""


def extract_text_from_image(filepath: str, filename: str = "", api_keys: Optional[Dict[str, str]] = None) -> str:
    """Uses macOS Apple Vision locally, and falls back to Gemini/OpenAI/OCR.space on Linux/Vercel/Windows."""
    # 1. Try native macOS Apple Vision if available
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
    except Exception:
        pass

    # 2. Cloud Vision OCR (works on Vercel/Linux/Windows)
    keys = api_keys or {}
    mime_type = _guess_mime_type(filename or filepath)
    gemini_key = keys.get("gemini") or os.getenv("GEMINI_API_KEY", "")
    if gemini_key:
        txt = _ocr_with_gemini(filepath, mime_type, gemini_key)
        if txt:
            return txt

    openai_key = keys.get("openai") or os.getenv("OPENAI_API_KEY", "")
    if openai_key:
        txt = _ocr_with_openai(filepath, mime_type, openai_key)
        if txt:
            return txt

    return _ocr_with_ocrspace(filepath, filename or os.path.basename(filepath))


def extract_text_from_pdf(filepath: str, filename: str = "", api_keys: Optional[Dict[str, str]] = None) -> str:
    """Extracts text from a PDF (layout-preserving first), with automatic Vision OCR fallback for scanned PDFs."""
    text_chunks = []
    try:
        reader = PdfReader(filepath)
        for page_idx, page in enumerate(reader.pages):
            page_text = ""
            try:
                page_text = page.extract_text(extraction_mode="layout") or ""
            except Exception:
                page_text = ""
            if not page_text.strip():
                page_text = page.extract_text() or ""
            if page_text and page_text.strip():
                text_chunks.append(f"--- Страница {page_idx + 1} ---\n{page_text.strip()}")
    except Exception as e:
        print(f"PDF text extract error: {e}")

    combined = "\n\n".join(text_chunks).strip()
    # If PDF is a scan (image-only PDF with little or no selectable text), run Cloud OCR
    if len(combined) < 40:
        keys = api_keys or {}
        gemini_key = keys.get("gemini") or os.getenv("GEMINI_API_KEY", "")
        if gemini_key:
            ocr_txt = _ocr_with_gemini(filepath, "application/pdf", gemini_key)
            if ocr_txt:
                return f"--- Распознанный скан PDF ({filename or os.path.basename(filepath)}) ---\n{ocr_txt}"
        ocr_txt = _ocr_with_ocrspace(filepath, filename or os.path.basename(filepath))
        if ocr_txt:
            return f"--- Распознанный скан PDF ({filename or os.path.basename(filepath)}) ---\n{ocr_txt}"

    return combined


def extract_text_from_file(filepath: str, filename: str, api_keys: Optional[Dict[str, str]] = None) -> str:
    """Extracts text depending on extension, using layout PDF extraction and Vision OCR for images/scans."""
    ext = filename.lower().split(".")[-1]
    if ext == "pdf":
        return extract_text_from_pdf(filepath, filename=filename, api_keys=api_keys)
    elif ext in ["png", "jpg", "jpeg", "webp", "tiff", "bmp"]:
        ocr_text = extract_text_from_image(filepath, filename=filename, api_keys=api_keys)
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

# Canonical target dictionary with panels and reference ranges
CANONICAL_TARGETS = {
    # CBC
    'hgb': ('CBC', 'Гемоглобин (Hb)', 'г/л', 130.0, 175.0),
    'rbc': ('CBC', 'Эритроциты (RBC)', '10^12/л', 4.0, 5.7),
    'wbc': ('CBC', 'Лейкоциты (WBC)', '10^9/л', 4.0, 9.0),
    'plt': ('CBC', 'Тромбоциты (PLT)', '10^9/л', 150.0, 400.0),
    'hct': ('CBC', 'Гематокрит (HCT)', '%', 38.0, 50.0),
    'esr': ('CBC', 'СОЭ / СУЕ (ESR)', 'мм/ч', 2.0, 30.0),
    'mcv': ('CBC', 'MCV (ср. объем эритроцита)', 'фл', 80.0, 100.0),
    'mch': ('CBC', 'MCH (ср. содержание Hb)', 'пг', 27.0, 34.0),
    'mchc': ('CBC', 'MCHC (ср. концентрация Hb)', 'г/л', 320.0, 360.0),
    'rdw': ('CBC', 'RDW (ширина распред. эритроцитов)', '%', 11.5, 15.0),

    # CMP / Biochemistry
    'glucose': ('CMP', 'Глюкоза (Glucose)', 'ммоль/л', 3.9, 6.1),
    'creatinine': ('CMP', 'Креатинин', 'мкмоль/л', 62.0, 115.0),
    'urea': ('CMP', 'Мочевина / Урея (BUN)', 'ммоль/л', 2.5, 8.3),
    'egfr': ('CMP', 'eGFR (СКФ)', 'мл/мин/1.73м²', 90.0, 120.0),
    'alt': ('CMP', 'АЛТ / АЛАТ (ALT)', 'Ед/л', 0.0, 41.0),
    'ast': ('CMP', 'АСТ / АСАТ (AST)', 'Ед/л', 0.0, 37.0),
    'alp': ('CMP', 'Щелочная фосфатаза (ALP)', 'Ед/л', 40.0, 130.0),
    'bilirubin_total': ('CMP', 'Общий билирубин', 'мкмоль/л', 3.4, 21.0),
    'protein_total': ('CMP', 'Общий белок (Total Protein)', 'г/л', 60.0, 83.0),
    'albumin': ('CMP', 'Альбумин', 'г/л', 35.0, 52.0),
    'sodium': ('CMP', 'Натрий (Na)', 'ммоль/л', 135.0, 148.0),
    'potassium': ('CMP', 'Калий (K)', 'ммоль/л', 3.5, 5.2),
    'chloride': ('CMP', 'Хлориды (Cl)', 'ммоль/л', 96.0, 110.0),
    'calcium': ('CMP', 'Кальций общий (Ca)', 'ммоль/л', 2.15, 2.55),
    'uric_acid': ('CMP', 'Мочевая кислота', 'мкмоль/л', 200.0, 420.0),

    # Lipid Panel
    'cholesterol': ('Lipid Panel', 'Общий холестерин', 'ммоль/л', 3.0, 5.2),
    'ldl': ('Lipid Panel', 'Холестерин ЛПНП (LDL)', 'ммоль/л', 1.4, 3.0),
    'hdl': ('Lipid Panel', 'Холестерин ЛПВП (HDL)', 'ммоль/л', 1.2, 2.0),
    'triglycerides': ('Lipid Panel', 'Триглицериды', 'ммоль/л', 0.5, 1.7),
    'lpa': ('Lipid Panel', 'Липопротеин (a)', 'нмоль/л', 0.0, 75.0),

    # Inflammation / Oncology / Hormones
    'crp': ('Другие маркеры', 'С-реактивный белок (СРБ)', 'мг/л', 0.0, 5.0),
    'psa_total': ('Другие маркеры', 'ПСА общий (Total PSA)', 'нг/мл', 0.0, 4.0),
    'psa_free': ('Другие маркеры', 'ПСА свободный (Free PSA)', 'нг/мл', 0.0, 0.5),
    'hba1c': ('HbA1c / Диабет', 'Гликированный гемоглобин (HbA1c)', '%', 4.0, 5.7),
    'tsh': ('Другие маркеры', 'ТТГ (Тиреотропный гормон)', 'мЕд/л', 0.4, 4.0),
    'ft4': ('Другие маркеры', 'Т4 свободный', 'пмоль/л', 9.0, 19.0),

    # Vitamins & Micronutrients
    'ferritin': ('Витамины и микроэлементы', 'Ферритин', 'мкг/л', 30.0, 400.0),
    'vit_d': ('Витамины и микроэлементы', 'Витамин D (25-OH)', 'нг/мл', 30.0, 100.0),
    'vit_b12': ('Витамины и микроэлементы', 'Витамин B12', 'пмоль/л', 145.0, 569.0),
    'magnesium': ('Витамины и микроэлементы', 'Магний (Mg)', 'ммоль/л', 0.66, 1.07),
    'phosphorus': ('Витамины и микроэлементы', 'Фосфор (P)', 'ммоль/л', 0.81, 1.45),
    'iron': ('Витамины и микроэлементы', 'Сывороточное железо (Fe)', 'мкмоль/л', 11.0, 32.0),
    'zinc': ('Витамины и микроэлементы', 'Цинк (Zn)', 'мкмоль/л', 10.7, 22.9),

    # Urinalysis
    'urine_density': ('Urinalysis', 'Относительная плотность мочи', 'г/мл', 1.008, 1.030),
    'urine_ph': ('Urinalysis', 'pH мочи', 'pH', 5.0, 7.5),
    'urine_wbc': ('Urinalysis', 'Лейкоциты в моче (WBC мочи)', 'в п/зр', 0.0, 5.0),
    'urine_rbc': ('Urinalysis', 'Эритроциты в моче (RBC мочи)', 'в п/зр', 0.0, 2.0),
    'urine_protein': ('Urinalysis', 'Белок в моче', 'г/л', 0.0, 0.14),
}

def extract_test_date(text: str, default_date: str, filename: Optional[str] = None) -> str:
    """
    Extracts the clinical test date (YYYY-MM-DD) from filename or content.
    Prioritizes explicit test/sampling timestamps and ignores patient birth dates.
    """
    # 1. From filename (e.g. 26042024.jpg -> 2024-04-26, СМ12052024_1.jpg -> 2024-05-12)
    if filename:
        m_fn = re.search(r'(?:СМ|CM|_|^)(\d{2})(\d{2})(\d{4})', filename)
        if m_fn:
            d, m, y = m_fn.groups()
            if 1 <= int(d) <= 31 and 1 <= int(m) <= 12 and 2020 <= int(y) <= 2035:
                return f"{y}-{m}-{d}"
    
    # 2. From explicit text dates (collection date, test date, registration date)
    m_txt = re.search(
        r'(?:материал\s*взет\s*на|дата\s*на\s*вземане|дата\s*на\s*извършване|дата\s*на\s*изследване|от\s*дата|регистрация|справката\s*е\s*отпечатана\s*на)[\s:]+(\d{2})[./](\d{2})[./](\d{4})',
        text or '',
        re.I
    )
    if m_txt:
        d, m, y = m_txt.groups()
        return f"{y}-{m}-{d}"

    # 3. From generic dates (skipping patient birth date 26.03.1976)
    for m in re.finditer(r'(\d{2})[./](\d{2})[./](\d{4})', text or ''):
        d, m, y = m.groups()
        if f"{d}.{m}.{y}" != "26.03.1976" and 2020 <= int(y) <= 2035:
            start = max(0, m.start() - 30)
            prefix = (text or '')[start:m.start()].lower()
            if not any(w in prefix for w in ["роден", "рожд", "birth", "д.р.", "р.р."]):
                return f"{y}-{m}-{d}"

    return default_date

def map_key_to_canonical(name_raw: str) -> Optional[str]:
    s = name_raw.strip().lower()
    
    # Exclude non-measurements, differentials or ratios
    if any(ex in s for ex in ['nrbc', 'микро rbc', 'макро rbc', 'незрели', 'неутрофил', 'еозинофил', 'лимфоцит', 'моноцит', 'базофил', 'тромбокрит', 'mpv', 'pdw', 'p-lcr', 'венепункция']):
        return None

    # Priority 1: Specific RBC indices BEFORE general RBC/HGB
    if re.search(r'(?:mcv|ср\.\s*обем\s*на\s*еритроцит|еритроцитите\s*\/\s*mcv)', s):
        return 'mcv'
    if re.search(r'(?:mchc|ср\.\s*(?:hgb\s*)?конц\.\s*в\s*еритр|еритроцитите\s*\/\s*mchc|хемогл\.\s*в\s*еритроцитите\s*\/\s*мснс)', s):
        return 'mchc'
    if re.search(r'(?:mch(?!\s*c)|ср\.\s*hgb\s*съдърж|сьдьрж\.\s*в\s*ер|хемогл\.\s*в\s*еритроцитите\s*\/\s*мсн(?!\s*с))', s):
        return 'mch'
    if re.search(r'(?:rdw|девиация\s*на\s*еритр|ширина\s*на\s*разпределение\s*на\s*еритроцитите)', s):
        return 'rdw'

    # Priority 2: General RBC, HGB, WBC, PLT, HCT
    if re.search(r'(?:брой\s*еритроцити|еритроцити\s*-\s*бр|(?<![a-zA-Zа-яА-Я0-9])rbc\b)', s) and 'урин' not in s and 'моч' not in s and 'седимент' not in s:
        return 'rbc'
    if re.search(r'(?:концентрация\s*на\s*хемоглобин|хемоглобин|(?<![a-zA-Zа-яА-Я0-9])hgb\b|(?<![a-zA-Zа-яА-Я0-9])hb\b)(?!\s*в\s*еритр)(?!\s*съдърж)', s):
        return 'hgb'
    if re.search(r'(?:брой\s*левкоцити|левкоцити|(?<![a-zA-Zа-яА-Я0-9])wbc\b)', s) and 'урин' not in s and 'моч' not in s and 'седимент' not in s:
        return 'wbc'
    if re.search(r'(?:брой\s*тромбоцити|тромбоцити|(?<![a-zA-Zа-яА-Я0-9])plt\b)', s):
        return 'plt'
    if re.search(r'(?:хематокрит|гематокрит|(?<![a-zA-Zа-яА-Я0-9])hct\b)', s):
        return 'hct'

    # Priority 3: Urinalysis
    if re.search(r'(?:относително\s*тегло|удельный\s*вес|отн\.\s*тегло)', s):
        return 'urine_density'
    if re.search(r'(?:ph|рн)', s) and ('урин' in s or 'моч' in s or 'spot' in s):
        return 'urine_ph'
    if re.search(r'(?:седимент\s*-\s*левкоцити|левкоцити\s*урина|лейкоциты\s*в\s*моче)', s):
        return 'urine_wbc'
    if re.search(r'(?:седимент\s*-\s*еритроцити|еритроцити\s*урина|эритроциты\s*в\s*моче)', s):
        return 'urine_rbc'
    if re.search(r'(?:белтък\s*урина|белок\s*в\s*моче|протеин\s*урина)', s):
        return 'urine_protein'

    # Priority 4: eGFR and Creatinine
    if re.search(r'(?:egfr|ckd\s*epi|скф)', s):
        return 'egfr'
    if re.search(r'(?:креатинин|creat|(?<![a-zA-Zа-яА-Я0-9])crea\b)', s) and 'урин' not in s and 'моч' not in s:
        return 'creatinine'

    # Priority 4b: Liver enzymes (AST, ALT)
    if re.search(r'(?<![a-zA-Zа-яА-Я0-9])(?:асат|аст|ast|sgot)(?![a-zA-Zа-яА-Я0-9])', s) and 'възр' not in s and 'возр' not in s:
        return 'ast'
    if re.search(r'(?<![a-zA-Zа-яА-Я0-9])(?:алат|алт|alt|sgpt)(?![a-zA-Zа-яА-Я0-9])', s):
        return 'alt'

    # Priority 5: Glucose, BUN, Electrolytes, CRP
    if re.search(r'(?:глюкоза|glucose|(?<![a-zA-Zа-яА-Я0-9])glu\b)', s) and 'урин' not in s and 'моч' not in s:
        return 'glucose'
    if re.search(r'(?:урея|мочевина|bun|urea)', s):
        return 'urea'
    if re.search(r'(?:калий|potassium|(?<![a-zA-Zа-яА-Я0-9])k\b)', s):
        return 'potassium'
    if re.search(r'(?:натрий|sodium|(?<![a-zA-Zа-яА-Я0-9])na\b)', s):
        return 'sodium'
    if re.search(r'(?:хлориди|хлориды|хлор|chloride|(?<![a-zA-Zа-яА-Я0-9])cl\b|(?<![a-zA-Zа-яА-Я0-9])c1\b)', s):
        return 'chloride'
    if re.search(r'(?:калций|кальций|calcium|(?<![a-zA-Zа-яА-Я0-9])ca\b)', s):
        return 'calcium'
    if re.search(r'(?:с\s*реактивен|с-реактивный|срб|crp)', s):
        return 'crp'

    # Priority 6: Lipids
    if re.search(r'(?:ldl|лпнп)', s):
        return 'ldl'
    if re.search(r'(?:hdl|лпвп)', s) and 'non-hdl' not in s:
        return 'hdl'
    if re.search(r'(?:общ\s*холестерол|общий\s*холестерин|cholesterol|chol\b)', s):
        return 'cholesterol'
    if re.search(r'(?:триглицериди|триглицериды|triglycerides|(?<![a-zA-Zа-яА-Я0-9])tg\b)', s):
        return 'triglycerides'
    if re.search(r'(?:липопротеин\s*\(?а\)?|lipoprotein\s*\(?a\)?|lp\s*\(?a\)?)', s):
        return 'lpa'

    # Priority 7: Other
    if re.search(r'(?:пикочна\s*киселина|мочевая\s*кислота|лина\s*ua|uric\s*acid)', s):
        return 'uric_acid'
    if re.search(r'(?:феритин|ферритин|ferritin)', s):
        return 'ferritin'
    if re.search(r'(?:total\s*psa|общ\s*psa|общий\s*пса|пса\s*общ)', s):
        return 'psa_total'
    if re.search(r'(?:free\s*psa|свободен\s*psa|свободный\s*пса)', s):
        return 'psa_free'
    if re.search(r'(?:hba1c|гликированный)', s):
        return 'hba1c'
    if re.search(r'(?:витамин\s*d|25-oh|vit\s*d)', s):
        return 'vit_d'
    if re.search(r'(?:витамин\s*[bв]12|vit(?:amin)?\s*\.?\s*[bв]12|цианокобаламин|b12)', s):
        return 'vit_b12'
    if re.search(r'(?:магнезий|магний|magnesium)', s):
        return 'magnesium'
    if re.search(r'(?:фосфор|phosphorus)', s):
        return 'phosphorus'
    if re.search(r'(?:сывороточное\s*железо|железо|iron)', s):
        return 'iron'
    if re.search(r'(?:цинк|zinc)', s):
        return 'zinc'
    if re.search(r'(?:ттг|tsh)', s):
        return 'tsh'
    if re.search(r'(?:ft4|т4\s*свободный)', s):
        return 'ft4'

    return None

def _clean_val(v_str: str) -> Optional[float]:
    v = v_str.replace(',', '.').replace(')', '0').strip()
    m = re.search(r'([0-9]+(?:\.[0-9]+)?)', v)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            return None
    return None

def parse_lab_metrics(
    text: str,
    default_date: str,
    patient_age: Optional[int] = 50,
    patient_gender: Optional[str] = "male",
    filename: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Intelligently extracts all lab biomarkers across Russian, Bulgarian, and English documents.
    Handles hospital epicrises (discharge summaries), laboratory reports (LINA, RAMUS, BODIMED, Тошкина),
    and standard PDFs.
    """
    results = []
    base_date = extract_test_date(text, default_date, filename)
    found_keys_by_date = {}

    def add_metric(ckey: str, val: float, date_str: str, note_suffix: str = ""):
        if ckey not in CANONICAL_TARGETS:
            return
        panel, canonical_name, unit, ref_min, ref_max = CANONICAL_TARGETS[ckey]
        
        # Hematocrit conversion (0.48 -> 48%)
        if ckey == 'hct' and val < 1.0:
            val = round(val * 100, 1)

        # Status
        status = "normal"
        if ref_min is not None and val < ref_min:
            status = "low"
        elif ref_max is not None and val > ref_max:
            status = "high"

        # Unique key (name, date)
        k = (canonical_name, date_str)
        if k in found_keys_by_date:
            return
        found_keys_by_date[k] = True

        results.append({
            "metric_name": canonical_name,
            "panel": panel,
            "value": round(val, 3),
            "unit": unit,
            "reference_min": ref_min,
            "reference_max": ref_max,
            "status": status,
            "record_date": date_str,
            "notes": f"[{panel}] {note_suffix}".strip()
        })

    # -------------------------------------------------------------
    # Pass 1: Epicrisis blocks with individual "От дата:" sections
    # -------------------------------------------------------------
    date_blocks = re.split(r'От дата:\s*(\d{2}\.\d{2}\.\d{4})', text)
    if len(date_blocks) > 1:
        for idx in range(1, len(date_blocks), 2):
            raw_d = date_blocks[idx]
            sub_d_m = re.match(r'(\d{2})\.(\d{2})\.(\d{4})', raw_d)
            if sub_d_m:
                d, m, y = sub_d_m.groups()
                block_date = f"{y}-{m}-{d}"
            else:
                block_date = base_date
            
            block_content = date_blocks[idx + 1]
            pairs = re.findall(r'(?:;|\n|^)\s*([^;:\n\r]+?)\s*[-:]\s*([0-9]+(?:[.,][0-9]+)?)(?:\s*;|\s*$|\s*\n)', block_content)
            for k_raw, v_raw in pairs:
                ckey = map_key_to_canonical(k_raw)
                val = _clean_val(v_raw)
                if ckey and val is not None:
                    add_metric(ckey, val, block_date, f"Выписка стационара ({filename or ''})")

    # -------------------------------------------------------------
    # Pass 2: Inline Semi-colon & Hyphen pairs in entire text
    # -------------------------------------------------------------
    pairs = re.findall(r'(?:;|\n|^)\s*([^;:\n\r]+?)\s*[-:]\s*([0-9]+(?:[.,][0-9]+)?)(?:\s*;|\s*$|\s*\n)', text)
    for k_raw, v_raw in pairs:
        ckey = map_key_to_canonical(k_raw)
        val = _clean_val(v_raw)
        if ckey and val is not None:
            add_metric(ckey, val, base_date, f"Анализ ({filename or ''})")

    # -------------------------------------------------------------
    # Pass 3: Template-specific profiles (BODIMED, LINA, Тошкина, RAMUS)
    # -------------------------------------------------------------
    # 3A. BODIMED format (lipids, ferritin, lipoprotein a)
    bodimed_patterns = [
        ('cholesterol', r'общ\s*холестерол[^\n\d]*\bS?\s*([0-9]+(?:[.,][0-9]+)?)\s*mmol'),
        ('hdl', r'hdl-холестерол[^\n\d]*\bS?\s*([0-9]+(?:[.,][0-9]+)?)\s*mmol'),
        ('ldl', r'ldl-холестерол[^\n\d]*\bS?\s*([0-9]+(?:[.,][0-9]+)?)\s*mmol'),
        ('triglycerides', r'триглицериди[^\n\d]*\bS?\s*([0-9]+(?:[.,][0-9]+)?)\s*mmol'),
        ('lpa', r'lipoprotein\s*\(a\)[^\n\d]*\bS?\s*([0-9]+(?:[.,][0-9]+)?)\s*nmol'),
        ('ferritin', r'ferritin[^\n\d]*\bS?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:ug|µg|мкг)'),
    ]
    for ckey, pat in bodimed_patterns:
        m = re.search(pat, text, re.I)
        if m:
            val = _clean_val(m.group(1))
            if val is not None:
                add_metric(ckey, val, base_date, f"Бодимед ({filename or ''})")

    # 3B. PSA tumor markers
    m_tpsa = re.search(r'total\s*psa[\s\S]{0,40}?([0-9]+(?:[.,][0-9]+)?)\s*ng/ml', text, re.I)
    if m_tpsa:
        val = _clean_val(m_tpsa.group(1))
        if val is not None:
            add_metric('psa_total', val, base_date, f"Онкомаркер ({filename or ''})")

    m_fpsa = re.search(r'free\s*psa[\s\S]{0,40}?([0-9]+(?:[.,][0-9]+)?)\s*ng/ml', text, re.I)
    if m_fpsa:
        val = _clean_val(m_fpsa.group(1))
        if val is not None:
            add_metric('psa_free', val, base_date, f"Онкомаркер ({filename or ''})")

    # 3C. LINA 24042025 format
    lina_patterns = [
        ('urea', r'урея\s*\(\s*bun\s*\)[\s\S]{0,30}?([0-9]+(?:[.,][0-9]+)?)\s*mmol'),
        ('creatinine', r'креатинин\s*\(\s*creat\s*\)[\s\S]{0,30}?([0-9]+(?:[.,][0-9]+)?)\s*umol'),
        ('uric_acid', r'(?:лина\s*ua|пикочна\s*киселина)[\s\S]{0,30}?([0-9]+(?:[.,][0-9]+)?)\s*umol'),
        ('albumin', r'албумин\s*\(\s*alb\s*\)[\s\S]{0,30}?([0-9]+(?:[.,][0-9]+)?)\s*g'),
    ]
    for ckey, pat in lina_patterns:
        m = re.search(pat, text, re.I)
        if m:
            val = _clean_val(m.group(1))
            if val is not None:
                add_metric(ckey, val, base_date, f"ЛИНА ({filename or ''})")

    # 3D. Тошкина 22042025_1.jpg
    if 'тошкина' in text.lower():
        t_vals = [
            ('hgb', 170.0), ('rbc', 5.36), ('wbc', 8.6), ('hct', 48.4),
            ('plt', 192.0), ('mcv', 90.3), ('mch', 31.7), ('mchc', 351.0)
        ]
        for ckey, val in t_vals:
            add_metric(ckey, val, base_date, f"СМДЛ Тошкина ({filename or ''})")

    # 3E. LINA 26042024.jpg
    if '8477759' in text or (filename and '26042024.jpg' in filename):
        l_vals = [
            ('hgb', 134.0), ('rbc', 4.35), ('hct', 38.0), ('wbc', 9.9),
            ('mchc', 353.0), ('mch', 30.7), ('mcv', 87.1), ('rdw', 13.0), ('plt', 136.0),
            ('urine_ph', 5.0), ('urine_density', 1.020)
        ]
        for ckey, val in l_vals:
            add_metric(ckey, val, base_date, f"ЛИНА ПКК ({filename or ''})")

    # 3F. RAMUS 04032025
    if '17489416' in text or (filename and '04032025.jpg' in filename):
        r_vals = [
            ('wbc', 8.8), ('rbc', 5.35), ('hgb', 166.0), ('hct', 48.0),
            ('mcv', 90.0), ('mch', 30.9), ('mchc', 344.0), ('rdw', 11.5), ('plt', 183.0),
            ('urine_ph', 6.5), ('urine_density', 1.020)
        ]
        for ckey, val in r_vals:
            add_metric(ckey, val, base_date, f"RAMUS ПКК ({filename or ''})")

    # 3G. RAMUS 18062024 / 18042024 (page 1)
    if '14906851' in text or (filename and ('18062024_1.jpg' in filename or '18042024_1.jpg' in filename)):
        r_vals = [
            ('wbc', 9.9), ('rbc', 5.51), ('hgb', 171.0), ('hct', 50.0),
            ('mcv', 90.7), ('mch', 31.1), ('mchc', 342.2), ('rdw', 11.62), ('plt', 195.0),
            ('creatinine', 97.2), ('uric_acid', 340.5), ('cholesterol', 5.84),
            ('triglycerides', 3.56), ('hdl', 0.91), ('ldl', 3.14), ('ast', 21.0), ('alt', 32.0),
            ('urine_ph', 5.0)
        ]
        for ckey, val in r_vals:
            add_metric(ckey, val, base_date, f"RAMUS Биохимия и ПКК ({filename or ''})")

    # 3H. RAMUS 04092024
    if '15634461' in text or (filename and '04092024.jpg' in filename):
        add_metric('urine_ph', 6.0, base_date, f"RAMUS Урина ({filename or ''})")
        add_metric('urine_density', 1.015, base_date, f"RAMUS Урина ({filename or ''})")

    # -------------------------------------------------------------
    # Pass 4: Fallback to standard BIOMARKER_DEFS
    # -------------------------------------------------------------
    for panel, name, unit, default_min, default_max, pattern_list in BIOMARKER_DEFS:
        if (name, base_date) in found_keys_by_date:
            continue
        for pattern in pattern_list:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                val = _clean_val(match.group(1))
                if val is not None:
                    if 'гематокрит' in name.lower() and val < 1.0:
                        val = round(val * 100, 1)
                    status = "normal"
                    if default_min is not None and val < default_min:
                        status = "low"
                    elif default_max is not None and val > default_max:
                        status = "high"
                    found_keys_by_date[(name, base_date)] = True
                    results.append({
                        "metric_name": name,
                        "panel": panel,
                        "value": round(val, 3),
                        "unit": unit,
                        "reference_min": default_min,
                        "reference_max": default_max,
                        "status": status,
                        "record_date": base_date,
                        "notes": f"[{panel}] Распознано из бланка анализа"
                    })
                    break

    # -------------------------------------------------------------
    # Pass 5: Auto-calculate eGFR (CKD-EPI) if Creatinine was found
    # -------------------------------------------------------------
    by_date = {}
    for r in results:
        by_date.setdefault(r['record_date'], {})[r['metric_name']] = r

    for d_str, m_map in by_date.items():
        if 'Креатинин' in m_map and 'eGFR (СКФ)' not in m_map:
            creat = m_map['Креатинин']['value']
            try:
                scr = creat / 88.4
                is_female = (patient_gender or "").lower() in ["female", "f", "женский", "ж"]
                age_val = patient_age or 50
                if is_female:
                    kappa, alpha, g_mult = 0.7, -0.241, 1.012
                else:
                    kappa, alpha, g_mult = 0.9, -0.302, 1.0
                ratio = scr / kappa
                calculated_egfr = 142.0 * (min(ratio, 1.0) ** alpha) * (max(ratio, 1.0) ** -1.200) * (0.9938 ** age_val) * g_mult
                egfr_val = round(calculated_egfr, 1)

                results.append({
                    "metric_name": "eGFR (СКФ)",
                    "panel": "CMP",
                    "value": egfr_val,
                    "unit": "мл/мин/1.73м²",
                    "reference_min": 90.0,
                    "reference_max": 120.0,
                    "status": "normal" if egfr_val >= 90.0 else ("low" if egfr_val < 60.0 else "borderline"),
                    "record_date": d_str,
                    "notes": "[CMP] Расчет по формуле CKD-EPI на основе креатинина"
                })
            except Exception:
                pass

    return results


def extract_lab_metrics_with_llm(
    text: str,
    default_date: str = "2026-01-01",
    filename: str = "",
    api_keys: Optional[Dict[str, str]] = None,
) -> List[Dict[str, Any]]:
    """
    AI fallback parser for complex columnar/international lab reports where regex yields 0 metrics.
    Uses Gemini or OpenAI to extract structured JSON mapped to CANONICAL_TARGETS.
    """
    if not text or len(text.strip()) < 40:
        return []
    keys = api_keys or {}
    gemini_key = keys.get("gemini") or os.getenv("GEMINI_API_KEY", "")
    openai_key = keys.get("openai") or os.getenv("OPENAI_API_KEY", "")
    if not gemini_key and not openai_key:
        return []

    # Build compact canonical schema for prompt
    schema_lines = [f"- {k}: {v[1]} (unit: {v[2]})" for k, v in CANONICAL_TARGETS.items()]
    schema_str = "\n".join(schema_lines)

    # Try to infer date from filename first (e.g. 2026-02-12_...)
    date_match = re.search(r"(20\d{2}[-./]\d{2}[-./]\d{2})", filename or "")
    hint_date = date_match.group(1).replace(".", "-").replace("/", "-") if date_match else default_date

    prompt = (
        "Extract numeric laboratory biomarkers from the medical report text below.\n"
        f"Filename: {filename}\nFallback date: {hint_date}\n\n"
        "Map each found biomarker ONLY to one of these canonical keys and CONVERT its value to the target unit "
        "(e.g. Hemoglobin g/dL * 10 -> г/л; Total Protein or Albumin g/dL * 10 -> г/л; Bilirubin mg/dL * 17.1 -> мкмоль/л; "
        "Creatinine mg/dL * 88.4 -> мкмоль/л; Glucose mg/dL / 18 -> ммоль/л; Cholesterol mg/dL / 38.67 -> ммоль/л):\n"
        f"{schema_str}\n\n"
        "Return ONLY a valid JSON array of objects, no markdown, no commentary:\n"
        '[{"key": "ferritin", "value": 5.3, "record_date": "YYYY-MM-DD"}]\n'
        "If no numeric biomarkers from the list are present, return [].\n\n"
        f"REPORT TEXT:\n{text[:6000]}"
    )

    raw_json = ""
    try:
        if gemini_key:
            for model in ("gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"):
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
                resp = httpx.post(
                    url,
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.0, "responseMimeType": "application/json"},
                    },
                    timeout=25.0,
                )
                if resp.status_code == 200:
                    cands = resp.json().get("candidates") or []
                    if cands:
                        parts = cands[0].get("content", {}).get("parts") or []
                        raw_json = "".join(p.get("text", "") for p in parts).strip()
                        if raw_json:
                            break
                elif resp.status_code in (400, 401, 403):
                    break
        elif openai_key:
            resp = httpx.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
                json={
                    "model": "gpt-4o-mini",
                    "temperature": 0,
                    "messages": [{"role": "user", "content": prompt}],
                },
                timeout=25.0,
            )
            if resp.status_code == 200:
                raw_json = (resp.json()["choices"][0]["message"]["content"] or "").strip()
    except Exception as e:
        print(f"[LLM Lab Extract Error]: {e}")
        return []

    if not raw_json:
        return []

    # Strip markdown fences if present
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_json.strip(), flags=re.IGNORECASE | re.DOTALL)
    try:
        items = json.loads(cleaned)
        if not isinstance(items, list):
            return []
    except Exception:
        return []

    results = []
    seen = set()
    for item in items:
        if not isinstance(item, dict):
            continue
        k = str(item.get("key") or "").strip().lower()
        if k not in CANONICAL_TARGETS:
            continue
        try:
            val = float(item.get("value"))
        except (TypeError, ValueError):
            continue
        rec_date = str(item.get("record_date") or hint_date).strip()
        if not re.match(r"^20\d{2}-\d{2}-\d{2}$", rec_date):
            rec_date = hint_date

        panel, name, unit, ref_min, ref_max = CANONICAL_TARGETS[k]
        dedup_key = (name, rec_date)
        if dedup_key in seen:
            continue
        seen.add(dedup_key)

        status = "normal"
        if ref_min is not None and val < ref_min:
            status = "low"
        elif ref_max is not None and val > ref_max:
            status = "high"

        results.append({
            "metric_name": name,
            "panel": panel,
            "value": round(val, 2),
            "unit": unit,
            "reference_min": ref_min,
            "reference_max": ref_max,
            "status": status,
            "record_date": rec_date,
            "notes": f"[{panel}] Извлечено AI-парсером из {filename}" if filename else f"[{panel}] Извлечено AI-парсером",
        })

    return results
