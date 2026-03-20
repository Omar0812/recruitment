from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String)
    email = Column(String)
    age = Column(Integer)
    education = Column(String)
    school = Column(String)
    city = Column(String)
    last_company = Column(String)
    last_title = Column(String)
    years_exp = Column(Float)
    name_en = Column(String)
    education_list = Column(JSON, default=list)
    work_experience = Column(JSON, default=list)
    project_experience = Column(JSON, default=list)
    skill_tags = Column(JSON, default=list)
    source = Column(String)
    referred_by = Column(String, nullable=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    notes = Column(Text)
    blacklisted = Column(Boolean, default=False, nullable=False)
    blacklist_reason = Column(String, nullable=True)
    blacklist_note = Column(Text, nullable=True)
    resume_path = Column(String)
    attachments = Column(JSON, default=list)
    followup_status = Column(String)
    created_at = Column(DateTime(timezone=True), default=_utc_now)
    updated_at = Column(DateTime(timezone=True), default=_utc_now, onupdate=_utc_now)
    merged_into = Column(Integer, nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    starred = Column(Integer, default=0)
    created_by = Column(Integer, nullable=True)
    version = Column(Integer, nullable=False, default=1)

    supplier = relationship("Supplier", back_populates="candidates")


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String)
    contact_name = Column(String)
    phone = Column(String)
    email = Column(String)
    notes = Column(Text)
    owner = Column(String, nullable=True)
    guarantee_days = Column(Integer, nullable=True)
    fee_guarantee_days = Column(Integer, nullable=True)
    guarantee_months = Column(Integer, nullable=True)
    contract_start = Column(String, nullable=True)
    contract_end = Column(String, nullable=True)
    contract_terms = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utc_now)
    updated_at = Column(DateTime(timezone=True), default=_utc_now, onupdate=_utc_now)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    version = Column(Integer, nullable=False, default=1)

    candidates = relationship("Candidate", back_populates="supplier")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    department = Column(String)
    jd = Column(Text)
    persona = Column(Text)
    status = Column(String, default="open")
    hr_owner = Column(String)
    city = Column(String)
    location_name = Column(String)
    location_address = Column(String)
    job_category = Column(String)
    employment_type = Column(String)
    priority = Column(String)
    headcount = Column(Integer, default=1, nullable=False)
    target_onboard_date = Column(Date, nullable=True)
    notes = Column(Text)
    close_reason = Column(String)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utc_now)
    updated_at = Column(DateTime(timezone=True), default=_utc_now, onupdate=_utc_now)
    version = Column(Integer, nullable=False, default=1)
