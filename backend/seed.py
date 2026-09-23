"""Seeds demo patient data for instant testing."""
from backend.database import SessionLocal, engine, Base
from backend import models

Base.metadata.create_all(bind=engine)
db = SessionLocal()

if db.query(models.Patient).count() == 0:
    demo_patient = models.Patient(
        full_name="Иванов Иван Иванович",
        birth_date="1988-06-15",
        age=36,
        gender="male",
        height=180.0,
        weight=78.5,
        bmi=24.2,
        blood_type="A(II) Rh+",
        allergies="Пенициллин (крапивница, отек), арахис",
        chronic_diseases="Хронический гастрит в стадии ремиссии",
        current_medications="Омега-3 1000мг в день, Витамин D 2000 МЕ утром",
        notes="Активно занимается бегом, периодически сдает контрольные биохимические анализы."
    )
    db.add(demo_patient)
    db.commit()
    db.refresh(demo_patient)

    # Folders
    folders = [
        ("Лабораторные анализы", "analyses"),
        ("Инструментальные исследования", "researches"),
        ("Консультации и выписки", "notes"),
        ("База знаний и литература", "knowledge_base"),
    ]
    created_folders = {}
    for name, ftype in folders:
        f = models.Folder(patient_id=demo_patient.id, name=name, folder_type=ftype)
        db.add(f)
        db.commit()
        db.refresh(f)
        created_folders[ftype] = f.id

    # Add sample lab metrics
    sample_labs = [
        ("Ферритин", 45.0, "мкг/л", 30.0, 200.0, "normal", "2024-01-10"),
        ("Ферритин", 68.0, "мкг/л", 30.0, 200.0, "normal", "2024-05-15"),
        ("Ферритин", 92.0, "мкг/л", 30.0, 200.0, "normal", "2024-09-02"),
        ("Витамин D (25-OH)", 22.0, "нг/мл", 30.0, 100.0, "low", "2024-01-10"),
        ("Витамин D (25-OH)", 34.0, "нг/мл", 30.0, 100.0, "normal", "2024-05-15"),
        ("Витамин D (25-OH)", 55.0, "нг/мл", 30.0, 100.0, "normal", "2024-09-02"),
    ]
    for m_name, val, unit, r_min, r_max, status, r_date in sample_labs:
        db.add(models.LabMetric(
            patient_id=demo_patient.id,
            metric_name=m_name,
            value=val,
            unit=unit,
            reference_min=r_min,
            reference_max=r_max,
            status=status,
            record_date=r_date,
            notes="Первичный скрининг"
        ))
    db.commit()

    # Initial Chat Session
    session = models.ChatSession(
        patient_id=demo_patient.id,
        title="Оценка динамики ферритина и витамина D",
        model_id="demo-doctor",
        provider="demo"
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Initial messages
    db.add(models.ChatMessage(
        session_id=session.id,
        role="assistant",
        content="Здравствуйте, Иван Иванович! Я ваш персональный медицинский ассистент MY_DOC.\n\nЯ проанализировал вашу медицинскую карту:\n- Текущий ИМТ: **24.2** (норма);\n- Зафиксирована аллергия на **пенициллин** и арахис (учтено в системе);\n- В анализах отмечается положительная динамика уровня витамина D (поднялся с 22 до 55 нг/мл) и ферритина (с 45 до 92 мкг/л).\n\nЗадайте любой вопрос или загрузите новые исследования в папки документов!"
    ))
    db.commit()

    print("Demo patient and metrics seeded successfully!")
else:
    print("Database already has patients.")

db.close()
