import sqlite3
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.database import engine
from app import models
from app.routes import candidates, resume, jobs, pipeline, dashboard, activities, dedup, suppliers, context, insights, settings, analytics, email

models.Base.metadata.create_all(bind=engine)


def _ensure_sqlite_columns():
    db_path = Path("data/recruitment.db")
    if not db_path.exists():
        return
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(candidates)")
        existing = {row[1] for row in cur.fetchall()}
        if "project_experience" not in existing:
            cur.execute("ALTER TABLE candidates ADD COLUMN project_experience JSON")
        conn.commit()
    finally:
        conn.close()


_ensure_sqlite_columns()
Path("data/resumes").mkdir(parents=True, exist_ok=True)

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
app.include_router(settings.router)
app.include_router(analytics.router)
app.include_router(email.router)

app.mount("/resumes", StaticFiles(directory="data/resumes"), name="resumes")
app.mount("/assets", StaticFiles(directory="static/dist/assets"), name="dist-assets")


@app.get("/")
def index():
    return FileResponse("static/dist/index.html")


@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    if full_path == "api" or full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not Found")
    return FileResponse("static/dist/index.html")
