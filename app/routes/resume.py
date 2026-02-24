import uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.extractor import extract_text
from app import ai_client

router = APIRouter(prefix="/api/resume", tags=["resume"])

RESUME_DIR = Path("data/resumes")


@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):
    suffix = Path(file.filename).suffix.lower()
    if suffix not in (".pdf", ".docx", ".doc", ".png", ".jpg", ".jpeg"):
        raise HTTPException(status_code=400, detail="不支持的文件格式")

    file_id = str(uuid.uuid4())
    dest_dir = RESUME_DIR / file_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / file.filename

    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    text = extract_text(str(dest_path))

    ai_configured = ai_client._is_configured()
    parsed = {}
    warning = None

    if ai_configured:
        try:
            parsed = ai_client.parse_resume(text)
        except Exception as e:
            warning = f"AI解析失败: {e}"
    else:
        warning = "AI未配置，请在 config.json 中填入 API Key 后重启应用"

    return {
        "file_id": file_id,
        "resume_path": str(dest_path),
        "extracted_text": text[:500],
        "parsed": parsed,
        "warning": warning,
    }
