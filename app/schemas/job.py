from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.base import AppBaseModel


class JobBase(BaseModel):
    title: str
    department: Optional[str] = None
    location_name: Optional[str] = None
    location_address: Optional[str] = None
    headcount: int = 1
    jd: Optional[str] = None
    priority: Optional[Literal["high", "medium", "low"]] = None
    target_onboard_date: Optional[date] = None
    notes: Optional[str] = None
    status: str = "open"
    close_reason: Optional[str] = None
    closed_at: Optional[datetime] = None


class JobCreate(JobBase):
    title: str = Field(min_length=1)
    department: str = Field(min_length=1)
    location_name: str = Field(min_length=1)
    location_address: Optional[str] = None
    headcount: int = Field(default=1, ge=1)
    jd: str = Field(min_length=1)
    priority: Literal["high", "medium", "low"] = "medium"
    status: str = "open"


class JobUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    location_name: Optional[str] = None
    location_address: Optional[str] = None
    headcount: Optional[int] = Field(default=None, ge=1)
    jd: Optional[str] = None
    priority: Optional[Literal["high", "medium", "low"]] = None
    target_onboard_date: Optional[date] = None
    notes: Optional[str] = None
    version: Optional[int] = None


class JobCloseRequest(BaseModel):
    reason: str = Field(min_length=1)
    version: Optional[int] = None


class JobRead(JobBase, AppBaseModel):
    id: int
    version: int = 1
    hired_count: int = 0
    stage_distribution: dict[str, int] = {}
    created_at: datetime
    updated_at: datetime
