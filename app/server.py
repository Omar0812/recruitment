from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

from app.database import engine
from app import models
from app.routes import candidates, resume, jobs, pipeline, dashboard, interviews, dedup

models.Base.metadata.create_all(bind=engine)
Path("data/resumes").mkdir(parents=True, exist_ok=True)

# ALTER TABLE patch for existing databases
with engine.connect() as conn:
    for col in ("type", "priority", "city", "job_category", "employment_type"):
        try:
            conn.execute(__import__("sqlalchemy").text(f"ALTER TABLE jobs ADD COLUMN {col} VARCHAR"))
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
    ):
        try:
            conn.execute(__import__("sqlalchemy").text(stmt))
            conn.commit()
        except Exception:
            pass

app = FastAPI(title="招聘管理工具")

app.include_router(candidates.router)
app.include_router(resume.router)
app.include_router(jobs.router)
app.include_router(pipeline.router)
app.include_router(dashboard.router)
app.include_router(interviews.router)
app.include_router(dedup.router)

app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/resumes", StaticFiles(directory="data/resumes"), name="resumes")


@app.get("/")
def index():
    return FileResponse("static/index.html")
