import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

_env_db_url = (os.environ.get("DATABASE_URL") or "").strip()
if _env_db_url:
    # Use psycopg2 driver explicitly for full compatibility with Supabase Transaction Pooler (PgBouncer)
    if _env_db_url.startswith("postgres://"):
        _env_db_url = "postgresql+psycopg2://" + _env_db_url[len("postgres://"):]
    elif _env_db_url.startswith("postgresql://"):
        _env_db_url = "postgresql+psycopg2://" + _env_db_url[len("postgresql://"):]
    DATABASE_URL = _env_db_url
    IS_SQLITE = DATABASE_URL.startswith("sqlite")
else:
    if os.environ.get("VERCEL"):
        DATA_DIR = "/tmp/mydoc_data"
    os.makedirs(DATA_DIR, exist_ok=True)
    DB_PATH = os.path.join(DATA_DIR, "mydoc.db")
    DATABASE_URL = f"sqlite:///{DB_PATH}"
    IS_SQLITE = True

if IS_SQLITE:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def run_auth_migrations():
    """Safely migrates existing SQLite tables to add user_id for multi-user auth."""
    if not IS_SQLITE:
        return
    with engine.begin() as conn:
        # 1. Add user_id to patients if missing
        cols = [row[1] for row in conn.execute(text("PRAGMA table_info(patients)")).fetchall()]
        if cols and "user_id" not in cols:
            conn.execute(text("ALTER TABLE patients ADD COLUMN user_id INTEGER REFERENCES users(id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_patients_user_id ON patients (user_id)"))

        # 2. Migrate app_settings to support per-user settings with UNIQUE(user_id, key)
        setting_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(app_settings)")).fetchall()]
        if setting_cols and "user_id" not in setting_cols:
            conn.execute(text("""
                CREATE TABLE app_settings_new (
                    id INTEGER NOT NULL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    "key" VARCHAR(100) NOT NULL,
                    value TEXT,
                    description VARCHAR(255),
                    updated_at DATETIME,
                    CONSTRAINT uq_user_setting_key UNIQUE (user_id, "key")
                )
            """))
            conn.execute(text("""
                INSERT INTO app_settings_new (id, user_id, "key", value, description, updated_at)
                SELECT id, NULL, "key", value, description, updated_at FROM app_settings
            """))
            conn.execute(text("DROP TABLE app_settings"))
            conn.execute(text("ALTER TABLE app_settings_new RENAME TO app_settings"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_app_settings_id ON app_settings (id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_app_settings_user_id ON app_settings (user_id)"))
            conn.execute(text('CREATE INDEX IF NOT EXISTS ix_app_settings_key ON app_settings ("key")'))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
