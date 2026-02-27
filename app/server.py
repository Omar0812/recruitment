from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

from app.database import engine
from app import models
from app.routes import candidates, resume, jobs, pipeline, dashboard, activities, dedup, suppliers, context, insights, settings

models.Base.metadata.create_all(bind=engine)
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

app.mount("/resumes", StaticFiles(directory="data/resumes"), name="resumes")
app.mount("/assets", StaticFiles(directory="static/dist/assets"), name="dist-assets")


@app.get("/")
def index():
    return FileResponse("static/dist/index.html")


@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    return FileResponse("static/dist/index.html")
