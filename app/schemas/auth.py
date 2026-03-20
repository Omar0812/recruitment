from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    login_name: str
    password: str


class LoginRequest(BaseModel):
    login_name: str
    password: str


class ProfileUpdate(BaseModel):
    display_name: str
    avatar_path: Optional[str] = None


class PasswordChange(BaseModel):
    old_password: str
    new_password: str


class UserRead(BaseModel):
    id: int
    login_name: str
    display_name: Optional[str] = None
    avatar_path: Optional[str] = None
    is_admin: bool
    is_setup_complete: bool

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    token: str
    user: UserRead


class HasUsersResponse(BaseModel):
    has_users: bool


class CheckLoginNameResponse(BaseModel):
    valid: bool
    available: bool
    message: Optional[str] = None


class AdminCreateUserRequest(BaseModel):
    login_name: str
    password: str


class AdminResetPasswordRequest(BaseModel):
    new_password: str


class AdminToggleAdminRequest(BaseModel):
    is_admin: bool


class SettingsRead(BaseModel):
    settings: dict[str, str]
    version: int


class SettingsUpdate(BaseModel):
    settings: dict[str, str]
    version: int
