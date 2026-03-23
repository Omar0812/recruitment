"""Tests for Term CRUD, Supplier CRUD, Expense CRUD, hired query, channel stats."""
import uuid
from typing import Optional

import pytest
from datetime import datetime, timezone


def _uid():
    return str(uuid.uuid4())


def _dt(year: int, month: int, day: int) -> datetime:
    return datetime(year, month, day, tzinfo=timezone.utc)


def _create_hired_application(
    db,
    *,
    candidate_name: str,
    job_title: str,
    offer_payload: Optional[dict] = None,
    offer_occurred_at: Optional[datetime] = None,
    hire_confirmed_at: Optional[datetime] = None,
):
    from app.models.application import Application
    from app.models.enums import ActorType, ApplicationState, EventType
    from app.models.event import Event
    from app.models.legacy import Candidate, Job

    candidate = Candidate(name=candidate_name)
    job = Job(title=job_title)
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

    if offer_payload is not None:
        db.add(
            Event(
                application_id=application.id,
                type=EventType.OFFER_RECORDED.value,
                occurred_at=offer_occurred_at or hire_confirmed_at or _dt(2026, 3, 1),
                actor_type=ActorType.HUMAN.value,
                payload=offer_payload,
            )
        )

    if hire_confirmed_at is not None:
        db.add(
            Event(
                application_id=application.id,
                type=EventType.HIRE_CONFIRMED.value,
                occurred_at=hire_confirmed_at,
                actor_type=ActorType.HUMAN.value,
                payload=None,
            )
        )

    db.flush()
    return application


# ── Term CRUD ──


class TestTermCRUD:
    def test_create_department(self, client):
        r = client.post("/api/v1/departments", json={"type": "department", "name": "工程部"})
        assert r.status_code == 201
        data = r.json()
        assert data["name"] == "工程部"
        assert data["type"] == "department"
        assert "id" in data

    def test_create_location_with_address(self, client):
        r = client.post("/api/v1/locations", json={"type": "location", "name": "北京", "address": "朝阳区CBD"})
        assert r.status_code == 201
        data = r.json()
        assert data["name"] == "北京"
        assert data["address"] == "朝阳区CBD"

    def test_create_source_tag(self, client):
        r = client.post("/api/v1/source-tags", json={"type": "platform", "name": "Boss直聘"})
        assert r.status_code == 201
        assert r.json()["name"] == "Boss直聘"
        assert r.json()["type"] == "platform"

    def test_duplicate_detection(self, client):
        client.post("/api/v1/departments", json={"type": "department", "name": "重复部门"})
        r = client.post("/api/v1/departments", json={"type": "department", "name": "重复部门"})
        assert r.status_code == 409

    def test_update_term(self, client):
        r = client.post("/api/v1/departments", json={"type": "department", "name": "待改名"})
        term_id = r.json()["id"]
        version = r.json()["version"]
        r2 = client.put(f"/api/v1/terms/{term_id}", json={"name": "已改名", "version": version})
        assert r2.status_code == 200
        assert r2.json()["name"] == "已改名"

    def test_delete_term(self, client):
        r = client.post("/api/v1/departments", json={"type": "department", "name": "待删除"})
        term_id = r.json()["id"]
        r2 = client.delete(f"/api/v1/terms/{term_id}")
        assert r2.status_code == 204

    def test_reorder_terms(self, client):
        r1 = client.post("/api/v1/departments", json={"type": "department", "name": "A部门"})
        r2 = client.post("/api/v1/departments", json={"type": "department", "name": "B部门"})
        id1, id2 = r1.json()["id"], r2.json()["id"]
        r = client.patch("/api/v1/terms/reorder", json={
            "items": [{"id": id1, "sort_order": 10}, {"id": id2, "sort_order": 5}]
        })
        assert r.status_code == 204

    def test_list_departments(self, client):
        r = client.get("/api/v1/departments")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ── Supplier CRUD ──


class TestSupplierCRUD:
    def test_create_supplier(self, client):
        r = client.post("/api/v1/suppliers", json={
            "name": "猎头公司A",
            "type": "headhunter",
            "contact_name": "李四",
            "phone": "13800138000",
            "guarantee_months": 6,
        })
        assert r.status_code == 201
        data = r.json()
        assert data["name"] == "猎头公司A"
        assert data["guarantee_months"] == 6

    def test_list_suppliers_excludes_deleted(self, client):
        r = client.post("/api/v1/suppliers", json={"name": "将被删除"})
        sid = r.json()["id"]
        client.delete(f"/api/v1/suppliers/{sid}")
        r2 = client.get("/api/v1/suppliers")
        ids = [s["id"] for s in r2.json()["items"]]
        assert sid not in ids

    def test_update_supplier(self, client):
        r = client.post("/api/v1/suppliers", json={"name": "待更新"})
        sid = r.json()["id"]
        version = r.json()["version"]
        r2 = client.put(f"/api/v1/suppliers/{sid}", json={
            "name": "已更新",
            "contract_start": "2026-01-01",
            "contract_end": "2026-12-31",
            "version": version,
        })
        assert r2.status_code == 200
        assert r2.json()["name"] == "已更新"
        assert r2.json()["contract_start"] == "2026-01-01"

    def test_soft_delete_supplier(self, client):
        r = client.post("/api/v1/suppliers", json={"name": "软删除测试"})
        sid = r.json()["id"]
        r2 = client.delete(f"/api/v1/suppliers/{sid}")
        assert r2.status_code == 204
        # Still accessible by ID
        r3 = client.get(f"/api/v1/suppliers/{sid}")
        assert r3.status_code == 200
        assert r3.json()["deleted_at"] is not None


# ── Expense CRUD ──


class TestExpenseCRUD:
    def test_create_expense(self, client):
        r = client.post("/api/v1/expenses", json={
            "channel_type": "supplier",
            "channel_id": 1,
            "amount": 5000.0,
            "occurred_at": "2026-03-01T00:00:00",
            "description": "猎头费",
        })
        assert r.status_code == 201
        data = r.json()
        assert data["amount"] == 5000.0

    def test_update_expense(self, client):
        r = client.post("/api/v1/expenses", json={
            "channel_type": "supplier",
            "channel_id": 1,
            "amount": 3000.0,
            "occurred_at": "2026-03-01T00:00:00",
        })
        eid = r.json()["id"]
        version = r.json()["version"]
        r2 = client.put(f"/api/v1/expenses/{eid}", json={
            "channel_type": "supplier",
            "channel_id": 1,
            "amount": 3500.0,
            "occurred_at": "2026-03-01T00:00:00",
            "description": "调整后",
            "version": version,
        })
        assert r2.status_code == 200
        assert r2.json()["amount"] == 3500.0

    def test_delete_expense(self, client):
        r = client.post("/api/v1/expenses", json={
            "channel_type": "source_tag",
            "channel_id": 1,
            "amount": 1000.0,
            "occurred_at": "2026-02-01T00:00:00",
        })
        eid = r.json()["id"]
        r2 = client.delete(f"/api/v1/expenses/{eid}")
        assert r2.status_code == 204

    def test_list_expenses_filter(self, client):
        client.post("/api/v1/expenses", json={
            "channel_type": "supplier",
            "channel_id": 99,
            "amount": 100.0,
            "occurred_at": "2026-01-01T00:00:00",
        })
        r = client.get("/api/v1/expenses?channel_type=supplier&channel_id=99")
        assert r.status_code == 200
        assert r.json()["total"] >= 1


# ── Hired query ──


class TestHiredQuery:
    def test_hired_list_empty(self, client):
        r = client.get("/api/v1/hired")
        assert r.status_code == 200
        body = r.json()
        assert body["items"] == []
        assert body["total"] == 0

    def test_hired_list_enriched(self, client, db):
        app_obj = _create_hired_application(
            db,
            candidate_name="张三",
            job_title="Engineer",
            offer_payload={
                "monthly_salary": 30000,
                "salary_months": 13,
                "total_cash": 390000,
                "onboard_date": "2026-04-15",
            },
            offer_occurred_at=_dt(2026, 4, 1),
            hire_confirmed_at=_dt(2026, 4, 20),
        )

        r = client.get("/api/v1/hired")
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 1
        hired_item = next((i for i in items if i["application_id"] == app_obj.id), None)
        assert hired_item is not None
        assert hired_item["candidate_name"] == "张三"
        assert hired_item["job_title"] == "Engineer"
        assert hired_item["monthly_salary"] == 30000
        assert hired_item["salary_months"] == 13
        assert hired_item["total_cash"] == 390000
        assert hired_item["hire_date"] == "2026-04-15"

    def test_hired_list_returns_nulls_without_offer(self, client, db):
        app_obj = _create_hired_application(
            db,
            candidate_name="李四",
            job_title="Designer",
            offer_payload=None,
            hire_confirmed_at=_dt(2026, 5, 1),
        )

        r = client.get("/api/v1/hired")
        assert r.status_code == 200
        hired_item = next(i for i in r.json()["items"] if i["application_id"] == app_obj.id)
        assert hired_item["monthly_salary"] is None
        assert hired_item["salary_months"] is None
        assert hired_item["total_cash"] is None
        assert hired_item["hire_date"] is not None  # fallback to hire_confirmed occurred_at

    def test_hired_list_sorts_by_offer_onboard_date_desc(self, client, db):
        latest = _create_hired_application(
            db,
            candidate_name="候选人A",
            job_title="Role A",
            offer_payload={"monthly_salary": 40000, "salary_months": 12, "onboard_date": "2026-04-20"},
            offer_occurred_at=_dt(2026, 4, 5),
            hire_confirmed_at=_dt(2026, 4, 18),
        )
        earlier = _create_hired_application(
            db,
            candidate_name="候选人B",
            job_title="Role B",
            offer_payload={"monthly_salary": 35000, "salary_months": 12, "onboard_date": "2026-04-10"},
            offer_occurred_at=_dt(2026, 4, 3),
            hire_confirmed_at=_dt(2026, 5, 2),
        )
        missing = _create_hired_application(
            db,
            candidate_name="候选人C",
            job_title="Role C",
            offer_payload={"monthly_salary": 32000, "salary_months": 12},
            offer_occurred_at=_dt(2026, 4, 4),
            hire_confirmed_at=_dt(2026, 5, 3),
        )

        r = client.get("/api/v1/hired?page_size=10")
        assert r.status_code == 200
        items = r.json()["items"]

        # Verify items contain our test applications
        our_ids = {latest.id, earlier.id, missing.id}
        our_items = [item for item in items if item["application_id"] in our_ids]
        assert len(our_items) == 3

        earlier_item = next(item for item in items if item["application_id"] == earlier.id)
        assert earlier_item["hire_date"] == "2026-04-10"


    def test_hired_list_uses_latest_offer_payload_for_onboard_date(self, client, db):
        from app.models.enums import ActorType, EventType
        from app.models.event import Event

        app_obj = _create_hired_application(
            db,
            candidate_name="候选人D",
            job_title="Role D",
            offer_payload={"monthly_salary": 28000, "salary_months": 12, "onboard_date": "2026-04-01"},
            offer_occurred_at=_dt(2026, 4, 1),
            hire_confirmed_at=_dt(2026, 4, 20),
        )
        db.add(
            Event(
                application_id=app_obj.id,
                type=EventType.OFFER_RECORDED.value,
                occurred_at=_dt(2026, 4, 12),
                actor_type=ActorType.HUMAN.value,
                payload={
                    "monthly_salary": 30000,
                    "salary_months": 13,
                    "onboard_date": "2026-05-06",
                },
            )
        )
        db.commit()

        r = client.get("/api/v1/hired?page_size=10")
        assert r.status_code == 200
        item = next(result for result in r.json()["items"] if result["application_id"] == app_obj.id)
        assert item["hire_date"] == "2026-05-06"
        assert item["monthly_salary"] == 30000
        assert item["salary_months"] == 13


# ── Channel stats ──


class TestChannelStats:
    def test_source_tag_stats(self, client):
        r = client.get("/api/v1/source-tags/stats")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
