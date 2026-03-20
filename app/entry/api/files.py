"""POST /files/upload + POST /files/parse + GET /files/{file_path}"""
from __future__ import annotations

import hashlib
import logging
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.entry.deps import current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/files", tags=["files"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".png", ".jpg", ".jpeg"}
MAX_SIZE_BYTES = 100 * 1024 * 1024  # 100MB
UPLOAD_DIR = Path("data/resumes")
CHUNK_SIZE = 64 * 1024  # 64KB


def _resolve_upload_path(file_path: str) -> Path:
    normalized = (file_path or "").strip().lstrip("/")
    if not normalized:
        raise HTTPException(404, "File not found")

    requested = Path(normalized)
    if requested.is_absolute():
        raise HTTPException(404, "File not found")

    if requested.parts[: len(UPLOAD_DIR.parts)] == UPLOAD_DIR.parts:
        target = requested
    elif len(requested.parts) == 1:
        target = UPLOAD_DIR / requested
    else:
        raise HTTPException(404, "File not found")

    resolved_root = UPLOAD_DIR.resolve()
    resolved_target = target.resolve(strict=False)
    try:
        resolved_target.relative_to(resolved_root)
    except ValueError as exc:
        raise HTTPException(404, "File not found") from exc

    if not target.is_file():
        raise HTTPException(404, "File not found")

    return target


@router.post("/upload")
async def upload_file(file: UploadFile, user: User = Depends(current_user)):
    ext = Path(file.filename or "").suffix.lower()

    if ext == ".doc":
        raise HTTPException(400, "不支持 .doc 格式，请转为 PDF 或 DOCX 后上传")

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"不支持的文件类型：{ext}，仅允许 pdf/docx/png/jpg/jpeg")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # 流式写临时文件 + 边算 SHA256
    sha = hashlib.sha256()
    total_size = 0
    tmp_fd = tempfile.NamedTemporaryFile(dir=UPLOAD_DIR, delete=False, suffix=ext)
    tmp_path = Path(tmp_fd.name)
    try:
        while True:
            chunk = await file.read(CHUNK_SIZE)
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > MAX_SIZE_BYTES:
                tmp_fd.close()
                tmp_path.unlink(missing_ok=True)
                raise HTTPException(400, "文件大小超过 100MB 限制")
            sha.update(chunk)
            tmp_fd.write(chunk)
        tmp_fd.close()
    except HTTPException:
        raise
    except Exception:
        tmp_fd.close()
        tmp_path.unlink(missing_ok=True)
        raise

    sha256 = sha.hexdigest()
    dest = UPLOAD_DIR / f"{sha256}{ext}"

    if dest.exists():
        tmp_path.unlink(missing_ok=True)
    else:
        tmp_path.rename(dest)

    return {"file_id": sha256, "file_path": str(dest), "sha256": sha256}


class ParseRequest(BaseModel):
    file_path: str


@router.post("/parse")
def parse_resume_file(req: ParseRequest, user: User = Depends(current_user)):
    """提取简历内容并调用 AI 解析，返回结构化候选人信息。"""
    target = _resolve_upload_path(req.file_path)

    from app.extractor import extract_content
    from app.ai_client import parse_resume

    content = extract_content(str(target))

    # extract_content 返回错误
    if "error" in content:
        return content

    result = parse_resume(content)
    return result


@router.get("/{file_path:path}")
async def get_file(file_path: str, user: User = Depends(current_user)):
    target = _resolve_upload_path(file_path)
    return FileResponse(target)
