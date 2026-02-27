"""batch2_server_cleanup

Converts all inline ALTER TABLE / CREATE TABLE patches from app/server.py
into proper Alembic migrations. All operations are idempotent — safe to run
on existing databases that already have these changes applied via the old
startup patches.

Revision ID: c3f8a1b2d4e5
Revises: 9769b8efc7b8
Create Date: 2026-02-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3f8a1b2d4e5'
down_revision: Union[str, Sequence[str], None] = '9769b8efc7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _add_column_if_missing(table: str, column: str, col_def: str, conn) -> None:
    """Add a column only if it doesn't already exist (SQLite safe)."""
    try:
        conn.execute(sa.text(f"ALTER TABLE {table} ADD COLUMN {column} {col_def}"))
        conn.commit()
    except Exception:
        pass  # column already exists


def upgrade() -> None:
    conn = op.get_bind()

    # ── jobs: extra columns added in original patches ──────────────────────
    for col, defn in [
        ("type", "VARCHAR"),
        ("priority", "VARCHAR"),
        ("city", "VARCHAR"),
        ("job_category", "VARCHAR"),
        ("employment_type", "VARCHAR"),
    ]:
        _add_column_if_missing("jobs", col, defn, conn)

    # ── candidate_job_links: rejection_reason ──────────────────────────────
    _add_column_if_missing("candidate_job_links", "rejection_reason", "VARCHAR", conn)

    # ── candidates: soft-delete + followup + dedup ─────────────────────────
    for col, defn in [
        ("followup_status", "VARCHAR"),
        ("merged_into", "INTEGER"),
        ("deleted_at", "DATETIME"),
    ]:
        _add_column_if_missing("candidates", col, defn, conn)

    # ── suppliers table ────────────────────────────────────────────────────
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS suppliers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR NOT NULL,
          type VARCHAR,
          contact_name VARCHAR,
          phone VARCHAR,
          email VARCHAR,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """))
    conn.commit()

    # ── candidates.supplier_id foreign key ─────────────────────────────────
    _add_column_if_missing(
        "candidates", "supplier_id",
        "INTEGER REFERENCES suppliers(id)", conn
    )

    # ── activity_records table ─────────────────────────────────────────────
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS activity_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          link_id INTEGER NOT NULL REFERENCES candidate_job_links(id) ON DELETE CASCADE,
          type VARCHAR NOT NULL,
          stage VARCHAR,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          actor VARCHAR,
          comment TEXT,
          conclusion VARCHAR,
          rejection_reason TEXT,
          round VARCHAR,
          interview_time VARCHAR,
          scheduled_at DATETIME,
          location VARCHAR,
          status VARCHAR,
          score INTEGER,
          salary VARCHAR,
          start_date VARCHAR,
          from_stage VARCHAR,
          to_stage VARCHAR
        )
    """))
    conn.commit()

    # ── migrate interview_records → activity_records (idempotent) ──────────
    try:
        migrated = conn.execute(sa.text(
            "SELECT COUNT(*) FROM activity_records WHERE type='interview'"
        )).scalar()
        source_count = conn.execute(sa.text(
            "SELECT COUNT(*) FROM interview_records"
        )).scalar()
        if migrated == 0 and source_count > 0:
            conn.execute(sa.text("""
                INSERT INTO activity_records
                  (link_id, type, stage, created_at, actor, comment, conclusion,
                   rejection_reason, round, interview_time, scheduled_at, location, status, score)
                SELECT
                  ir.link_id,
                  'interview',
                  COALESCE(cjl.stage, '面试'),
                  ir.created_at,
                  ir.interviewer,
                  ir.comment,
                  ir.conclusion,
                  ir.rejection_reason,
                  ir.round,
                  ir.interview_time,
                  ir.scheduled_at,
                  ir.location,
                  ir.status,
                  ir.score
                FROM interview_records ir
                LEFT JOIN candidate_job_links cjl ON cjl.id = ir.link_id
            """))
            conn.commit()
    except Exception:
        pass  # interview_records table may not exist

    # ── rename interview_records → interview_records_bak ───────────────────
    try:
        bak_exists = conn.execute(sa.text(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='interview_records_bak'"
        )).fetchone()
        if not bak_exists:
            conn.execute(sa.text("ALTER TABLE interview_records RENAME TO interview_records_bak"))
            conn.commit()
    except Exception:
        pass  # already renamed or doesn't exist

    # ── drop deprecated jobs columns ───────────────────────────────────────
    for stmt in (
        "ALTER TABLE jobs DROP COLUMN stages",
        "ALTER TABLE jobs DROP COLUMN interview_rounds",
        "ALTER TABLE candidate_job_links DROP COLUMN interview_rounds",
    ):
        try:
            conn.execute(sa.text(stmt))
            conn.commit()
        except Exception:
            pass  # column doesn't exist or already dropped


def downgrade() -> None:
    # These schema changes from the old startup patches are not safely
    # reversible without risk of data loss. No-op downgrade is intentional.
    pass
