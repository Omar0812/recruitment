from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

from app.database import engine
from app import models
from app.routes import candidates, resume, jobs, pipeline, dashboard

models.Base.metadata.create_all(bind=engine)
Path("data/resumes").mkdir(parents=True, exist_ok=True)

app = FastAPI(title="招聘管理工具")

app.include_router(candidates.router)
app.include_router(resume.router)
app.include_router(jobs.router)
app.include_router(pipeline.router)
app.include_router(dashboard.router)

app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/resumes", StaticFiles(directory="data/resumes"), name="resumes")


@app.get("/")
def index():
    return FileResponse("static/index.html")
