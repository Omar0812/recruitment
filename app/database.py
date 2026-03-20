from typing import Generator

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

DATABASE_URL = "sqlite:///./data/recruitment.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@event.listens_for(engine, "connect")
def _set_sqlite_wal(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


class Base(DeclarativeBase):
    pass


def ensure_legacy_job_columns() -> None:
    """Backfill missing jobs columns for existing local SQLite databases."""
    if engine.dialect.name != "sqlite":
        return

    with engine.begin() as conn:
        inspector = inspect(conn)
        if "jobs" not in inspector.get_table_names():
            return

        existing_columns = {column["name"] for column in inspector.get_columns("jobs")}
        statements: list[str] = []

        if "location_name" not in existing_columns:
            statements.append("ALTER TABLE jobs ADD COLUMN location_name VARCHAR")
        if "location_address" not in existing_columns:
            statements.append("ALTER TABLE jobs ADD COLUMN location_address VARCHAR")
        if "notes" not in existing_columns:
            statements.append("ALTER TABLE jobs ADD COLUMN notes TEXT")
        if "close_reason" not in existing_columns:
            statements.append("ALTER TABLE jobs ADD COLUMN close_reason VARCHAR")
        if "closed_at" not in existing_columns:
            statements.append("ALTER TABLE jobs ADD COLUMN closed_at DATETIME")

        for statement in statements:
            conn.execute(text(statement))

        if "city" in existing_columns:
            conn.execute(text("""
                UPDATE jobs
                SET location_name = city
                WHERE location_name IS NULL AND city IS NOT NULL
            """))

        if "persona" in existing_columns:
            conn.execute(text("""
                UPDATE jobs
                SET notes = persona
                WHERE notes IS NULL AND persona IS NOT NULL
            """))


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_candidate_attachments_column() -> None:
    """Add attachments JSON column to candidates and migrate resume_path data."""
    if engine.dialect.name != "sqlite":
        return

    with engine.begin() as conn:
        inspector = inspect(conn)
        if "candidates" not in inspector.get_table_names():
            return

        existing_columns = {col["name"] for col in inspector.get_columns("candidates")}
        if "attachments" in existing_columns:
            return

        conn.execute(text("ALTER TABLE candidates ADD COLUMN attachments JSON DEFAULT '[]'"))

        # 迁移 resume_path → attachments[0]
        from datetime import datetime, timezone
        import json

        rows = conn.execute(text(
            "SELECT id, resume_path, created_at FROM candidates WHERE resume_path IS NOT NULL AND resume_path != ''"
        )).fetchall()

        for row in rows:
            attachment = json.dumps([{
                "file_path": row[1],
                "label": "简历",
                "type": "resume",
                "created_at": row[2] or datetime.now(timezone.utc).isoformat(),
            }], ensure_ascii=False)
            conn.execute(
                text("UPDATE candidates SET attachments = :att WHERE id = :cid"),
                {"att": attachment, "cid": row[0]},
            )
