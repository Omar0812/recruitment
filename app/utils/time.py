from __future__ import annotations

from datetime import datetime, timedelta, timezone


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
