"""Tests for GET /suppliers/{id}/headhunter-fees endpoint."""
import uuid
from datetime import datetime, timezone

import pytest


def _uid():
    return str(uuid.uuid4())


def _dt(year: int, month: int, day: int) -> datetime:
    return datetime(year, month, day, tzinfo=timezone.utc)


def _setup_supplier_with_hired(db, *, headhunter_fee=None, has_offer=True, has_hire=True):
    """创建一个猎头 + 关联的已入职候选人。"""
    from app.models.application import Application
    from app.models.enums import ActorType, ApplicationState, EventType
    from app.models.event import Event
    from app.models.legacy import Candidate, Job, Supplier

    supplier = Supplier(name=f"猎头{_uid()[:4]}")
    db.add(supplier)
    db.flush()

    candidate = Candidate(name="张三", supplier_id=supplier.id)
    job = Job(title="工程师")
    db.add_all([candidate, job])
    db.flush()

    application = Application(
        candidate_id=candidate.id,
        job_id=job.id,
        state=ApplicationState.HIRED.value,
        stage="已入职",
    )
    db.add(application)
    db.flush()

    if has_offer:
        payload = {}
        if headhunter_fee is not None:
            payload["headhunter_fee"] = headhunter_fee
        db.add(
            Event(
                application_id=application.id,
                type=EventType.OFFER_RECORDED.value,
                occurred_at=_dt(2026, 3, 1),
                actor_type=ActorType.HUMAN.value,
                payload=payload,
            )
        )

    if has_hire:
        db.add(
            Event(
                application_id=application.id,
                type=EventType.HIRE_CONFIRMED.value,
                occurred_at=_dt(2026, 3, 15),
                actor_type=ActorType.HUMAN.value,
                payload=None,
            )
        )

    db.flush()
    return supplier, candidate, application


class TestSupplierHeadhunterFees:
    def test_returns_fees_for_hired_candidates(self, client, db):
        supplier, candidate, app = _setup_supplier_with_hired(
            db, headhunter_fee=107250
        )
        db.commit()

        r = client.get(f"/api/v1/suppliers/{supplier.id}/headhunter-fees")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["candidate_name"] == "张三"
        assert data[0]["headhunter_fee"] == 107250
        assert data[0]["hire_date"] == "2026-03-15"
        assert data[0]["application_id"] == app.id

    def test_excludes_zero_fee(self, client, db):
        supplier, _, _ = _setup_supplier_with_hired(db, headhunter_fee=0)
        db.commit()

        r = client.get(f"/api/v1/suppliers/{supplier.id}/headhunter-fees")
        assert r.status_code == 200
        assert len(r.json()) == 0

    def test_excludes_missing_fee(self, client, db):
        supplier, _, _ = _setup_supplier_with_hired(db, headhunter_fee=None)
        db.commit()

        r = client.get(f"/api/v1/suppliers/{supplier.id}/headhunter-fees")
        assert r.status_code == 200
        assert len(r.json()) == 0

    def test_empty_when_no_hired(self, client, db):
        from app.models.legacy import Supplier

        supplier = Supplier(name=f"空猎头{_uid()[:4]}")
        db.add(supplier)
        db.commit()

        r = client.get(f"/api/v1/suppliers/{supplier.id}/headhunter-fees")
        assert r.status_code == 200
        assert r.json() == []

    def test_404_for_unknown_supplier(self, client):
        r = client.get("/api/v1/suppliers/99999/headhunter-fees")
        assert r.status_code == 404

    def test_multiple_hired_candidates(self, client, db):
        from app.models.application import Application
        from app.models.enums import ActorType, ApplicationState, EventType
        from app.models.event import Event
        from app.models.legacy import Candidate, Job, Supplier

        supplier = Supplier(name=f"多人猎头{_uid()[:4]}")
        db.add(supplier)
        db.flush()

        for name, fee, hire_day in [("候选人A", 80000, 10), ("候选人B", 120000, 20)]:
            c = Candidate(name=name, supplier_id=supplier.id)
            j = Job(title="岗位")
            db.add_all([c, j])
            db.flush()

            a = Application(
                candidate_id=c.id,
                job_id=j.id,
                state=ApplicationState.HIRED.value,
            )
            db.add(a)
            db.flush()

            db.add(Event(
                application_id=a.id,
                type=EventType.OFFER_RECORDED.value,
                occurred_at=_dt(2026, 2, 1),
                actor_type=ActorType.HUMAN.value,
                payload={"headhunter_fee": fee},
            ))
            db.add(Event(
                application_id=a.id,
                type=EventType.HIRE_CONFIRMED.value,
                occurred_at=_dt(2026, 3, hire_day),
                actor_type=ActorType.HUMAN.value,
                payload=None,
            ))

        db.commit()

        r = client.get(f"/api/v1/suppliers/{supplier.id}/headhunter-fees")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 2
        # 按入职日期倒序
        assert data[0]["candidate_name"] == "候选人B"
        assert data[0]["headhunter_fee"] == 120000
        assert data[1]["candidate_name"] == "候选人A"
        assert data[1]["headhunter_fee"] == 80000
