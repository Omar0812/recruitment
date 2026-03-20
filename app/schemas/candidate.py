from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class EducationEntry(BaseModel):
    school: Optional[str] = None
    degree: Optional[str] = None
    major: Optional[str] = None
    start: Optional[str] = None
    end: Optional[str] = None


class WorkExperienceEntry(BaseModel):
    company: Optional[str] = None
    title: Optional[str] = None
    start: Optional[str] = None
    end: Optional[str] = None
    description: Optional[str] = None


class ProjectExperienceEntry(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    start: Optional[str] = None
    end: Optional[str] = None
    description: Optional[str] = None


class CandidateBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    source: Optional[str] = None
    name_en: Optional[str] = None
    age: Optional[int] = None
    education: Optional[str] = None
    school: Optional[str] = None
    last_company: Optional[str] = None
    last_title: Optional[str] = None
    years_exp: Optional[float] = None
    skill_tags: list[str] = Field(default_factory=list)
    education_list: list[EducationEntry] = Field(default_factory=list)
    work_experience: list[WorkExperienceEntry] = Field(default_factory=list)
    project_experience: list[ProjectExperienceEntry] = Field(default_factory=list)
    notes: Optional[str] = None
    blacklisted: bool = False
    blacklist_reason: Optional[str] = None
    blacklist_note: Optional[str] = None
    resume_path: Optional[str] = None
    attachments: list[dict] = Field(default_factory=list)
    starred: int = 0
    supplier_id: Optional[int] = None
    referred_by: Optional[str] = None
    merged_into: Optional[int] = None

    @field_validator(
        "skill_tags",
        "education_list",
        "work_experience",
        "project_experience",
        "attachments",
        mode="before",
    )
    @classmethod
    def _normalize_list_fields(cls, value):
        return [] if value is None else value


class CandidateCreate(CandidateBase):
    version: Optional[int] = None


class CandidateRead(CandidateBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    version: int = 1
    created_by: Optional[int] = None
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class LatestApplication(BaseModel):
    job_title: str
    state: str
    stage: Optional[str] = None
    outcome: Optional[str] = None
    status_changed_at: Optional[datetime] = None


class CandidateWithApplication(CandidateRead):
    latest_application: Optional[LatestApplication] = None


class CandidateDuplicateCheckRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class CandidateDuplicateActiveLink(BaseModel):
    application_id: int
    job_id: int
    job_title: str
    stage: str


class CandidateDuplicateLastApplication(BaseModel):
    job_title: str
    outcome: Optional[str] = None
    stage: Optional[str] = None
    ended_at: Optional[datetime] = None


class CandidateDuplicateMatch(BaseModel):
    candidate_id: int
    display_id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    last_company: Optional[str] = None
    last_title: Optional[str] = None
    match_reasons: list[str] = Field(default_factory=list)
    match_level: str
    is_blacklisted: bool
    blacklist_reason: Optional[str] = None
    last_application: Optional[CandidateDuplicateLastApplication] = None
    active_link: Optional[CandidateDuplicateActiveLink] = None


class CandidateDuplicateCheckResponse(BaseModel):
    matches: list[CandidateDuplicateMatch] = Field(default_factory=list)
    requires_decision: bool = False
    has_blocking_in_progress_match: bool = False
    duplicates: list[CandidateRead] = Field(default_factory=list)
