from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_type: str
    action_code: str
    target_type: str
    target_id: int
    details: Optional[Dict[str, Any]] = None
    created_at: datetime
