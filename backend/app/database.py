import os
from pathlib import Path
import sqlite3

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


def _database_path() -> Path:
    configured_path = os.getenv("LIA_DATABASE_PATH")
    if configured_path:
        return Path(configured_path)

    if os.getenv("VERCEL"):
        return Path("/tmp/copilot.db")

    return Path(__file__).resolve().parent.parent / "copilot.db"


DB_PATH = _database_path()
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH.as_posix()}"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db() -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS agent_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_name TEXT NOT NULL,
                summary TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        _ensure_meeting_source_columns(conn)
        _ensure_learning_product_columns(conn)


def record_agent_run(agent_name: str, summary: str) -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT INTO agent_runs (agent_name, summary) VALUES (?, ?)",
            (agent_name, summary),
        )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_meeting_source_columns(conn: sqlite3.Connection) -> None:
    existing_tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='meetings'").fetchone()
    if not existing_tables:
        return

    columns = {row[1] for row in conn.execute("PRAGMA table_info(meetings)").fetchall()}
    additions = {
        "source_type": "TEXT DEFAULT 'Transcript'",
        "meeting_title": "TEXT DEFAULT 'Operational Meeting Record'",
        "meeting_date": "TEXT DEFAULT ''",
        "operational_category": "TEXT DEFAULT 'Operational Meeting Intelligence'",
        "source_url": "TEXT DEFAULT ''",
        "embed_code": "TEXT DEFAULT ''",
        "ingestion_method": "TEXT DEFAULT 'manual'",
        "platform_name": "TEXT DEFAULT 'Manual Transcript'",
        "ingestion_status": "TEXT DEFAULT 'ready'",
        "analysis_status": "TEXT DEFAULT 'pending'",
        "ai_status": "TEXT DEFAULT 'pending'",
        "delivery_status": "TEXT DEFAULT 'Awaiting AI Review'",
        "reports_generated": "INTEGER DEFAULT 0",
        "stakeholder_emails": "INTEGER DEFAULT 0",
        "recommendations": "TEXT DEFAULT '[]'",
        "delivery_concerns": "TEXT DEFAULT '[]'",
        "analysis_timestamp": "TIMESTAMP",
        "owners": "TEXT DEFAULT '[]'",
        "stakeholder_followups": "TEXT DEFAULT '[]'",
        "next_meeting_preparation": "TEXT DEFAULT '[]'",
        "manager_summary": "TEXT DEFAULT ''",
    }

    existing_email_tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='generated_emails'").fetchone()
    if existing_email_tables:
        email_columns = {row[1] for row in conn.execute("PRAGMA table_info(generated_emails)").fetchall()}
        email_additions = {
            "recipients": "TEXT DEFAULT '[]'",
            "sent_status": "TEXT DEFAULT 'draft'",
            "sent_at": "TIMESTAMP",
            "send_error": "TEXT DEFAULT ''",
        }
        for column, definition in email_additions.items():
            if column not in email_columns:
                conn.execute(f"ALTER TABLE generated_emails ADD COLUMN {column} {definition}")

    existing_report_tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='generated_reports'").fetchone()
    if existing_report_tables:
        report_columns = {row[1] for row in conn.execute("PRAGMA table_info(generated_reports)").fetchall()}
        report_additions = {
            "executive_operational_summary": "TEXT DEFAULT ''",
            "delivery_readiness_overview": "TEXT DEFAULT ''",
            "operational_risks_concerns": "TEXT DEFAULT ''",
            "facilitator_content_readiness": "TEXT DEFAULT ''",
            "assessment_lms_readiness": "TEXT DEFAULT ''",
            "stakeholder_coordination_updates": "TEXT DEFAULT ''",
            "recommended_next_actions": "TEXT DEFAULT ''",
            "next_meeting_focus_areas": "TEXT DEFAULT ''",
            "delivery_confidence": "TEXT DEFAULT 'Medium'",
        }
        for column, definition in report_additions.items():
            if column not in report_columns:
                conn.execute(f"ALTER TABLE generated_reports ADD COLUMN {column} {definition}")

    for column, definition in additions.items():
        if column not in columns:
            conn.execute(f"ALTER TABLE meetings ADD COLUMN {column} {definition}")


def _ensure_learning_product_columns(conn: sqlite3.Connection) -> None:
    existing_table = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='learning_products'").fetchone()
    if not existing_table:
        return

    columns = {row[1] for row in conn.execute("PRAGMA table_info(learning_products)").fetchall()}
    additions = {
        "course_name": "TEXT DEFAULT ''",
        "learner_level": "TEXT DEFAULT 'Basic'",
    }
    for column, definition in additions.items():
        if column not in columns:
            conn.execute(f"ALTER TABLE learning_products ADD COLUMN {column} {definition}")

    assessment_table = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='assessments'").fetchone()
    if assessment_table:
        assessment_columns = {row[1] for row in conn.execute("PRAGMA table_info(assessments)").fetchall()}
        assessment_additions = {
            "quizzes": "TEXT DEFAULT '[]'",
            "focus_areas": "TEXT DEFAULT '[]'",
            "evaluation_objectives": "TEXT DEFAULT '[]'",
        }
        for column, definition in assessment_additions.items():
            if column not in assessment_columns:
                conn.execute(f"ALTER TABLE assessments ADD COLUMN {column} {definition}")
