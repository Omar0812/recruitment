"""Analytics API tests — overview / jobs / channels."""
from datetime import date, datetime, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.application import Application
from app.models.enums import ApplicationState, EventType, Outcome
from app.models.event import Event
from app.models.expense import Expense
from app.models.legacy import Candidate, Job, Supplier
from app.models.term import Term


# ── Fixtures ──

@pytest.fixture
def engine():
    e = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(e)
    return e


@pytest.fixture
def db(engine):
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def _dt(y, m, d, h=12):
    return datetime(y, m, d, h, 0, 0, tzinfo=timezone.utc)


def _seed_basic(db):
    """Seed data for tests: 2 jobs, 3 candidates, 4 applications, events."""
    # Jobs
    j1 = Job(
        id=1,
        title="后端工程师",
        department="技术",
        status="open",
        city="上海",
        priority="high",
        headcount=3,
        target_onboard_date=date(2026, 3, 25),
    )
    j2 = Job(id=2, title="产品经理", department="产品", status="open", city="北京", headcount=2)
    db.add_all([j1, j2])
    db.flush()

    # Suppliers
    s1 = Supplier(id=1, name="XX猎头", contract_end="2099-12-31")
    db.add(s1)
    db.flush()

    # Terms (platform)
    t1 = Term(id=1, type="platform", name="BOSS直聘")
    db.add(t1)
    db.flush()

    # Candidates
    c1 = Candidate(id=1, name="张三", source="BOSS直聘", created_at=_dt(2026, 3, 5))
    c2 = Candidate(id=2, name="李四", supplier_id=1, created_at=_dt(2026, 3, 6))
    c3 = Candidate(id=3, name="王五", source="内推", referred_by="赵六", created_at=_dt(2026, 3, 7))
    c4 = Candidate(id=4, name="赵六", source="BOSS直聘", created_at=_dt(2026, 3, 10))
    db.add_all([c1, c2, c3, c4])
    db.flush()

    # Applications (all created in March 2026)
    # Note: only one IN_PROGRESS per candidate (unique constraint)
    a1 = Application(id=1, candidate_id=1, job_id=1, state=ApplicationState.IN_PROGRESS.value, stage="面试",
                     created_at=_dt(2026, 3, 5))
    a2 = Application(id=2, candidate_id=2, job_id=1, state=ApplicationState.HIRED.value, stage="已入职",
                     outcome=Outcome.HIRED.value, created_at=_dt(2026, 3, 6))
    a3 = Application(id=3, candidate_id=3, job_id=2, state=ApplicationState.REJECTED.value, stage="面试",
                     outcome=Outcome.REJECTED.value, created_at=_dt(2026, 3, 7))
    a4 = Application(id=4, candidate_id=4, job_id=2, state=ApplicationState.IN_PROGRESS.value, stage="简历筛选",
                     created_at=_dt(2026, 3, 10))
    db.add_all([a1, a2, a3, a4])
    db.flush()

    # Events
    events = [
        # a1: created → screening_passed
        Event(application_id=1, type=EventType.APPLICATION_CREATED.value, occurred_at=_dt(2026, 3, 5)),
        Event(application_id=1, type=EventType.SCREENING_PASSED.value, occurred_at=_dt(2026, 3, 8)),

        # a2: created → screening → interview → offer → bg → hire
        Event(application_id=2, type=EventType.APPLICATION_CREATED.value, occurred_at=_dt(2026, 3, 6)),
        Event(application_id=2, type=EventType.SCREENING_PASSED.value, occurred_at=_dt(2026, 3, 7)),
        Event(application_id=2, type=EventType.ADVANCE_TO_OFFER.value, occurred_at=_dt(2026, 3, 10)),
        Event(application_id=2, type=EventType.OFFER_RECORDED.value, occurred_at=_dt(2026, 3, 12),
              payload={"headhunter_fee": 50000, "onboard_date": "2026-03-20"}),
        Event(application_id=2, type=EventType.HIRE_CONFIRMED.value, occurred_at=_dt(2026, 3, 20)),

        # a3: created → screening → ended (rejected)
        Event(application_id=3, type=EventType.APPLICATION_CREATED.value, occurred_at=_dt(2026, 3, 7)),
        Event(application_id=3, type=EventType.SCREENING_PASSED.value, occurred_at=_dt(2026, 3, 9)),
        Event(application_id=3, type=EventType.APPLICATION_ENDED.value, occurred_at=_dt(2026, 3, 15),
              payload={"outcome": "rejected", "reason_code": "biz_eval_fail"}),

        # a4: created only
        Event(application_id=4, type=EventType.APPLICATION_CREATED.value, occurred_at=_dt(2026, 3, 10)),
    ]
    db.add_all(events)

    # Expenses
    exp1 = Expense(channel_type="source_tag", channel_id=1, amount=5000, occurred_at=_dt(2026, 3, 10))
    db.add(exp1)

    db.commit()


def _seed_headhunter_fee_by_hire_window(db):
    job = Job(id=10, title="销售经理", status="open", city="深圳", priority="medium", headcount=1)
    supplier = Supplier(id=10, name="跨月猎头", contract_end="2099-12-31")
    candidate = Candidate(id=10, name="跨月候选人", supplier_id=10, created_at=_dt(2026, 2, 26))
    application = Application(
        id=10,
        candidate_id=10,
        job_id=10,
        state=ApplicationState.HIRED.value,
        stage="已入职",
        outcome=Outcome.HIRED.value,
        created_at=_dt(2026, 2, 26),
    )

    db.add_all([job, supplier, candidate, application])
    db.flush()

    db.add_all([
        Event(application_id=10, type=EventType.APPLICATION_CREATED.value, occurred_at=_dt(2026, 2, 26)),
        Event(
            application_id=10,
            type=EventType.OFFER_RECORDED.value,
            occurred_at=_dt(2026, 2, 28),
            payload={"headhunter_fee": 80000, "onboard_date": "2026-03-08"},
        ),
        Event(application_id=10, type=EventType.HIRE_CONFIRMED.value, occurred_at=_dt(2026, 3, 8)),
    ])
    db.commit()


# ── 8.1 Overview API Tests ──

class TestOverviewAPI:
    def test_overview_cards(self, db):
        _seed_basic(db)
        from app.query.analytics import get_overview
        result = get_overview(db, date(2026, 3, 1), date(2026, 3, 31))
        cards = {c["key"]: c for c in result["cards"]}

        # 新建档 = 4 (c1, c2, c3, c4)
        assert cards["new_candidates"]["value"] == 4
        # 新流程 = 4
        assert cards["new_applications"]["value"] == 4
        # 入职 = 1
        assert cards["hired"]["value"] == 1
        # 结束 = 1
        assert cards["ended"]["value"] == 1
        # 平均周期 = (2026-03-20 - 2026-03-06) = 14 days
        assert cards["avg_cycle_days"]["value"] == 14.0
        # 费用 = 5000 (expense) + 50000 (headhunter) = 55000
        assert cards["total_cost"]["value"] == 55000.0
        assert cards["hired"]["delta"] == 1
        assert cards["hired"]["delta_percent"] is None

    def test_overview_cards_with_change(self, db):
        _seed_basic(db)
        from app.query.analytics import get_overview
        result = get_overview(db, date(2026, 3, 1), date(2026, 3, 31))
        cards = {c["key"]: c for c in result["cards"]}

        # 环比 previous 应为 0（上期无数据）
        assert cards["new_candidates"]["previous"] == 0
        # 上期 0 → delta 有值，但 delta_percent 无法计算
        assert cards["new_candidates"]["delta"] == 4
        assert cards["new_candidates"]["delta_percent"] is None

    def test_overview_funnel(self, db):
        _seed_basic(db)
        from app.query.analytics import get_overview
        result = get_overview(db, date(2026, 3, 1), date(2026, 3, 31))
        funnel = {f["stage"]: f for f in result["funnel"]}

        # 4 apps in cohort, all start at 新申请
        assert funnel["新申请"]["count"] == 4
        # all 4 passed through 简历筛选
        assert funnel["简历筛选"]["count"] == 4
        # a1(面试), a2(已入职→通过面试), a3(rejected at 面试) = 3 passed 面试
        assert funnel["面试"]["count"] == 3
        # a2 went to Offer沟通
        assert funnel["Offer沟通"]["count"] == 1
        # a2 hired
        assert funnel["已入职"]["count"] == 1

    def test_overview_trend(self, db):
        _seed_basic(db)
        from app.query.analytics import get_overview
        result = get_overview(db, date(2026, 3, 1), date(2026, 3, 31), granularity="week")
        # Should have trend buckets
        assert len(result["trend"]) > 0
        assert "period_start" in result["trend"][0]
        total_apps = sum(b["new_applications"] for b in result["trend"])
        assert total_apps == 4

    def test_overview_end_reasons(self, db):
        _seed_basic(db)
        from app.query.analytics import get_overview
        result = get_overview(db, date(2026, 3, 1), date(2026, 3, 31))
        er = result["end_reasons"]

        assert er["rejected"]["total"] == 1
        assert er["rejected"]["items"][0]["reason"] == "面试评估不通过"
        assert er["withdrawn"]["total"] == 0

    def test_overview_empty_range(self, db):
        _seed_basic(db)
        from app.query.analytics import get_overview
        result = get_overview(db, date(2025, 1, 1), date(2025, 1, 31))
        cards = {c["key"]: c for c in result["cards"]}
        assert cards["new_candidates"]["value"] == 0
        assert cards["new_applications"]["value"] == 0
        assert result["funnel_cohort_size"] == 0

    def test_overview_headhunter_fee_uses_hire_date(self, db):
        _seed_headhunter_fee_by_hire_window(db)
        from app.query.analytics import get_overview

        result = get_overview(db, date(2026, 3, 1), date(2026, 3, 31))
        cards = {c["key"]: c for c in result["cards"]}

        assert cards["total_cost"]["value"] == 80000.0


# ── 8.2 Jobs API Tests ──

class TestJobsAPI:
    def test_jobs_list(self, db):
        _seed_basic(db)
        from app.query.analytics import get_jobs_list
        result = get_jobs_list(db, date(2026, 3, 1), date(2026, 3, 31))

        assert len(result["items"]) == 2
        j1 = next(i for i in result["items"] if i["id"] == 1)
        assert j1["title"] == "后端工程师"
        assert j1["priority"] == "high"
        assert j1["headcount"] == 3
        assert j1["hired_count"] == 1
        assert j1["funnel"][0]["count"] == 2  # 新申请: a1, a2
        assert j1["pass_rate"] == 50.0  # 1 hired out of 2
        assert j1["avg_cycle_days"] == 14.0

    def test_jobs_list_filter(self, db):
        _seed_basic(db)
        from app.query.analytics import get_jobs_list
        # Filter closed — both are open so should return 0
        result = get_jobs_list(db, date(2026, 3, 1), date(2026, 3, 31), filter_status="closed")
        assert len(result["items"]) == 0

    def test_jobs_list_totals(self, db):
        _seed_basic(db)
        from app.query.analytics import get_jobs_list
        result = get_jobs_list(db, date(2026, 3, 1), date(2026, 3, 31))
        totals = result["totals"]
        # 4 total apps at 新申请
        assert totals["funnel"][0]["count"] == 4

    def test_job_drilldown(self, db):
        _seed_basic(db)
        from app.query.analytics import get_job_drilldown
        result = get_job_drilldown(db, 1, date(2026, 3, 1), date(2026, 3, 31))

        assert result["job"]["title"] == "后端工程师"
        assert result["job"]["hired_count"] == 1
        assert result["job"]["target_onboard_date"] == "2026-03-25"
        assert result["funnel_cohort_size"] == 2

        # Stage durations should have entries
        durations = {d["stage"]: d for d in result["stage_durations"]}
        assert durations["新申请"]["sample_size"] >= 1

        # Source distribution
        sources = {s["source"]: s["count"] for s in result["source_distribution"]}
        assert "BOSS直聘" in sources
        assert "XX猎头" in sources

    def test_job_drilldown_not_found(self, db):
        _seed_basic(db)
        from app.query.analytics import get_job_drilldown
        result = get_job_drilldown(db, 999, date(2026, 3, 1), date(2026, 3, 31))
        assert "error" in result


# ── 8.3 Channels API Tests ──

class TestChannelsAPI:
    def test_channels_list(self, db):
        _seed_basic(db)
        from app.query.analytics import get_channels_list
        result = get_channels_list(db, date(2026, 3, 1), date(2026, 3, 31))

        sections = {s["key"]: s for s in result["sections"]}
        assert "headhunter" in sections
        assert "platform" in sections
        assert "other" in sections

        # 猎头 section should have XX猎头
        hh_items = sections["headhunter"]["items"]
        assert len(hh_items) >= 1
        assert hh_items[0]["name"] == "XX猎头"
        assert hh_items[0]["type"] == "headhunter"

    def test_channels_list_funnel(self, db):
        _seed_basic(db)
        from app.query.analytics import get_channels_list
        result = get_channels_list(db, date(2026, 3, 1), date(2026, 3, 31))

        sections = {s["key"]: s for s in result["sections"]}
        hh = sections["headhunter"]["items"][0]
        # XX猎头 has 1 app (a2, hired)
        assert hh["funnel"][0]["count"] == 1
        assert hh["conversion_rate"] == 100.0

    def test_channels_list_cost(self, db):
        _seed_basic(db)
        from app.query.analytics import get_channels_list
        result = get_channels_list(db, date(2026, 3, 1), date(2026, 3, 31))

        sections = {s["key"]: s for s in result["sections"]}
        # 招聘平台 (BOSS直聘) should have expense 5000
        platform = sections["platform"]["items"]
        boss = next((c for c in platform if c["key"] == "source_tag:1"), None)
        assert boss is not None
        assert boss["type"] == "platform"
        assert boss["total_expense"] >= 5000

    def test_channel_drilldown(self, db):
        _seed_basic(db)
        from app.query.analytics import get_channel_drilldown
        result = get_channel_drilldown(db, "supplier:1", date(2026, 3, 1), date(2026, 3, 31))

        assert result["channel"]["name"] == "XX猎头"
        assert result["channel"]["type"] == "headhunter"
        assert result["channel"]["contract_status"] == "合作中"
        assert result["funnel_cohort_size"] == 1
        assert result["expense_detail"]["headhunter_fee"] == 50000.0

    def test_channel_drilldown_referral(self, db):
        _seed_basic(db)
        from app.query.analytics import get_channel_drilldown
        result = get_channel_drilldown(db, "referral", date(2026, 3, 1), date(2026, 3, 31))

        assert result["channel"]["name"] == "内推"
        assert result["funnel_cohort_size"] == 1

    def test_channel_drilldown_job_distribution(self, db):
        _seed_basic(db)
        from app.query.analytics import get_channel_drilldown
        result = get_channel_drilldown(db, "source:BOSS直聘", date(2026, 3, 1), date(2026, 3, 31))

        # BOSS直聘 candidates have apps in job 1 and job 2
        assert result["channel"]["key"] == "source_tag:1"
        jobs = result["job_distribution"]
        assert len(jobs) >= 1

    def test_channels_list_groups_unknown_sources_into_other(self, db):
        _seed_basic(db)
        db.add(Candidate(id=5, name="线下活动候选人", source="线下活动", created_at=_dt(2026, 3, 11)))
        db.flush()
        db.add(Application(
            id=5,
            candidate_id=5,
            job_id=1,
            state=ApplicationState.IN_PROGRESS.value,
            stage="简历筛选",
            created_at=_dt(2026, 3, 11),
        ))
        db.add(Event(application_id=5, type=EventType.APPLICATION_CREATED.value, occurred_at=_dt(2026, 3, 11)))
        db.commit()

        from app.query.analytics import get_channels_list

        result = get_channels_list(db, date(2026, 3, 1), date(2026, 3, 31))
        other_items = next(section["items"] for section in result["sections"] if section["key"] == "other")
        aggregated_other = next(item for item in other_items if item["key"] == "other")

        assert aggregated_other["name"] == "其他来源"
        assert aggregated_other["type"] == "other"
        assert aggregated_other["funnel"][0]["count"] == 1

    def test_channel_drilldown_headhunter_fee_uses_hire_date(self, db):
        _seed_headhunter_fee_by_hire_window(db)
        from app.query.analytics import get_channel_drilldown

        result = get_channel_drilldown(db, "supplier:10", date(2026, 3, 1), date(2026, 3, 31))

        assert result["expense_detail"]["headhunter_fee"] == 80000.0
