from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ApplicationBase(BaseModel):
    candidate_id: int
    job_id: int
    state: str = "IN_PROGRESS"
    outcome: Optional[str] = None
    stage: Optional[str] = None


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationRead(ApplicationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    candidate_name: Optional[str] = None
