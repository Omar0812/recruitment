from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, computed_field, model_validator


class CandidateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: Optional[str] = None
    name_en: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    age: Optional[int] = None
    education: Optional[str] = None
    school: Optional[str] = None
    city: Optional[str] = None
    last_company: Optional[str] = None
    last_title: Optional[str] = None
    years_exp: Optional[float] = None
    skill_tags: list = []
    source: Optional[str] = None
    referred_by: Optional[str] = None
    supplier_id: Optional[int] = None
    notes: Optional[str] = None
    resume_path: Optional[str] = None
    followup_status: Optional[str] = None
    starred: bool = False
    blacklisted: bool = False
    blacklist_reason: Optional[str] = None
    blacklist_note: Optional[str] = None
    education_list: list = []
    work_experience: list = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Supplier denormalized fields (populated via model_validator below)
    supplier_name: Optional[str] = None

    @computed_field
    @property
    def display_id(self) -> str:
        return f"C{self.id:03d}"

    @computed_field
    @property
    def display_name(self) -> str:
        main_name = self.name or self.name_en or ""
        did = self.display_id
        return f"{main_name} @{did}" if main_name else f"@{did}"

    @model_validator(mode="before")
    @classmethod
    def extract_supplier_fields(cls, data: Any) -> Any:
        # Works for both ORM objects and dicts
        if hasattr(data, "__dict__"):
            supplier = getattr(data, "supplier", None)
            if supplier is not None:
                data.__dict__.setdefault("supplier_name", supplier.name)
            # Normalize bool fields stored as int
            if "starred" in data.__dict__:
                data.__dict__["starred"] = bool(data.__dict__["starred"])
            if "blacklisted" in data.__dict__:
                data.__dict__["blacklisted"] = bool(data.__dict__["blacklisted"])
            # Normalize list fields
            if data.__dict__.get("skill_tags") is None:
                data.__dict__["skill_tags"] = []
            if data.__dict__.get("education_list") is None:
                data.__dict__["education_list"] = []
            if data.__dict__.get("work_experience") is None:
                data.__dict__["work_experience"] = []
        return data


class LinkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    candidate_id: int
    job_id: int
    stage: Optional[str] = None
    state: Optional[str] = None
    notes: Optional[str] = None
    outcome: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Denormalized from candidate relationship
    candidate_name: Optional[str] = None
    blacklisted: bool = False
    days_since_update: Optional[int] = None

    @model_validator(mode="before")
    @classmethod
    def extract_candidate_fields(cls, data: Any) -> Any:
        if hasattr(data, "__dict__"):
            candidate = getattr(data, "candidate", None)
            if candidate is not None:
                data.__dict__.setdefault("candidate_name", candidate.name)
                data.__dict__.setdefault("blacklisted", bool(candidate.blacklisted))
            updated_at = data.__dict__.get("updated_at")
            if updated_at is not None:
                data.__dict__.setdefault(
                    "days_since_update",
                    (datetime.utcnow() - updated_at).days
                )
        return data


class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    link_id: int
    type: str
    stage: Optional[str] = None
    created_at: Optional[datetime] = None
    actor: Optional[str] = None

    # payload-priority fields
    comment: Optional[str] = None
    conclusion: Optional[str] = None
    rejection_reason: Optional[str] = None
    round: Optional[str] = None
    interview_time: Optional[str] = None
    scheduled_at: Optional[Any] = None
    location: Optional[str] = None
    status: Optional[str] = None
    score: Optional[int] = None
    salary: Optional[str] = None
    start_date: Optional[str] = None
    from_stage: Optional[str] = None
    to_stage: Optional[str] = None

    # offer compensation (payload only)
    monthly_salary: Optional[int] = None
    salary_months: Optional[int] = None
    other_cash: Optional[str] = None

    # background_check (payload only)
    notes: Optional[str] = None

    # raw payload always included
    payload: Optional[dict] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_payload_priority(cls, data: Any) -> Any:
        """Payload fields take priority over sparse columns."""
        if hasattr(data, "__dict__"):
            d = data.__dict__
            p = d.get("payload") or {}

            def _pick(field: str, default=None):
                return p[field] if field in p else d.get(field, default)

            d["comment"] = _pick("comment")
            d["conclusion"] = _pick("conclusion")
            d["round"] = _pick("round")
            d["scheduled_at"] = _pick("scheduled_at")
            d["location"] = _pick("location")
            d["status"] = _pick("status")
            d["score"] = _pick("score")
            d["salary"] = _pick("salary")
            d["start_date"] = _pick("start_date")
            d["monthly_salary"] = p.get("monthly_salary")
            d["salary_months"] = p.get("salary_months")
            d["other_cash"] = p.get("other_cash")
            d["notes"] = p.get("notes")
        return data


class SupplierOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    fee_guarantee_days: Optional[int] = None
    created_at: Optional[datetime] = None
