from typing import Optional

from pydantic import BaseModel, ConfigDict


class TermBase(BaseModel):
    type: str
    name: str
    sort_order: int = 0
    address: Optional[str] = None


class TermCreate(TermBase):
    pass


class TermUpdate(BaseModel):
    name: str
    address: Optional[str] = None
    version: Optional[int] = None


class TermRead(TermBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    version: int = 1
