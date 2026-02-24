from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


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
    years_exp = Column(Integer)
    skill_tags = Column(JSON, default=list)
    source = Column(String)
    notes = Column(Text)
    resume_path = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    job_links = relationship("CandidateJobLink", back_populates="candidate", cascade="all, delete-orphan")
    history = relationship("HistoryEntry", back_populates="candidate", cascade="all, delete-orphan")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    department = Column(String)
    jd = Column(Text)
    persona = Column(Text)
    status = Column(String, default="open")  # open / closed / paused
    hr_owner = Column(String)
    stages = Column(JSON, default=lambda: ["简历筛选", "电话初筛", "面试", "Offer", "已入职"])
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    candidate_links = relationship("CandidateJobLink", back_populates="job", cascade="all, delete-orphan")


class CandidateJobLink(Base):
    __tablename__ = "candidate_job_links"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    stage = Column(String)
    notes = Column(Text)
    outcome = Column(String)  # None / rejected / withdrawn
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="job_links")
    job = relationship("Job", back_populates="candidate_links")


class HistoryEntry(Base):
    __tablename__ = "history_entries"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True)
    event_type = Column(String)  # created / stage_change / outcome / note
    detail = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="history")
