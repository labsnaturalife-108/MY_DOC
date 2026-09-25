import re
import math
from typing import Dict, Any, List, Optional
import pyprevent

def mmol_to_mg_dl_cholesterol(val_mmol: float) -> float:
    """Converts cholesterol from mmol/L to mg/dL."""
    return round(val_mmol * 38.67, 1)

def mg_dl_to_mmol_cholesterol(val_mg: float) -> float:
    """Converts cholesterol from mg/dL to mmol/L."""
    return round(val_mg / 38.67, 2)

def calculate_egfr(creatinine_val: float, age: float, gender: str, is_umol: bool = True) -> float:
    """
    Calculates eGFR using the race-free CKD-EPI (2021) equation.
    Creatinine in umol/L (if is_umol=True) or mg/dL (if is_umol=False).
    """
    scr_mg = creatinine_val / 88.42 if is_umol else creatinine_val
    is_female = (gender or "").lower() in ["female", "женский", "жен", "ж", "f"]
    
    kappa = 0.7 if is_female else 0.9
    alpha = -0.241 if is_female else -0.302
    gender_mult = 1.012 if is_female else 1.0

    scr_ratio = max(0.1, scr_mg / kappa)
    min_part = min(scr_ratio, 1.0) ** alpha
    max_part = max(scr_ratio, 1.0) ** (-1.200)
    age_part = 0.9938 ** max(18.0, min(95.0, age))

    egfr = 142.0 * min_part * max_part * age_part * gender_mult
    return round(max(15.0, min(140.0, egfr)), 1)

def extract_prevent_inputs(patient: Any, documents: List[Any]) -> Dict[str, Any]:
    """
    Auto-extracts AHA PREVENT variables from patient card and parsed lab reports.
    """
    age = float(patient.age or 50)
    gender_str = (patient.gender or "male").lower()
    sex = "female" if any(w in gender_str for w in ["жен", "female", "ж", "f"]) else "male"

    # BMI calculation
    height = float(patient.height or 175)
    weight = float(patient.weight or 75)
    if patient.bmi:
        bmi = float(patient.bmi)
    elif height > 0 and weight > 0:
        bmi = round(weight / ((height / 100.0) ** 2), 1)
    else:
        bmi = 25.0

    # Medical history flags from chronic diseases and notes
    chronic_text = f"{patient.chronic_diseases or ''} {patient.notes or ''}".lower()
    has_diabetes = any(w in chronic_text for w in ["диабет", "diabetes", "инсулин", "глюкоз"])
    current_smoker = any(w in chronic_text for w in ["курен", "курит", "smok", "сигарет"])

    # Medications
    meds_text = (patient.current_medications or "").lower()
    on_htn_meds = any(w in meds_text for w in [
        "гипотензив", "давлен", "эналаприл", "периндоприл", "лозартан", "валсартан",
        "амлодипин", "бисопролол", "нолипрел", "индопамид", "телмисартан"
    ])
    on_cholesterol_meds = any(w in meds_text for w in [
        "статин", "statin", "аторвастатин", "розувастатин", "симвастатин", "эзетимиб", "крестор"
    ])

    # Default lab markers
    total_chol_mmol = 5.2
    hdl_chol_mmol = 1.3
    creatinine_umol = 85.0
    systolic_bp = 125.0

    sources_map = {}

    # Inspect documents (from newest to oldest)
    sorted_docs = sorted(documents, key=lambda d: getattr(d, 'id', 0), reverse=True)
    for doc in sorted_docs:
        txt = (doc.extracted_text or "")
        if not txt:
            continue

        # Total cholesterol
        if "total_chol" not in sources_map:
            m = re.search(r'(?:общ(?:ий)?\s*холестеро?л|chol(?:esterol)?)[^\d]*(\d+[.,]\d+)', txt, re.IGNORECASE)
            if m:
                val = float(m.group(1).replace(",", "."))
                # Check if mg/dL (> 30) or mmol/L
                total_chol_mmol = val if val < 20 else mg_dl_to_mmol_cholesterol(val)
                sources_map["total_chol"] = doc.filename

        # HDL
        if "hdl" not in sources_map:
            m = re.search(r'(?:hdl(?:-холестеро?л|-c)?|лпвп)[^\d]*(\d+[.,]\d+)', txt, re.IGNORECASE)
            if m:
                val = float(m.group(1).replace(",", "."))
                hdl_chol_mmol = val if val < 10 else mg_dl_to_mmol_cholesterol(val)
                sources_map["hdl"] = doc.filename

        # Creatinine
        if "creatinine" not in sources_map:
            m = re.search(r'(?:креатинин|creatinine)[^\d]*(\d+[.,]\d+)', txt, re.IGNORECASE)
            if m:
                val = float(m.group(1).replace(",", "."))
                creatinine_umol = val if val > 20 else val * 88.42
                sources_map["creatinine"] = doc.filename

        # Blood pressure mention
        if "sbp" not in sources_map:
            m = re.search(r'(?:ад|давлен|а/д|bp)[^\d]*(\d{2,3})[/\\](\d{2,3})', txt, re.IGNORECASE)
            if m:
                val = float(m.group(1))
                if 80 <= val <= 220:
                    systolic_bp = val
                    sources_map["sbp"] = doc.filename

    # Detect risk modifiers from imaging and specialized markers
    risk_modifiers = []
    for doc in documents:
        txt = (doc.extracted_text or "").lower()
        if any(w in txt for w in ["бляшк", "плака", "plaque", "стеноз"]) and not any("бляшк" in rm.lower() for rm in risk_modifiers):
            risk_modifiers.append("Атеросклеротические бляшки брахиоцефальных артерий (УЗИ / Дуплекс)")
        if any(w in txt for w in ["липопротеин(а)", "липопротеин (а)", "lp(a)", "lpa"]) and not any("липопротеин" in rm.lower() for rm in risk_modifiers):
            m_lp = re.search(r'(?:липопротеин\s*\(?а\)?|lp\s*\(?a\)?)[^\d]*(\d+[.,]\d+)', txt)
            if m_lp:
                risk_modifiers.append(f"Липопротеин(а) Lp(a): {m_lp.group(1)} нмоль/л (атерогенный фактор)")
            else:
                risk_modifiers.append("Повышенный уровень липопротеина(а) Lp(a)")

    # Calculate eGFR
    egfr = calculate_egfr(creatinine_umol, age, sex, is_umol=True)

    return {
        "sex": sex,
        "age": age,
        "total_cholesterol_mmol": round(total_chol_mmol, 2),
        "total_cholesterol_mg": mmol_to_mg_dl_cholesterol(total_chol_mmol),
        "hdl_cholesterol_mmol": round(hdl_chol_mmol, 2),
        "hdl_cholesterol_mg": mmol_to_mg_dl_cholesterol(hdl_chol_mmol),
        "systolic_bp": round(systolic_bp, 0),
        "has_diabetes": has_diabetes,
        "current_smoker": current_smoker,
        "bmi": round(bmi, 1),
        "egfr": round(egfr, 1),
        "creatinine_umol": round(creatinine_umol, 1),
        "on_htn_meds": on_htn_meds,
        "on_cholesterol_meds": on_cholesterol_meds,
        "risk_modifiers": risk_modifiers,
        "sources_detected": sources_map
    }

def calculate_prevent_risk(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes AHA PREVENT 10-year and 30-year risk estimates using pyprevent.
    Strictly clamps variables to certified clinical equation boundaries.
    """
    sex = str(params.get("sex", "male")).lower()
    if sex not in ["male", "female"]:
        sex = "female" if "fem" in sex or "жен" in sex else "male"

    age = float(params.get("age", 50))
    clamped_age = max(30.0, min(79.0, age))

    # Total cholesterol (must be in mg/dL for pyprevent: 130 - 320)
    if params.get("total_cholesterol_mg") is not None:
        tc_mg = float(params["total_cholesterol_mg"])
    elif params.get("total_cholesterol_mmol") is not None:
        tc_mg = mmol_to_mg_dl_cholesterol(float(params["total_cholesterol_mmol"]))
    else:
        tc_mg = 200.0
    clamped_tc = max(130.0, min(320.0, tc_mg))

    # HDL cholesterol (must be in mg/dL: 20 - 100)
    if params.get("hdl_cholesterol_mg") is not None:
        hdl_mg = float(params["hdl_cholesterol_mg"])
    elif params.get("hdl_cholesterol_mmol") is not None:
        hdl_mg = mmol_to_mg_dl_cholesterol(float(params["hdl_cholesterol_mmol"]))
    else:
        hdl_mg = 50.0
    clamped_hdl = max(20.0, min(100.0, hdl_mg))

    # Systolic BP (90 - 200 mmHg)
    sbp = float(params.get("systolic_bp") or 120)
    clamped_sbp = max(90.0, min(200.0, sbp))

    has_diabetes = bool(params.get("has_diabetes", False))
    current_smoker = bool(params.get("current_smoker", False))

    # BMI (18.5 - 39.9)
    bmi = float(params.get("bmi") or 25.0)
    clamped_bmi = max(18.5, min(39.9, bmi))

    # eGFR (15 - 140)
    if params.get("egfr") is not None:
        egfr = float(params["egfr"])
    elif params.get("creatinine_umol") is not None:
        egfr = calculate_egfr(float(params["creatinine_umol"]), age, sex, is_umol=True)
    else:
        egfr = 90.0
    clamped_egfr = max(15.0, min(140.0, egfr))

    on_htn_meds = bool(params.get("on_htn_meds", False))
    on_cholesterol_meds = bool(params.get("on_cholesterol_meds", False))

    # Execute 10-year calculations
    try:
        cvd_10yr = pyprevent.calculate_10_yr_cvd_risk(
            sex=sex,
            age=clamped_age,
            total_cholesterol=clamped_tc,
            hdl_cholesterol=clamped_hdl,
            systolic_bp=clamped_sbp,
            has_diabetes=has_diabetes,
            current_smoker=current_smoker,
            bmi=clamped_bmi,
            egfr=clamped_egfr,
            on_htn_meds=on_htn_meds,
            on_cholesterol_meds=on_cholesterol_meds
        )
    except Exception as e:
        cvd_10yr = 0.0

    try:
        ascvd_10yr = pyprevent.calculate_10_yr_ascvd_risk(
            sex=sex,
            age=clamped_age,
            total_cholesterol=clamped_tc,
            hdl_cholesterol=clamped_hdl,
            systolic_bp=clamped_sbp,
            has_diabetes=has_diabetes,
            current_smoker=current_smoker,
            bmi=clamped_bmi,
            egfr=clamped_egfr,
            on_htn_meds=on_htn_meds,
            on_cholesterol_meds=on_cholesterol_meds
        )
    except Exception as e:
        ascvd_10yr = 0.0

    try:
        hf_10yr = pyprevent.calculate_10_yr_heart_failure_risk(
            sex=sex,
            age=clamped_age,
            total_cholesterol=clamped_tc,
            hdl_cholesterol=clamped_hdl,
            systolic_bp=clamped_sbp,
            has_diabetes=has_diabetes,
            current_smoker=current_smoker,
            bmi=clamped_bmi,
            egfr=clamped_egfr,
            on_htn_meds=on_htn_meds,
            on_cholesterol_meds=on_cholesterol_meds
        )
    except Exception as e:
        hf_10yr = 0.0

    # 30-year risk calculations
    try:
        cvd_30yr = pyprevent.calculate_30_yr_cvd_risk(
            sex=sex,
            age=clamped_age,
            total_cholesterol=clamped_tc,
            hdl_cholesterol=clamped_hdl,
            systolic_bp=clamped_sbp,
            has_diabetes=has_diabetes,
            current_smoker=current_smoker,
            bmi=clamped_bmi,
            egfr=clamped_egfr,
            on_htn_meds=on_htn_meds,
            on_cholesterol_meds=on_cholesterol_meds
        )
    except Exception:
        cvd_30yr = None

    try:
        ascvd_30yr = pyprevent.calculate_30_yr_ascvd_risk(
            sex=sex,
            age=clamped_age,
            total_cholesterol=clamped_tc,
            hdl_cholesterol=clamped_hdl,
            systolic_bp=clamped_sbp,
            has_diabetes=has_diabetes,
            current_smoker=current_smoker,
            bmi=clamped_bmi,
            egfr=clamped_egfr,
            on_htn_meds=on_htn_meds,
            on_cholesterol_meds=on_cholesterol_meds
        )
    except Exception:
        ascvd_30yr = None

    # Risk Stratification (AHA/ACC 2023 Guidelines)
    score_for_cat = cvd_10yr if cvd_10yr > 0 else ascvd_10yr
    if score_for_cat < 5.0:
        risk_category = "Низкий риск"
        risk_color = "emerald"
        risk_badge = "LOW (< 5%)"
    elif score_for_cat < 7.5:
        risk_category = "Пограничный риск"
        risk_color = "amber"
        risk_badge = "BORDERLINE (5.0–7.4%)"
    elif score_for_cat < 20.0:
        risk_category = "Умеренный (промежуточный) риск"
        risk_color = "orange"
        risk_badge = "INTERMEDIATE (7.5–19.9%)"
    else:
        risk_category = "Высокий риск"
        risk_color = "rose"
        risk_badge = "HIGH (≥ 20.0%)"

    # Clinical guidelines & Statin recommendations
    recommendations = []
    if score_for_cat >= 20.0 or has_diabetes:
        recommendations.append("Рекомендована высокоинтенсивная терапия статинами (High-intensity statin therapy) для снижения уровня ЛПНП ≥ 50%.")
    elif score_for_cat >= 7.5:
        recommendations.append("Показана умеренная или высокоинтенсивная терапия статинами после обсуждения риска с врачом.")
    elif score_for_cat >= 5.0:
        recommendations.append("При наличии факторов риска (бляшки в сосудах, повышение Lp(a), отягощенная наследственность) показано назначение умеренной терапии статинами.")
    else:
        recommendations.append("Базовый сердечно-сосудистый риск низкий. Приоритет — поддержание здорового образа жизни и средиземноморской диеты.")

    if sbp >= 130 or on_htn_meds:
        recommendations.append("Целевой уровень артериального давления по рекомендациям AHA/ACC — менее 130/80 мм рт. ст.")
    if current_smoker:
        recommendations.append("Отказ от курения снизит 10-летний риск сердечно-сосудистых осложнений в 1.5–2 раза.")

    risk_modifiers = params.get("risk_modifiers", [])
    if risk_modifiers:
        recommendations.append(
            f"Факторы усиления риска (AHA/ACC Risk Enhancers): {', '.join(risk_modifiers)}. "
            "Наличие атеросклеротических бляшек сонных артерий или повышенного Lp(a) является прямым клиническим основанием "
            "для рассмотрения гиполипидемической терапии (статины) независимо от базового 10-летнего балла."
        )

    return {
        "cvd_10yr": round(cvd_10yr, 1),
        "ascvd_10yr": round(ascvd_10yr, 1),
        "heart_failure_10yr": round(hf_10yr, 1),
        "cvd_30yr": round(cvd_30yr, 1) if cvd_30yr else None,
        "ascvd_30yr": round(ascvd_30yr, 1) if ascvd_30yr else None,
        "risk_category": risk_category,
        "risk_color": risk_color,
        "risk_badge": risk_badge,
        "risk_modifiers": risk_modifiers,
        "recommendations": recommendations,
        "inputs_used": {
            "sex": sex,
            "age": age,
            "total_cholesterol_mmol": round(mg_dl_to_mmol_cholesterol(clamped_tc), 2),
            "total_cholesterol_mg": round(clamped_tc, 1),
            "hdl_cholesterol_mmol": round(mg_dl_to_mmol_cholesterol(clamped_hdl), 2),
            "hdl_cholesterol_mg": round(clamped_hdl, 1),
            "systolic_bp": round(clamped_sbp, 0),
            "has_diabetes": has_diabetes,
            "current_smoker": current_smoker,
            "bmi": round(clamped_bmi, 1),
            "egfr": round(clamped_egfr, 1),
            "on_htn_meds": on_htn_meds,
            "on_cholesterol_meds": on_cholesterol_meds
        }
    }
