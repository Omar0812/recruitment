from __future__ import annotations

from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


ActionTargetType = Literal["application", "candidate", "job", "supplier", "term", "expense"]


class ActionTarget(BaseModel):
    type: ActionTargetType
    id: int


class ActionRequest(BaseModel):
    command_id: UUID
    action_code: str
    target: ActionTarget
    payload: dict[str, Any] = Field(default_factory=dict)


class ActionExecuteResponse(BaseModel):
    ok: bool
    command_id: str
    action_code: str
    target_type: str
    target_id: int
    event_ids: list[int] = Field(default_factory=list)
    state_before: Optional[str] = None
    state_after: Optional[str] = None
    stage_before: Optional[str] = None
    stage_after: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    message: Optional[str] = None


class ActionCatalogItem(BaseModel):
    action_code: str
    target_type: str
