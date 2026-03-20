from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampMixin
from app.models.enums import ApplicationState, Outcome
from app.database import Base


class Application(TimestampMixin, Base):
    __tablename__ = "applications"

    candidate_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("candidates.id"), nullable=False
    )
    job_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("jobs.id"), nullable=False
    )
    state: Mapped[str] = mapped_column(
        String, nullable=False, default=ApplicationState.IN_PROGRESS.value
    )
    outcome: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    stage: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    # Relationships
    candidate = relationship("Candidate", backref="applications")
    job = relationship("Job", backref="applications")
    events = relationship(
        "Event", back_populates="application", cascade="all, delete-orphan",
        order_by="Event.occurred_at"
    )

    __table_args__ = (
        CheckConstraint(
            "state IN ('IN_PROGRESS', 'HIRED', 'REJECTED', 'WITHDRAWN', 'LEFT')",
            name="ck_applications_state",
        ),
        Index(
            "ix_applications_unique_active",
            "candidate_id",
            unique=True,
            sqlite_where=(state == ApplicationState.IN_PROGRESS.value),
        ),
    )
