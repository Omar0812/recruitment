from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Float, Boolean, Date, func
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
    years_exp = Column(Float)
    name_en = Column(String)
    education_list = Column(JSON, default=list)   # [{degree, school, major, period}]
    work_experience = Column(JSON, default=list)  # [{company, title, period}]
    skill_tags = Column(JSON, default=list)
    source = Column(String)
    referred_by = Column(String, nullable=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    notes = Column(Text)
    blacklisted = Column(Boolean, default=False, nullable=False)
    blacklist_reason = Column(String, nullable=True)
    blacklist_note = Column(Text, nullable=True)
    resume_path = Column(String)
    followup_status = Column(String)   # 待跟进 / 已联系 / 暂不考虑
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    merged_into = Column(Integer, nullable=True)
    deleted_at = Column(DateTime, nullable=True)
    starred = Column(Integer, default=0)  # 0/1 boolean

    job_links = relationship("CandidateJobLink", back_populates="candidate", cascade="all, delete-orphan")
    history = relationship("HistoryEntry", back_populates="candidate", cascade="all, delete-orphan")
    supplier = relationship("Supplier", back_populates="candidates")


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String)              # 猎头 / 招聘平台 / 内推 / 其他
    contact_name = Column(String)
    phone = Column(String)
    email = Column(String)
    notes = Column(Text)
    fee_rate = Column(Text, nullable=True)
    fee_guarantee_days = Column(Integer, nullable=True)
    payment_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    candidates = relationship("Candidate", back_populates="supplier")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    department = Column(String)
    jd = Column(Text)
    persona = Column(Text)
    status = Column(String, default="open")  # open / closed / paused
    hr_owner = Column(String)
    city = Column(String)              # base 城市
    job_category = Column(String)      # 研发 / 销售 / 市场 / 职能
    employment_type = Column(String)   # 全职 / 实习 / 顾问
    priority = Column(String)          # 高 / 中 / 低
    headcount = Column(Integer, default=1, nullable=False)
    target_onboard_date = Column(Date, nullable=True)
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
    state = Column(String)  # IN_PROGRESS / HIRED / REJECTED / WITHDRAWN

    candidate = relationship("Candidate", back_populates="job_links")
    job = relationship("Job", back_populates="candidate_links")
    activity_records = relationship("ActivityRecord", back_populates="link", cascade="all, delete-orphan")


class HistoryEntry(Base):
    __tablename__ = "history_entries"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True)
    event_type = Column(String)  # created / stage_change / outcome / note
    detail = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="history")


class ActivityRecord(Base):
    __tablename__ = "activity_records"

    id = Column(Integer, primary_key=True, index=True)
    link_id = Column(Integer, ForeignKey("candidate_job_links.id"), nullable=False)
    type = Column(String, nullable=False)   # resume_review / interview / phone_screen / note / offer / stage_change(retired)
    stage = Column(String, nullable=True)   # 创建时所在阶段；resume_review 自动填 "简历筛选"
    created_at = Column(DateTime, default=datetime.utcnow)

    # 公共字段
    actor = Column(String, nullable=True)
    comment = Column(Text, nullable=True)
    conclusion = Column(String, nullable=True)   # 通过 / 待定 / 淘汰
    rejection_reason = Column(String, nullable=True)

    # interview 专有
    round = Column(String, nullable=True)
    interview_time = Column(String, nullable=True)
    scheduled_at = Column(DateTime, nullable=True)
    location = Column(String, nullable=True)
    status = Column(String, nullable=True)   # scheduled / completed / cancelled
    score = Column(Integer, nullable=True)

    # offer 专有
    salary = Column(String, nullable=True)
    start_date = Column(String, nullable=True)

    # stage_change 专有
    from_stage = Column(String, nullable=True)
    to_stage = Column(String, nullable=True)

    # memory layer 预留
    embedding_text = Column(Text, nullable=True)

    # payload (type-specific data, replaces sparse columns over time)
    payload = Column(JSON, nullable=True)

    link = relationship("CandidateJobLink", back_populates="activity_records")
