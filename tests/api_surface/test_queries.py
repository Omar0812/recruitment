"""测试查询端点：briefing / analytics / pipeline / hired。"""
from datetime import date, datetime, timezone

from app.models.application import Application
from app.models.enums import ApplicationState, EventType, Outcome
from app.models.event import Event
from app.models.expense import Expense
from app.models.legacy import Candidate, Job, Supplier
from app.models.term import Term


def _dt(y, m, d, h=12):
    return datetime(y, m, d, h, 0, 0, tzinfo=timezone.utc)


def _seed_analytics(db):
    job = Job(
        title="后端工程师",
        status="open",
        city="上海",
        priority="high",
        headcount=2,
        target_onboard_date=date(2026, 3, 31),
    )
    supplier = Supplier(name="Query猎头", contract_end="2099-12-31")
    source_tag = Term(type="platform", name="BOSS直聘")

    db.add_all([job, supplier, source_tag])
    db.flush()

    hh_candidate = Candidate(name="猎头候选人", supplier_id=supplier.id, created_at=_dt(2026, 3, 5))
    platform_candidate = Candidate(name="平台候选人", source="BOSS直聘", created_at=_dt(2026, 3, 6))

    db.add_all([hh_candidate, platform_candidate])
    db.flush()

    hired_application = Application(
        candidate_id=hh_candidate.id,
        job_id=job.id,
        state=ApplicationState.HIRED.value,
        stage="已入职",
        outcome=Outcome.HIRED.value,
        created_at=_dt(2026, 3, 5),
    )
    active_application = Application(
        candidate_id=platform_candidate.id,
        job_id=job.id,
        state=ApplicationState.IN_PROGRESS.value,
        stage="面试",
        created_at=_dt(2026, 3, 6),
    )

    db.add_all([hired_application, active_application])
    db.flush()

    db.add_all([
        Event(application_id=hired_application.id, type=EventType.APPLICATION_CREATED.value, occurred_at=_dt(2026, 3, 5)),
        Event(application_id=hired_application.id, type=EventType.SCREENING_PASSED.value, occurred_at=_dt(2026, 3, 6)),
        Event(application_id=hired_application.id, type=EventType.OFFER_RECORDED.value, occurred_at=_dt(2026, 3, 8), payload={
            "headhunter_fee": 60000,
            "onboard_date": "2026-03-20",
        }),
        Event(application_id=hired_application.id, type=EventType.HIRE_CONFIRMED.value, occurred_at=_dt(2026, 3, 20)),
        Event(application_id=active_application.id, type=EventType.APPLICATION_CREATED.value, occurred_at=_dt(2026, 3, 6)),
        Event(application_id=active_application.id, type=EventType.SCREENING_PASSED.value, occurred_at=_dt(2026, 3, 7)),
    ])
    db.add(Expense(channel_type="source_tag", channel_id=source_tag.id, amount=5000, occurred_at=_dt(2026, 3, 10)))
    db.commit()
    return {
        "job_id": job.id,
        "supplier_id": supplier.id,
        "source_tag_id": source_tag.id,
    }


def test_briefing_today(client, seed):
    r = client.get("/api/v1/briefing/today")
    assert r.status_code == 200
    body = r.json()
    assert "pulse" in body
    assert "schedule" in body
    assert body["pulse"]["active_applications"] >= 1


def test_analytics_overview(client, db):
    _seed_analytics(db)
    r = client.get("/api/v1/analytics/overview", params={
        "start": "2026-03-01", "end": "2026-03-31", "granularity": "week",
    })
    assert r.status_code == 200
    body = r.json()

    assert "cards" in body
    assert "trend" in body
    cards = {card["key"]: card for card in body["cards"]}
    assert cards["avg_cycle_days"]["value"] == 15.0
    assert "delta" in cards["hired"]
    assert "delta_percent" in cards["hired"]
    assert "period_start" in body["trend"][0]


def test_analytics_jobs(client, db):
    seeded = _seed_analytics(db)
    r = client.get("/api/v1/analytics/jobs", params={
        "start": "2026-03-01", "end": "2026-03-31",
    })
    assert r.status_code == 200
    body = r.json()
    assert "items" in body

    job = next(item for item in body["items"] if item["id"] == seeded["job_id"])
    assert job["priority"] == "high"
    assert job["headcount"] == 2
    assert job["hired_count"] == 1
    assert "avg_cycle_days" in job


def test_analytics_job_drilldown(client, db):
    seeded = _seed_analytics(db)
    r = client.get(f"/api/v1/analytics/jobs/{seeded['job_id']}", params={
        "start": "2026-03-01", "end": "2026-03-31",
    })
    assert r.status_code == 200
    body = r.json()

    assert body["job"]["id"] == seeded["job_id"]
    assert body["job"]["hired_count"] == 1
    assert body["job"]["target_onboard_date"] == "2026-03-31"


def test_analytics_channels(client, db):
    seeded = _seed_analytics(db)
    r = client.get("/api/v1/analytics/channels", params={
        "start": "2026-03-01", "end": "2026-03-31",
    })
    assert r.status_code == 200
    body = r.json()
    assert "sections" in body

    sections = {section["key"]: section for section in body["sections"]}
    assert sections["headhunter"]["label"] == "猎头"
    platform_item = next(item for item in sections["platform"]["items"] if item["key"] == f"source_tag:{seeded['source_tag_id']}")
    assert platform_item["type"] == "platform"


def test_analytics_channel_drilldown(client, db):
    seeded = _seed_analytics(db)
    r = client.get(f"/api/v1/analytics/channels/supplier:{seeded['supplier_id']}", params={
        "start": "2026-03-01", "end": "2026-03-31",
    })
    assert r.status_code == 200
    body = r.json()

    assert body["channel"]["type"] == "headhunter"
    assert body["channel"]["contract_status"] == "合作中"
    assert body["expense_detail"]["headhunter_fee"] == 60000.0


def test_pipeline_active(client, seed):
    r = client.get("/api/v1/pipeline/active")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 1
    assert body["items"][0]["state"] == "IN_PROGRESS"


def test_hired_list(client, seed):
    r = client.get("/api/v1/hired")
    assert r.status_code == 200
    assert "items" in r.json()
