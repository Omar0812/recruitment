from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, field_serializer


class AppBaseModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    @field_serializer('*')
    @classmethod
    def serialize_datetime(cls, v):
        if isinstance(v, datetime):
            if v.tzinfo is None:
                v = v.replace(tzinfo=timezone.utc)
            return v.isoformat().replace("+00:00", "Z")
        return v
