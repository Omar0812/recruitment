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
    name_en = Column(String)
    education_list = Column(JSON, default=list)   # [{degree, school, major, period}]
    work_experience = Column(JSON, default=list)  # [{company, title, period}]
    skill_tags = Column(JSON, default=list)
    source = Column(String)
    notes = Column(Text)
    resume_path = Column(String)
    followup_status = Column(String)   # 待跟进 / 已联系 / 暂不考虑
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
    city = Column(String)              # base 城市
    job_category = Column(String)      # 研发 / 销售 / 市场 / 职能
    employment_type = Column(String)   # 全职 / 实习 / 顾问
    priority = Column(String)          # 高 / 中 / 低
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

    rejection_reason = Column(String)  # 能力不足 / 薪资不匹配 / 主动放弃 / 其他

    candidate = relationship("Candidate", back_populates="job_links")
    job = relationship("Job", back_populates="candidate_links")
    interview_records = relationship("InterviewRecord", back_populates="link", cascade="all, delete-orphan")


class HistoryEntry(Base):
    __tablename__ = "history_entries"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True)
    event_type = Column(String)  # created / stage_change / outcome / note
    detail = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="history")


class InterviewRecord(Base):
    __tablename__ = "interview_records"

    id = Column(Integer, primary_key=True, index=True)
    link_id = Column(Integer, ForeignKey("candidate_job_links.id"), nullable=False)
    round = Column(String)        # 一面 / 二面 / 终面 等
    interviewer = Column(String)
    interview_time = Column(String)
    score = Column(Integer)       # 1-5
    comment = Column(Text)
    conclusion = Column(String)   # 通过 / 待定 / 淘汰
    created_at = Column(DateTime, default=datetime.utcnow)

    link = relationship("CandidateJobLink", back_populates="interview_records")
