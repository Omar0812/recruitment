from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

DATABASE_URL = "sqlite:///./data/recruitment.db"

Path("data").mkdir(parents=True, exist_ok=True)
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@event.listens_for(engine, "connect")
def _set_sqlite_wal(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


class Base(DeclarativeBase):
    pass


def _sqla_type_to_ddl(col_type) -> str:
    """Map SQLAlchemy column type to SQLite DDL type string."""
    import sqlalchemy.types as satypes

    type_map = [
        (satypes.Boolean, "BOOLEAN"),
        (satypes.Date, "DATE"),
        (satypes.DateTime, "DATETIME"),
        (satypes.Float, "FLOAT"),
        (satypes.Integer, "INTEGER"),
        (satypes.JSON, "JSON"),
        (satypes.Text, "TEXT"),
        (satypes.String, "VARCHAR"),
    ]
    for cls, ddl in type_map:
        if isinstance(col_type, cls):
            return ddl
    return "TEXT"


def ensure_all_columns() -> None:
    """Auto-add missing columns for ALL existing tables (old DB + new code)."""
    if engine.dialect.name != "sqlite":
        return

    with engine.begin() as conn:
        inspector = inspect(conn)
        existing_tables = set(inspector.get_table_names())

        for table_name, table in Base.metadata.tables.items():
            if table_name not in existing_tables:
                continue  # new table — create_all will handle it
            existing_cols = {c["name"] for c in inspector.get_columns(table_name)}
            for col in table.columns:
                if col.name in existing_cols:
                    continue
                ddl_type = _sqla_type_to_ddl(col.type)
                default_clause = ""
                if ddl_type == "JSON":
                    default_clause = " DEFAULT '[]'"
                elif ddl_type == "INTEGER" and col.default is not None:
                    arg = col.default.arg
                    if isinstance(arg, int):
                        default_clause = f" DEFAULT {arg}"
                elif ddl_type == "BOOLEAN" and col.default is not None:
                    arg = col.default.arg
                    if isinstance(arg, bool):
                        default_clause = f" DEFAULT {int(arg)}"
                stmt = f"ALTER TABLE {table_name} ADD COLUMN {col.name} {ddl_type}{default_clause}"
                conn.execute(text(stmt))

        # Legacy data migration: city → location_name, persona → notes
        if "jobs" in existing_tables:
            job_cols = {c["name"] for c in inspector.get_columns("jobs")}
            if "city" in job_cols and "location_name" in job_cols:
                conn.execute(text("""
                    UPDATE jobs SET location_name = city
                    WHERE location_name IS NULL AND city IS NOT NULL
                """))
            if "persona" in job_cols and "notes" in job_cols:
                conn.execute(text("""
                    UPDATE jobs SET notes = persona
                    WHERE notes IS NULL AND persona IS NOT NULL
                """))

        # Legacy data migration: offer_recorded payload 字段名统一
        # cash_monthly → monthly_salary, months → salary_months
        if "events" in existing_tables:
            conn.execute(text("""
                UPDATE events
                SET payload = json_set(
                    json_remove(
                        json_remove(payload, '$.cash_monthly'),
                        '$.months'
                    ),
                    '$.monthly_salary', json_extract(payload, '$.cash_monthly'),
                    '$.salary_months', json_extract(payload, '$.months')
                )
                WHERE type = 'offer_recorded'
                  AND payload IS NOT NULL
                  AND json_extract(payload, '$.cash_monthly') IS NOT NULL
            """))


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_candidate_attachments_column() -> None:
    """Migrate resume_path data into attachments JSON column."""
    if engine.dialect.name != "sqlite":
        return

    with engine.begin() as conn:
        inspector = inspect(conn)
        if "candidates" not in inspector.get_table_names():
            return

        existing_columns = {col["name"] for col in inspector.get_columns("candidates")}
        if "attachments" not in existing_columns or "resume_path" not in existing_columns:
            return

        # 迁移 resume_path → attachments[0]（只迁移 attachments 还是空的行）
        from datetime import datetime, timezone
        from app.utils.time import to_utc_z, utc_now
        import json

        rows = conn.execute(text(
            "SELECT id, resume_path, created_at FROM candidates"
            " WHERE resume_path IS NOT NULL AND resume_path != ''"
            " AND (attachments IS NULL OR attachments = '[]')"
        )).fetchall()

        for row in rows:
            attachment = json.dumps([{
                "file_path": row[1],
                "label": "简历",
                "type": "resume",
                "created_at": row[2] or to_utc_z(utc_now()),
            }], ensure_ascii=False)
            conn.execute(
                text("UPDATE candidates SET attachments = :att WHERE id = :cid"),
                {"att": attachment, "cid": row[0]},
            )
