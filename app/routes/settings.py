from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import json
import os

router = APIRouter(prefix="/api/settings", tags=["settings"])

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "../../config.json")


def _read_config() -> dict:
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _write_config(data: dict):
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _mask_key(key: str) -> str:
    if not key:
        return ""
    return key[:4] + "****" if len(key) > 4 else "****"


@router.get("/ai")
def get_ai_settings():
    cfg = _read_config()
    return {
        "provider": cfg.get("provider", ""),
        "base_url": cfg.get("base_url", ""),
        "model": cfg.get("model", ""),
        "api_key_masked": _mask_key(cfg.get("api_key", "")),
    }


class AISettingsUpdate(BaseModel):
    provider: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None
    api_key: Optional[str] = None


@router.patch("/ai")
def update_ai_settings(data: AISettingsUpdate):
    cfg = _read_config()
    if data.provider is not None:
        cfg["provider"] = data.provider
    if data.base_url is not None:
        cfg["base_url"] = data.base_url
    if data.model is not None:
        cfg["model"] = data.model
    if data.api_key is not None:
        cfg["api_key"] = data.api_key
    _write_config(cfg)
    return {"ok": True}


@router.post("/ai/verify")
def verify_ai_connection():
    cfg = _read_config()
    api_key = cfg.get("api_key", "")
    base_url = cfg.get("base_url", "")
    model = cfg.get("model", "")
    if not api_key or not base_url or not model:
        raise HTTPException(status_code=400, detail="AI 配置不完整，请先填写所有字段")
    try:
        import httpx
        resp = httpx.post(
            f"{base_url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": model, "messages": [{"role": "user", "content": "hi"}], "max_tokens": 1},
            timeout=10,
        )
        if resp.status_code == 200:
            return {"ok": True, "message": "连接成功"}
        else:
            raise HTTPException(status_code=400, detail=f"连接失败：{resp.status_code} {resp.text[:200]}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"连接失败：{str(e)}")
