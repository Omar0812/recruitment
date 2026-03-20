"""认证接口：register / login / logout / me / profile / password / check-login-name / has-users"""
from __future__ import annotations

import re
import secrets
from datetime import timedelta

from app.utils.time import utc_now
from app.utils.crypto import hash_token

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.entry.deps import current_user
from app.models.system_setting import SystemSetting
from app.models.token import Token
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    CheckLoginNameResponse,
    HasUsersResponse,
    LoginRequest,
    PasswordChange,
    ProfileUpdate,
    RegisterRequest,
    UserRead,
)

router = APIRouter(prefix="/auth", tags=["auth"])

_LOGIN_NAME_RE = re.compile(r"^[A-Za-z0-9_]{3,20}$")
_TOKEN_LIFETIME_DAYS = 30


def _hash_password(password: str) -> str:
    import bcrypt
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(password: str, password_hash: str) -> bool:
    import bcrypt
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def _generate_token() -> str:
    return secrets.token_urlsafe(48)


def _create_token(db: Session, user_id: int) -> str:
    token_str = _generate_token()
    token = Token(
        user_id=user_id,
        token=hash_token(token_str),
        expires_at=utc_now() + timedelta(days=_TOKEN_LIFETIME_DAYS),
    )
    db.add(token)
    return token_str


@router.get("/has-users", response_model=HasUsersResponse)
def has_users(db: Session = Depends(get_db)):
    count = db.query(User).count()
    return HasUsersResponse(has_users=count > 0)


@router.get("/check-login-name/{name}", response_model=CheckLoginNameResponse)
def check_login_name(name: str, db: Session = Depends(get_db)):
    if not _LOGIN_NAME_RE.match(name):
        return CheckLoginNameResponse(valid=False, available=False, message="仅允许英文、数字、下划线，3-20位")
    existing = db.query(User).filter(User.login_name == name).first()
    if existing is not None:
        return CheckLoginNameResponse(valid=True, available=False, message="该登录账号已被使用")
    return CheckLoginNameResponse(valid=True, available=True)


@router.post("/register", response_model=AuthResponse)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    # 检查注册是否开放
    has_any_user = db.query(User).count() > 0
    if has_any_user:
        reg_setting = db.query(SystemSetting).filter(SystemSetting.key == "registration_open").first()
        if reg_setting and reg_setting.value != "true":
            raise HTTPException(403, "注册已关闭")

    # 校验 login_name
    if not _LOGIN_NAME_RE.match(body.login_name):
        raise HTTPException(422, "登录账号仅允许英文、数字、下划线，3-20位")
    if len(body.password) < 6:
        raise HTTPException(422, "密码至少6位")

    # 检查重复（含已删除）
    existing = db.query(User).filter(User.login_name == body.login_name).first()
    if existing is not None:
        raise HTTPException(422, "该登录账号已被使用")

    # 首个用户自动 admin
    is_first = not has_any_user

    user = User(
        login_name=body.login_name,
        password_hash=_hash_password(body.password),
        is_admin=is_first,
        is_setup_complete=False,
    )
    db.add(user)
    db.flush()

    token_str = _create_token(db, user.id)
    db.commit()
    db.refresh(user)

    return AuthResponse(token=token_str, user=UserRead.model_validate(user))


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.login_name == body.login_name).first()
    if user is None or user.deleted_at is not None:
        raise HTTPException(401, "登录账号或密码错误")
    if not _verify_password(body.password, user.password_hash):
        raise HTTPException(401, "登录账号或密码错误")

    token_str = _create_token(db, user.id)
    db.commit()

    return AuthResponse(token=token_str, user=UserRead.model_validate(user))


@router.post("/logout", status_code=204)
def logout(
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    token_str = getattr(request.state, "token_str", None)
    if token_str:
        db.query(Token).filter(Token.token == hash_token(token_str)).delete()
        db.commit()


@router.get("/me", response_model=UserRead)
def get_me(user: User = Depends(current_user)):
    return UserRead.model_validate(user)


@router.put("/me/profile", response_model=UserRead)
def update_profile(
    body: ProfileUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if not body.display_name or not body.display_name.strip():
        raise HTTPException(422, "名字不能为空")
    user.display_name = body.display_name.strip()
    if body.avatar_path is not None:
        user.avatar_path = body.avatar_path
    user.is_setup_complete = True
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)


@router.put("/me/password")
def change_password(
    body: PasswordChange,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if not _verify_password(body.old_password, user.password_hash):
        raise HTTPException(422, "旧密码错误")
    if len(body.new_password) < 6:
        raise HTTPException(422, "新密码至少6位")
    user.password_hash = _hash_password(body.new_password)
    db.commit()
    return {"ok": True}
