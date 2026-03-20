from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict


class EventBase(BaseModel):
    application_id: int
    type: str
    occurred_at: datetime
    actor_type: str = "human"
    payload: Optional[Dict[str, Any]] = None
    body: Optional[str] = None


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    payload: Optional[Dict[str, Any]] = None
    body: Optional[str] = None
    version: Optional[int] = None


class EventRead(EventBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    version: int = 1
    actor_id: Optional[int] = None
    actor_display_name: Optional[str] = None
    actor_deleted: bool = False
    created_at: datetime
    updated_at: datetime
