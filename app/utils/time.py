from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any


BIZ_TZ = timezone(timedelta(hours=8))


def utc_now() -> datetime:
    """返回当前 UTC aware datetime，统一替代 deprecated datetime.utcnow()。"""
    return datetime.now(timezone.utc)


def ensure_utc_aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def to_utc_z(dt: datetime | None) -> str | None:
    aware = ensure_utc_aware(dt)
    if aware is None:
        return None
    return aware.isoformat().replace("+00:00", "Z")


def parse_iso_datetime(value: str | None) -> datetime | None:
    if value is None:
        return None
    text = value.strip()
    if not text:
        return None
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    return ensure_utc_aware(parsed)


def to_utc_z_if_datetime_or_iso(value: Any) -> Any:
    if isinstance(value, datetime):
        return to_utc_z(value)
    if isinstance(value, str):
        parsed = parse_iso_datetime(value)
        if parsed is not None:
            return to_utc_z(parsed)
    return value


def _is_timestamp_key(key: Any) -> bool:
    if not isinstance(key, str):
        return False
    key_lower = key.lower()
    return key_lower.endswith("_at") or key_lower in {"timestamp"}


def serialize_timestamp_fields(value: Any, key: str | None = None) -> Any:
    """
    Recursively normalizes timestamp-like fields into UTC ISO-8601 with `Z`.
    Non timestamp fields are preserved as-is.
    """
    if isinstance(value, dict):
        normalized: dict[str, Any] = {}
        for k, v in value.items():
            child = serialize_timestamp_fields(v, str(k))
            if _is_timestamp_key(k):
                child = to_utc_z_if_datetime_or_iso(child)
            normalized[str(k)] = child
        return normalized
    if isinstance(value, list):
        return [serialize_timestamp_fields(v, key) for v in value]
    if key and _is_timestamp_key(key):
        return to_utc_z_if_datetime_or_iso(value)
    if isinstance(value, datetime):
        return to_utc_z(value)
    return value


def biz_day_bounds_utc(
    reference_utc: datetime | None = None,
) -> tuple[datetime, datetime, datetime, datetime]:
    """
    Returns:
      now_utc, biz_today_start_utc, biz_tomorrow_start_utc,
      biz_day_after_tomorrow_start_utc
    """
    now_utc = reference_utc or utc_now()
    now_biz = ensure_utc_aware(now_utc).astimezone(BIZ_TZ)
    today_biz = now_biz.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_biz = today_biz + timedelta(days=1)
    day_after_tomorrow_biz = today_biz + timedelta(days=2)
    return (
        now_utc,
        today_biz.astimezone(timezone.utc),
        tomorrow_biz.astimezone(timezone.utc),
        day_after_tomorrow_biz.astimezone(timezone.utc),
    )


def biz_week_start_utc(reference_utc: datetime | None = None) -> datetime:
    now_utc = reference_utc or utc_now()
    now_biz = ensure_utc_aware(now_utc).astimezone(BIZ_TZ)
    week_start_biz = (now_biz - timedelta(days=now_biz.weekday())).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )
    return week_start_biz.astimezone(timezone.utc)
