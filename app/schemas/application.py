from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.base import AppBaseModel


class ApplicationBase(BaseModel):
    candidate_id: int
    job_id: int
    state: str = "IN_PROGRESS"
    outcome: Optional[str] = None
    stage: Optional[str] = None


class ApplicationRead(ApplicationBase, AppBaseModel):

    id: int
    created_at: datetime
    updated_at: datetime
    candidate_name: Optional[str] = None
    job_title: Optional[str] = None


class EventSummaryItem(BaseModel):
    stage_detail: str
    next_interview_at: Optional[str] = None
    has_pending_feedback: bool
