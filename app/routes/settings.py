from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import json
import os
import smtplib
import ssl

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
    base_url = cfg.get("base_url", "")
    return {
        "provider": cfg.get("provider", ""),
        "base_url": base_url,
        "api_base": base_url,
        "model": cfg.get("model", ""),
        "api_key_masked": _mask_key(cfg.get("api_key", "")),
        "api_key": "",
    }


class AISettingsUpdate(BaseModel):
    provider: Optional[str] = None
    base_url: Optional[str] = None
    api_base: Optional[str] = None
    model: Optional[str] = None
    api_key: Optional[str] = None


@router.patch("/ai")
def update_ai_settings(data: AISettingsUpdate):
    cfg = _read_config()
    if data.provider is not None:
        cfg["provider"] = data.provider
    base_url = data.base_url if data.base_url is not None else data.api_base
    if base_url is not None:
        cfg["base_url"] = base_url
    if data.model is not None:
        cfg["model"] = data.model
    if data.api_key is not None:
        cfg["api_key"] = data.api_key
    _write_config(cfg)
    return {"ok": True}


class AIVerifyRequest(BaseModel):
    provider: Optional[str] = None
    base_url: Optional[str] = None
    api_base: Optional[str] = None
    model: Optional[str] = None
    api_key: Optional[str] = None


@router.get("/email")
def get_email_settings():
    cfg = _read_config()
    email_cfg = cfg.get("email", {})
    return {
        "smtp_host": email_cfg.get("smtp_host", ""),
        "smtp_port": email_cfg.get("smtp_port", 465),
        "smtp_user": email_cfg.get("smtp_user", ""),
        "smtp_password_masked": _mask_key(email_cfg.get("smtp_password", "")),
        "from_name": email_cfg.get("from_name", ""),
        "use_ssl": email_cfg.get("use_ssl", True),
        "interview_invite_template": email_cfg.get("interview_invite_template", ""),
        "rejection_template": email_cfg.get("rejection_template", ""),
    }


class EmailSettingsUpdate(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    from_name: Optional[str] = None
    use_ssl: Optional[bool] = None
    interview_invite_template: Optional[str] = None
    rejection_template: Optional[str] = None


@router.patch("/email")
def update_email_settings(data: EmailSettingsUpdate):
    cfg = _read_config()
    email_cfg = cfg.get("email", {})
    if data.smtp_host is not None:
        email_cfg["smtp_host"] = data.smtp_host
    if data.smtp_port is not None:
        email_cfg["smtp_port"] = data.smtp_port
    if data.smtp_user is not None:
        email_cfg["smtp_user"] = data.smtp_user
    if data.smtp_password is not None:
        email_cfg["smtp_password"] = data.smtp_password
    if data.from_name is not None:
        email_cfg["from_name"] = data.from_name
    if data.use_ssl is not None:
        email_cfg["use_ssl"] = data.use_ssl
    if data.interview_invite_template is not None:
        email_cfg["interview_invite_template"] = data.interview_invite_template
    if data.rejection_template is not None:
        email_cfg["rejection_template"] = data.rejection_template
    cfg["email"] = email_cfg
    _write_config(cfg)
    return {"ok": True}


@router.post("/email/verify")
def verify_email_connection():
    cfg = _read_config()
    email_cfg = cfg.get("email", {})
    host = email_cfg.get("smtp_host", "")
    port = email_cfg.get("smtp_port", 465)
    user = email_cfg.get("smtp_user", "")
    password = email_cfg.get("smtp_password", "")
    use_ssl = email_cfg.get("use_ssl", True)
    if not host or not user or not password:
        raise HTTPException(status_code=400, detail="邮件配置不完整，请先填写 SMTP 主机、用户名和密码")
    try:
        if use_ssl:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(host, port, context=context, timeout=10) as server:
                server.login(user, password)
        else:
            with smtplib.SMTP(host, port, timeout=10) as server:
                server.starttls()
                server.login(user, password)
        return {"ok": True, "message": "邮件连接成功"}
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(status_code=400, detail="认证失败，请检查用户名和密码")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"连接失败：{str(e)}")


@router.post("/ai/verify")
def verify_ai_connection(data: Optional[AIVerifyRequest] = None):
    cfg = _read_config()
    body = data.model_dump(exclude_none=True) if data is not None else {}
    api_key = body.get("api_key", cfg.get("api_key", ""))
    base_url = body.get("base_url", body.get("api_base", cfg.get("base_url", "")))
    model = body.get("model", cfg.get("model", ""))
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
