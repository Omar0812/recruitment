"""认证依赖：current_user / require_admin"""
from __future__ import annotations

from datetime import timedelta, timezone

from app.utils.time import utc_now
from app.utils.crypto import hash_token
from typing import Annotated

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.token import Token
from app.models.user import User

_bearer = HTTPBearer(auto_error=False)

TOKEN_LIFETIME_DAYS = 30
TOKEN_RENEW_THRESHOLD_DAYS = 15


def _get_token_str(request: Request) -> str | None:
    auth = request.headers.get("authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth[7:]
    return None


def current_user(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(401, "未登录")

    token_record = (
        db.query(Token)
        .filter(Token.token == hash_token(creds.credentials))
        .first()
    )
    if token_record is None:
        raise HTTPException(401, "Token 无效")

    now = utc_now()
    expires = token_record.expires_at
    # SQLite 不保留时区信息，读回来可能是 naive，补上 UTC
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < now:
        db.delete(token_record)
        db.commit()
        raise HTTPException(401, "Token 已过期")

    user = db.get(User, token_record.user_id)
    if user is None or user.deleted_at is not None:
        db.delete(token_record)
        db.commit()
        raise HTTPException(401, "用户不存在")

    # 自动续期：剩余不足 15 天时续到 +30 天
    remaining = expires - now
    if remaining < timedelta(days=TOKEN_RENEW_THRESHOLD_DAYS):
        token_record.expires_at = now + timedelta(days=TOKEN_LIFETIME_DAYS)
        db.commit()

    # 把 token 字符串挂到 request.state 上，logout 时用
    request.state.token_str = creds.credentials

    return user


def require_admin(user: User = Depends(current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(403, "需要管理员权限")
    return user
