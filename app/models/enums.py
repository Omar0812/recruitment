from __future__ import annotations

import enum


class ApplicationState(str, enum.Enum):
    IN_PROGRESS = "IN_PROGRESS"
    HIRED = "HIRED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"
    LEFT = "LEFT"


class Outcome(str, enum.Enum):
    HIRED = "hired"
    LEFT = "left"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class EventType(str, enum.Enum):
    # Stage 推进类（7）
    APPLICATION_CREATED = "application_created"
    SCREENING_ASSIGNED = "screening_assigned"
    SCREENING_PASSED = "screening_passed"
    ADVANCE_TO_OFFER = "advance_to_offer"
    START_BACKGROUND_CHECK = "start_background_check"
    OFFER_RECORDED = "offer_recorded"
    HIRE_CONFIRMED = "hire_confirmed"
    # 阶段内记录类（3）
    INTERVIEW_SCHEDULED = "interview_scheduled"
    INTERVIEW_FEEDBACK = "interview_feedback"
    BACKGROUND_CHECK_RESULT = "background_check_result"
    # 生命周期类（2）
    APPLICATION_ENDED = "application_ended"
    LEFT_RECORDED = "left_recorded"
    # 自由记录类（1）
    NOTE = "note"


class ActorType(str, enum.Enum):
    HUMAN = "human"


class TermType(str, enum.Enum):
    DEPARTMENT = "department"
    LOCATION = "location"
    PLATFORM = "platform"
    OTHER = "other"
