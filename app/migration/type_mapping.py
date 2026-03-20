from __future__ import annotations

from app.models.enums import EventType

# ActivityRecord.type -> default EventType.value
# 复杂类型（如 interview / stage_change）在 backfill 中按字段进一步细分。
ACTIVITY_TYPE_TO_EVENT_TYPE: dict[str, str] = {
    "resume_review": EventType.SCREENING_PASSED.value,
    "interview": EventType.INTERVIEW_FEEDBACK.value,
    "phone_screen": EventType.INTERVIEW_FEEDBACK.value,
    "note": EventType.NOTE.value,
    "offer": EventType.OFFER_RECORDED.value,
    "stage_change": EventType.NOTE.value,
    "onboard": EventType.HIRE_CONFIRMED.value,
}

STAGE_TO_EVENT_TYPE: dict[str, str] = {
    "简历筛选": EventType.APPLICATION_CREATED.value,
    "面试": EventType.SCREENING_PASSED.value,
    "Offer沟通": EventType.ADVANCE_TO_OFFER.value,
    "背调": EventType.START_BACKGROUND_CHECK.value,
    "待入职": EventType.OFFER_RECORDED.value,
    "已入职": EventType.HIRE_CONFIRMED.value,
}
