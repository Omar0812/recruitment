from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

from app.database import engine
from app import models
from app.routes import candidates, resume, jobs, pipeline, dashboard, activities, dedup, suppliers, context, insights

models.Base.metadata.create_all(bind=engine)
Path("data/resumes").mkdir(parents=True, exist_ok=True)

# ALTER TABLE patch for existing databases
with engine.connect() as conn:
    sa = __import__("sqlalchemy")
    for col in ("type", "priority", "city", "job_category", "employment_type"):
        try:
            conn.execute(sa.text(f"ALTER TABLE jobs ADD COLUMN {col} VARCHAR"))
            conn.commit()
        except Exception:
            pass
    for stmt in (
        "ALTER TABLE candidate_job_links ADD COLUMN rejection_reason VARCHAR",
        "ALTER TABLE candidates ADD COLUMN followup_status VARCHAR",
        "ALTER TABLE candidates ADD COLUMN merged_into INTEGER",
        "ALTER TABLE candidates ADD COLUMN deleted_at DATETIME",
        """CREATE TABLE IF NOT EXISTS interview_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          link_id INTEGER NOT NULL REFERENCES candidate_job_links(id) ON DELETE CASCADE,
          round VARCHAR, interviewer VARCHAR, interview_time VARCHAR,
          score INTEGER, comment TEXT, conclusion VARCHAR,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )""",
        "ALTER TABLE interview_records ADD COLUMN status VARCHAR DEFAULT 'completed'",
        "ALTER TABLE interview_records ADD COLUMN scheduled_at DATETIME",
        "ALTER TABLE interview_records ADD COLUMN location VARCHAR",
        "ALTER TABLE interview_records ADD COLUMN rejection_reason TEXT",
    ):
        try:
            conn.execute(sa.text(stmt))
            conn.commit()
        except Exception:
            pass

    # ── activity_records migration ──────────────────────────────────────────
    # 1. Create activity_records table if not exists
    try:
        conn.execute(sa.text("""
            CREATE TABLE IF NOT EXISTS activity_records (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              link_id INTEGER NOT NULL REFERENCES candidate_job_links(id) ON DELETE CASCADE,
              type VARCHAR NOT NULL,
              stage VARCHAR NOT NULL,
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
    except Exception:
        pass

    # 2. Migrate interview_records -> activity_records (only if not already done)
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
        pass

    # 3. Rename interview_records to interview_records_bak (backup)
    try:
        bak_exists = conn.execute(sa.text(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='interview_records_bak'"
        )).fetchone()
        if not bak_exists:
            conn.execute(sa.text("ALTER TABLE interview_records RENAME TO interview_records_bak"))
            conn.commit()
    except Exception:
        pass

    # ── v1-product-simplify: drop deprecated columns ──────────────────────
    for drop_stmt in (
        "ALTER TABLE jobs DROP COLUMN stages",
        "ALTER TABLE jobs DROP COLUMN interview_rounds",
        "ALTER TABLE candidate_job_links DROP COLUMN interview_rounds",
    ):
        try:
            conn.execute(sa.text(drop_stmt))
            conn.commit()
        except Exception:
            pass

    # ── v1-supplier: suppliers table + candidate.supplier_id ────────────
    try:
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
    except Exception:
        pass
    try:
        conn.execute(sa.text("ALTER TABLE candidates ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id)"))
        conn.commit()
    except Exception:
        pass

app = FastAPI(title="招聘管理工具")

app.include_router(candidates.router)
app.include_router(resume.router)
app.include_router(jobs.router)
app.include_router(pipeline.router)
app.include_router(dashboard.router)
app.include_router(activities.router)
app.include_router(dedup.router)
app.include_router(suppliers.router)
app.include_router(context.router)
app.include_router(insights.router)

app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/resumes", StaticFiles(directory="data/resumes"), name="resumes")


@app.get("/")
def index():
    return FileResponse("static/index.html")
