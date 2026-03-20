from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app import models  # noqa: F401 — ensure all models are imported
from app.database import Base, engine, SessionLocal, ensure_legacy_job_columns, ensure_candidate_attachments_column
from app.entry.api import install_error_handlers, router as api_v1_router
from app.models.system_setting import SystemSetting

Base.metadata.create_all(bind=engine)
ensure_legacy_job_columns()
ensure_candidate_attachments_column()


def _ensure_system_settings():
    db = SessionLocal()
    try:
        if db.query(SystemSetting).count() == 0:
            db.add_all([
                SystemSetting(key="registration_open", value="true"),
                SystemSetting(key="ai_provider", value=""),
                SystemSetting(key="ai_model", value=""),
                SystemSetting(key="ai_api_key", value=""),
                SystemSetting(key="ai_base_url", value=""),
            ])
            db.commit()
    finally:
        db.close()


_ensure_system_settings()

Path("data/resumes").mkdir(parents=True, exist_ok=True)

app = FastAPI(title="招聘管理工具")

app.include_router(api_v1_router)
install_error_handlers(app)

# 静态文件托管
DIST_DIR = Path("frontend/dist")

if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="dist-assets")

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str):
        if full_path.startswith("api/") or full_path == "api":
            raise HTTPException(status_code=404, detail="Not Found")
        return FileResponse(
            str(DIST_DIR / "index.html"),
            headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
        )
