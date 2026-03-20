from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampMixin
from app.models.enums import ActorType, EventType
from app.database import Base


class Event(TimestampMixin, Base):
    __tablename__ = "events"

    application_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("applications.id"), nullable=False
    )
    type: Mapped[str] = mapped_column(String, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    actor_type: Mapped[str] = mapped_column(
        String, nullable=False, default=ActorType.HUMAN.value
    )
    actor_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    payload: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    # Relationships
    application = relationship("Application", back_populates="events")

    __table_args__ = (
        Index("ix_events_app_occurred", "application_id", occurred_at.desc()),
        Index("ix_events_type_occurred", "type", occurred_at.desc()),
    )
