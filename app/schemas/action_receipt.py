from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ActionReceiptRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    command_id: str
    action_code: str
    target_type: str
    target_id: int
    ok: bool
    state_before: Optional[str] = None
    state_after: Optional[str] = None
    stage_before: Optional[str] = None
    stage_after: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
