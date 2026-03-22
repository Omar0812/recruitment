"""用户管理 + 系统设置（仅 admin）"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.entry.deps import require_admin
from app.models.system_setting import SystemSetting
from app.models.token import Token
from app.models.user import User
from app.schemas.auth import (
    AdminCreateUserRequest,
    AdminResetPasswordRequest,
    AdminToggleAdminRequest,
    SettingsRead,
    SettingsUpdate,
    UserRead,
)

router = APIRouter(prefix="/admin", tags=["admin"])


def _hash_password(password: str) -> str:
    import bcrypt
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


# ── 用户管理 ──

@router.get("/users", response_model=list[UserRead])
def list_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    users = db.query(User).filter(User.deleted_at.is_(None)).order_by(User.id).all()
    return [UserRead.model_validate(u) for u in users]


@router.post("/users", response_model=UserRead, status_code=201)
def create_user(
    body: AdminCreateUserRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    import re
    if not re.match(r"^[A-Za-z0-9_]{3,20}$", body.login_name):
        raise HTTPException(422, "登录账号仅允许英文、数字、下划线，3-20位")
    if len(body.password) < 6:
        raise HTTPException(422, "密码至少6位")

    existing = db.query(User).filter(User.login_name == body.login_name).first()
    if existing is not None:
        raise HTTPException(422, "该登录账号已被使用")

    user = User(
        login_name=body.login_name,
        password_hash=_hash_password(body.password),
        is_admin=False,
        is_setup_complete=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(422, "不能删除自己")

    user = db.get(User, user_id)
    if user is None or user.deleted_at is not None:
        raise HTTPException(404, "用户不存在")

    from datetime import datetime, timezone
    user.deleted_at = datetime.now(timezone.utc)
    # 立即失效所有 token
    db.query(Token).filter(Token.user_id == user_id).delete()
    db.commit()


@router.put("/users/{user_id}/password")
def reset_password(
    user_id: int,
    body: AdminResetPasswordRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if len(body.new_password) < 6:
        raise HTTPException(422, "密码至少6位")

    user = db.get(User, user_id)
    if user is None or user.deleted_at is not None:
        raise HTTPException(404, "用户不存在")

    user.password_hash = _hash_password(body.new_password)
    db.commit()
    return {"ok": True}


@router.put("/users/{user_id}/admin")
def toggle_admin(
    user_id: int,
    body: AdminToggleAdminRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if user_id == admin.id and not body.is_admin:
        raise HTTPException(422, "不能取消自己的管理员权限")

    user = db.get(User, user_id)
    if user is None or user.deleted_at is not None:
        raise HTTPException(404, "用户不存在")

    if not body.is_admin:
        # 检查是否是最后一个 admin
        admin_count = db.query(User).filter(
            User.is_admin.is_(True),
            User.deleted_at.is_(None),
        ).count()
        if admin_count <= 1:
            raise HTTPException(422, "系统至少需要一个管理员")

    user.is_admin = body.is_admin
    db.commit()
    return {"ok": True}


# ── 系统设置 ──

@router.get("/settings", response_model=SettingsRead)
def get_settings(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    from app.utils.encryption import decrypt_value, is_encrypted

    rows = db.query(SystemSetting).all()
    settings = {}
    max_version = 1
    for row in rows:
        value = row.value or ""
        # API Key 先解密再脱敏
        if row.key == "ai_api_key" and value:
            if is_encrypted(value):
                try:
                    value = decrypt_value(value)
                except Exception:
                    import logging
                    logging.getLogger(__name__).warning("API Key 解密失败，返回脱敏原始值")
            if len(value) > 6:
                value = value[:6] + "****"
        settings[row.key] = value
        if row.version > max_version:
            max_version = row.version
    return SettingsRead(settings=settings, version=max_version)


@router.put("/settings")
def update_settings(
    body: SettingsUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    from app.utils.encryption import encrypt_value

    # 乐观锁：检查所有 setting 的 max version
    rows = db.query(SystemSetting).all()
    max_version = max((r.version for r in rows), default=1)
    if body.version != max_version:
        raise HTTPException(409, {"code": "VERSION_CONFLICT", "message": "该记录刚被修改过，请刷新"})

    row_map = {r.key: r for r in rows}
    for key, value in body.settings.items():
        save_value = value
        if key == "ai_api_key" and value:
            save_value = encrypt_value(value)
        if key in row_map:
            row_map[key].value = save_value
            row_map[key].version = max_version + 1
        else:
            db.add(SystemSetting(key=key, value=save_value, version=max_version + 1))

    db.commit()

    # 清除 ai_client 缓存
    from app.ai_client import clear_config_cache
    clear_config_cache()

    return {"ok": True, "version": max_version + 1}


# ── AI 测试连接 ──

@router.post("/ai/test-connection")
async def ai_test_connection(
    admin: User = Depends(require_admin),
):
    from app.ai_client import test_connection
    return await test_connection()
