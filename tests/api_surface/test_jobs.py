from __future__ import annotations

from datetime import datetime, timezone

from app.models.action_receipt import ActionReceipt
from app.models.application import Application
from app.models.enums import ApplicationState
from app.models.legacy import Candidate, Job
from app.models.term import Term


def test_list_jobs_supports_status_and_keyword(client, db):
    db.add_all([
        Job(title="Backend Engineer", status="open"),
        Job(title="Frontend Engineer", status="open"),
        Job(title="Closed Role", status="closed"),
    ])
    db.commit()

    response = client.get("/api/v1/jobs", params={"status": "open", "keyword": "back"})

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert [item["title"] for item in body["items"]] == ["Backend Engineer"]


def test_list_jobs_keeps_explicit_nulls_for_optional_hydrated_fields(client, db):
    db.add(Job(title="Operations", city="深圳", status="open"))
    db.commit()

    response = client.get("/api/v1/jobs")

    assert response.status_code == 200
    item = response.json()["items"][0]
    assert item["title"] == "Operations"
    assert item["location_name"] == "深圳"
    assert item["location_address"] is None
    assert item["priority"] is None
    assert item["target_onboard_date"] is None
    assert item["notes"] is None
    assert item["close_reason"] is None
    assert item["closed_at"] is None


def test_get_job_detail_returns_hydrated_fields(client, db):
    closed_at = datetime(2026, 3, 9, tzinfo=timezone.utc)
    job = Job(
        title="产品经理",
        department="产品部",
        city="上海",
        location_name="上海",
        location_address="上海市静安区",
        headcount=2,
        jd="负责产品规划",
        priority="high",
        notes="需要 B 端经验",
        status="closed",
        close_reason="需求取消",
        closed_at=closed_at,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    response = client.get(f"/api/v1/jobs/{job.id}")

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "产品经理"
    assert body["department"] == "产品部"
    assert body["location_name"] == "上海"
    assert body["location_address"] == "上海市静安区"
    assert body["headcount"] == 2
    assert body["priority"] == "high"
    assert body["notes"] == "需要 B 端经验"
    assert body["close_reason"] == "需求取消"
    assert body["closed_at"].startswith("2026-03-09")


def test_get_job_detail_falls_back_to_location_term_address(client, db):
    db.add(Term(type="location", name="杭州", address="杭州市滨江区", sort_order=0))
    job = Job(
        title="测试岗位",
        department="技术部",
        city="杭州",
        location_name="杭州",
        location_address=None,
        headcount=1,
        jd="测试 JD",
        status="open",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    response = client.get(f"/api/v1/jobs/{job.id}")

    assert response.status_code == 200
    assert response.json()["location_address"] == "杭州市滨江区"


def test_create_job_returns_hydrated_response_and_records_receipt(client, db):
    payload = {
        "title": "后端工程师",
        "department": "技术部",
        "location_name": "北京",
        "location_address": "北京市朝阳区",
        "headcount": 3,
        "jd": "负责后端开发",
        "priority": "medium",
        "target_onboard_date": "2026-04-01",
        "notes": "优先有 FastAPI 经验",
    }

    response = client.post("/api/v1/jobs", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "后端工程师"
    assert body["department"] == "技术部"
    assert body["location_name"] == "北京"
    assert body["location_address"] == "北京市朝阳区"
    assert body["headcount"] == 3
    assert body["priority"] == "medium"
    assert body["notes"] == "优先有 FastAPI 经验"
    assert body["status"] == "open"

    receipt = db.query(ActionReceipt).filter_by(action_code="create_job", target_id=body["id"]).one()
    assert receipt.ok is True

    created_job = db.get(Job, body["id"])
    assert created_job is not None
    assert created_job.city == "北京"


def test_create_job_allows_missing_location_address(client, db):
    payload = {
        "title": "招聘运营",
        "department": "运营部",
        "location_name": "海口",
        "headcount": 1,
        "jd": "负责招聘流程运营",
        "priority": "low",
    }

    response = client.post("/api/v1/jobs", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "招聘运营"
    assert body["location_name"] == "海口"
    assert body["location_address"] is None

    created_job = db.get(Job, body["id"])
    assert created_job is not None
    assert created_job.location_address is None


def test_close_job_marks_job_closed_and_ends_active_applications(client, db):
    candidate = Candidate(name="张三")
    job = Job(title="销售经理", status="open")
    db.add_all([candidate, job])
    db.flush()

    application = Application(
        candidate_id=candidate.id,
        job_id=job.id,
        state=ApplicationState.IN_PROGRESS.value,
        stage="面试",
    )
    db.add(application)
    db.commit()

    response = client.post(f"/api/v1/jobs/{job.id}/close", json={"reason": "需求取消"})

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "closed"
    assert body["close_reason"] == "需求取消"
    assert body["closed_at"] is not None

    db.refresh(job)
    db.refresh(application)
    assert job.status == "closed"
    assert job.close_reason == "需求取消"
    assert application.state == ApplicationState.REJECTED.value
    assert application.outcome == "岗位关闭"

    receipt = db.query(ActionReceipt).filter_by(action_code="close_job", target_id=job.id).one()
    assert receipt.ok is True


def test_close_job_rejects_empty_reason(client, db):
    job = Job(title="招聘专员", status="open")
    db.add(job)
    db.commit()

    response = client.post(f"/api/v1/jobs/{job.id}/close", json={"reason": ""})

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


def test_list_jobs_returns_hired_count_and_stage_distribution(client, db):
    job = Job(title="后端工程师", status="open", headcount=3)
    c1 = Candidate(name="张三")
    c2 = Candidate(name="李四")
    c3 = Candidate(name="王五")
    db.add_all([job, c1, c2, c3])
    db.flush()

    db.add_all([
        Application(candidate_id=c1.id, job_id=job.id,
                    state=ApplicationState.HIRED.value, stage="已入职"),
        Application(candidate_id=c2.id, job_id=job.id,
                    state=ApplicationState.IN_PROGRESS.value, stage="面试"),
        Application(candidate_id=c3.id, job_id=job.id,
                    state=ApplicationState.IN_PROGRESS.value, stage="简历筛选"),
    ])
    db.commit()

    response = client.get("/api/v1/jobs")
    assert response.status_code == 200
    item = response.json()["items"][0]
    assert item["hired_count"] == 1
    assert item["stage_distribution"] == {"面试": 1, "简历筛选": 1}


def test_get_job_returns_hired_count_and_stage_distribution(client, db):
    job = Job(title="前端工程师", status="open", headcount=2)
    c1 = Candidate(name="赵六")
    db.add_all([job, c1])
    db.flush()

    db.add(Application(
        candidate_id=c1.id, job_id=job.id,
        state=ApplicationState.HIRED.value, stage="已入职",
    ))
    db.commit()

    response = client.get(f"/api/v1/jobs/{job.id}")
    assert response.status_code == 200
    body = response.json()
    assert body["hired_count"] == 1
    assert body["stage_distribution"] == {}


def test_job_without_applications_returns_zero_hired_count(client, db):
    job = Job(title="产品经理", status="open", headcount=1)
    db.add(job)
    db.commit()

    response = client.get(f"/api/v1/jobs/{job.id}")
    assert response.status_code == 200
    body = response.json()
    assert body["hired_count"] == 0
    assert body["stage_distribution"] == {}
