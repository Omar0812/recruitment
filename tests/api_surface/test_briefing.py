"""今日简报聚合查询测试。

覆盖：脉搏计数、日程条目、7 种待办触发、5 种关注信号、去重规则。
"""
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine, event as sa_event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.application import Application
from app.models.enums import ActorType, ApplicationState, EventType
from app.models.event import Event
from app.models.legacy import Candidate, Job
from app.query.briefing import get_today_briefing
from app.utils.time import BIZ_TZ

_NOW = datetime.utcnow()  # naive — matches what SQLite returns
_TODAY = datetime.now(timezone.utc).astimezone(BIZ_TZ).date()
_YESTERDAY = _TODAY - timedelta(days=1)
_TOMORROW = _TODAY + timedelta(days=1)


def _uid():
    return str(uuid.uuid4())


def _dt(d, hour=12):
    """Naive datetime — consistent with what SQLite stores and returns."""
    return datetime(d.year, d.month, d.day, hour, 0, 0)


@pytest.fixture(scope="module")
def engine():
    eng = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @sa_event.listens_for(eng, "connect")
    def _fk(conn, _):
        conn.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture()
def db(engine):
    session = sessionmaker(bind=engine)()
    yield session
    session.rollback()
    session.close()


# ── 帮手函数 ──

def _make_candidate(db, name="测试候选人"):
    c = Candidate(name=name)
    db.add(c)
    db.flush()
    return c


def _make_job(db, title="工程师", status="open", priority=None,
              headcount=1, target_onboard_date=None):
    j = Job(title=title, status=status, priority=priority,
            headcount=headcount, target_onboard_date=target_onboard_date)
    db.add(j)
    db.flush()
    return j


def _make_app(db, candidate, job, state=ApplicationState.IN_PROGRESS.value, stage="新申请"):
    a = Application(candidate_id=candidate.id, job_id=job.id, state=state, stage=stage)
    db.add(a)
    db.flush()
    # 必须有 application_created 事件
    _add_event(db, a, EventType.APPLICATION_CREATED.value,
               occurred_at=_dt(_TODAY - timedelta(days=5)))
    return a


def _add_event(db, app, etype, occurred_at=None, payload=None, body=None):
    ev = Event(
        application_id=app.id,
        type=etype,
        occurred_at=occurred_at or _NOW,
        actor_type=ActorType.HUMAN.value,
        payload=payload,
        body=body,
    )
    db.add(ev)
    db.flush()
    return ev


# ══════════════════════════════════════════════════════════════
# 脉搏
# ══════════════════════════════════════════════════════════════

class TestPulse:
    def test_empty_system(self, db):
        result = get_today_briefing(db)
        p = result["pulse"]
        assert p["today_interviews"] == 0
        assert p["todo_count"] == 0
        assert p["active_applications"] == 0
        assert p["open_jobs"] == 0

    def test_counts(self, db):
        c = _make_candidate(db)
        j = _make_job(db, "岗位A")
        _make_app(db, c, j)
        j2 = _make_job(db, "岗位B")

        result = get_today_briefing(db)
        p = result["pulse"]
        assert p["active_applications"] == 1
        assert p["open_jobs"] == 2


# ══════════════════════════════════════════════════════════════
# 日程
# ══════════════════════════════════════════════════════════════

class TestSchedule:
    def test_today_interview(self, db):
        c = _make_candidate(db, "面试者")
        j = _make_job(db, "前端")
        a = _make_app(db, c, j, stage="面试")
        _add_event(db, a, EventType.SCREENING_PASSED.value,
                   occurred_at=_dt(_TODAY - timedelta(days=2)))
        _add_event(db, a, EventType.INTERVIEW_SCHEDULED.value,
                   occurred_at=_dt(_TODAY - timedelta(days=1)),
                   payload={"scheduled_at": _dt(_TODAY, 10).isoformat(),
                            "interview_round": 1, "interviewer": "张总"})

        result = get_today_briefing(db)
        today_items = result["schedule"]["today"]
        assert len(today_items) >= 1
        item = [i for i in today_items if i["application_id"] == a.id][0]
        assert item["type"] == "interview"
        assert item["candidate_name"] == "面试者"
        assert item["interviewer"] == "张总"
        assert result["pulse"]["today_interviews"] >= 1

    def test_completed_interview_excluded(self, db):
        c = _make_candidate(db, "已面")
        j = _make_job(db, "后端")
        a = _make_app(db, c, j, stage="面试")
        sched = _add_event(db, a, EventType.INTERVIEW_SCHEDULED.value,
                           occurred_at=_dt(_TODAY - timedelta(days=1)),
                           payload={"scheduled_at": _dt(_TODAY, 14).isoformat(),
                                    "interview_round": 1})
        # feedback 在 scheduled 之后
        _add_event(db, a, EventType.INTERVIEW_FEEDBACK.value,
                   occurred_at=_dt(_TODAY),
                   payload={"result": "pass", "score": 4})

        result = get_today_briefing(db)
        ids = [i["application_id"] for i in result["schedule"]["today"]]
        assert a.id not in ids

    def test_tomorrow_schedule(self, db):
        c = _make_candidate(db, "明日面")
        j = _make_job(db, "设计师")
        a = _make_app(db, c, j, stage="面试")
        _add_event(db, a, EventType.INTERVIEW_SCHEDULED.value,
                   occurred_at=_dt(_TODAY),
                   payload={"scheduled_at": _dt(_TOMORROW, 9).isoformat(),
                            "interview_round": 1})

        result = get_today_briefing(db)
        tmr = result["schedule"]["tomorrow"]
        assert any(i["application_id"] == a.id for i in tmr)

    def test_today_onboard(self, db):
        c = _make_candidate(db, "入职者")
        j = _make_job(db, "PM")
        a = _make_app(db, c, j, stage="待入职")
        _add_event(db, a, EventType.OFFER_RECORDED.value,
                   occurred_at=_dt(_TODAY - timedelta(days=3)),
                   payload={"onboard_date": _TODAY.isoformat()})

        result = get_today_briefing(db)
        today_items = result["schedule"]["today"]
        onboards = [i for i in today_items if i["application_id"] == a.id]
        assert len(onboards) == 1
        assert onboards[0]["type"] == "onboard"

    def test_empty_schedule(self, db):
        result = get_today_briefing(db)
        s = result["schedule"]
        assert isinstance(s["today"], list)
        assert isinstance(s["tomorrow"], list)


# ══════════════════════════════════════════════════════════════
# 待办
# ══════════════════════════════════════════════════════════════

class TestTodos:
    def test_unassigned(self, db):
        """候选人无 Application → 待分配"""
        _make_candidate(db, "无流程")
        result = get_today_briefing(db)
        groups = {g["type"]: g for g in result["todos"]}
        assert "unassigned" in groups
        assert any(i["candidate_name"] == "无流程" for i in groups["unassigned"]["items"])

    def test_screening(self, db):
        """Application 在简历筛选阶段 → 待筛选"""
        c = _make_candidate(db, "待筛")
        j = _make_job(db)
        _make_app(db, c, j, stage="简历筛选")

        result = get_today_briefing(db)
        groups = {g["type"]: g for g in result["todos"]}
        assert "screening" in groups

    def test_feedback_pending(self, db):
        """面试时间已过、未写面评 → 待面评"""
        c = _make_candidate(db, "待评")
        j = _make_job(db)
        a = _make_app(db, c, j, stage="面试")
        _add_event(db, a, EventType.INTERVIEW_SCHEDULED.value,
                   occurred_at=_dt(_YESTERDAY - timedelta(days=1)),
                   payload={"scheduled_at": _dt(_YESTERDAY).isoformat(),
                            "interview_round": 1})

        result = get_today_briefing(db)
        groups = {g["type"]: g for g in result["todos"]}
        assert "feedback" in groups
        item = [i for i in groups["feedback"]["items"] if i["application_id"] == a.id]
        assert len(item) == 1
        assert "面试于" in item[0]["time_label"]

    def test_arrange(self, db):
        """面评通过、未安排下一步 → 待安排"""
        c = _make_candidate(db, "待排")
        j = _make_job(db)
        a = _make_app(db, c, j, stage="面试")
        sched = _add_event(db, a, EventType.INTERVIEW_SCHEDULED.value,
                           occurred_at=_dt(_TODAY - timedelta(days=3)),
                           payload={"scheduled_at": _dt(_TODAY - timedelta(days=2)).isoformat(),
                                    "interview_round": 1})
        _add_event(db, a, EventType.INTERVIEW_FEEDBACK.value,
                   occurred_at=_dt(_TODAY - timedelta(days=1)),
                   payload={"result": "pass", "score": 4})

        result = get_today_briefing(db)
        groups = {g["type"]: g for g in result["todos"]}
        assert "arrange" in groups

    def test_background_check_pending(self, db):
        """在背调阶段、未记录结果 → 待记录背调"""
        c = _make_candidate(db, "待调")
        j = _make_job(db)
        a = _make_app(db, c, j, stage="背调")
        _add_event(db, a, EventType.START_BACKGROUND_CHECK.value,
                   occurred_at=_dt(_TODAY - timedelta(days=3)))

        result = get_today_briefing(db)
        groups = {g["type"]: g for g in result["todos"]}
        assert "background" in groups

    def test_offer_pending(self, db):
        """背调通过、未录 Offer → 待发 Offer"""
        c = _make_candidate(db, "待Offer")
        j = _make_job(db)
        a = _make_app(db, c, j, stage="背调")
        _add_event(db, a, EventType.START_BACKGROUND_CHECK.value,
                   occurred_at=_dt(_TODAY - timedelta(days=5)))
        _add_event(db, a, EventType.BACKGROUND_CHECK_RESULT.value,
                   occurred_at=_dt(_TODAY - timedelta(days=2)),
                   payload={"result": "pass"})

        result = get_today_briefing(db)
        groups = {g["type"]: g for g in result["todos"]}
        assert "offer" in groups

    def test_onboard_confirm(self, db):
        """入职日期已过、未确认 → 待确认入职"""
        c = _make_candidate(db, "待确认")
        j = _make_job(db)
        a = _make_app(db, c, j, stage="待入职")
        _add_event(db, a, EventType.OFFER_RECORDED.value,
                   occurred_at=_dt(_TODAY - timedelta(days=5)),
                   payload={"onboard_date": _YESTERDAY.isoformat()})

        result = get_today_briefing(db)
        groups = {g["type"]: g for g in result["todos"]}
        assert "onboard" in groups

    def test_empty_todos(self, db):
        result = get_today_briefing(db)
        assert isinstance(result["todos"], list)


# ══════════════════════════════════════════════════════════════
# 关注
# ══════════════════════════════════════════════════════════════

class TestFocus:
    def test_no_candidates(self, db):
        """open 岗位 > 7 天、无候选人 → 无候选人信号"""
        _make_job(db, "空岗", status="open",
                  headcount=2, priority="high")
        # 把 created_at 改到 10 天前
        db.execute(
            Job.__table__.update()
            .where(Job.title == "空岗")
            .values(created_at=_dt(_TODAY - timedelta(days=10)))
        )
        db.flush()

        result = get_today_briefing(db)
        job_focus = [f for f in result["focus"]
                     if f["entity"] == "job" and f["job_title"] == "空岗"]
        assert len(job_focus) == 1
        assert "无候选人" in job_focus[0]["signals"]

    def test_deadline_near(self, db):
        """目标到岗日 ≤ 14 天、headcount 未满 → deadline 信号"""
        _make_job(db, "急岗", status="open",
                  headcount=2, target_onboard_date=_TODAY + timedelta(days=7))

        result = get_today_briefing(db)
        job_focus = [f for f in result["focus"]
                     if f["entity"] == "job" and f["job_title"] == "急岗"]
        assert len(job_focus) == 1
        assert any("deadline" in s for s in job_focus[0]["signals"])

    def test_filled_job(self, db):
        """入职人数 = headcount、仍 open → 招满待关闭"""
        j = _make_job(db, "满岗", status="open", headcount=1)
        c = _make_candidate(db, "已入职")
        a = Application(candidate_id=c.id, job_id=j.id,
                        state=ApplicationState.HIRED.value, stage="已入职")
        db.add(a)
        db.flush()
        _add_event(db, a, EventType.APPLICATION_CREATED.value,
                   occurred_at=_dt(_TODAY - timedelta(days=10)))

        result = get_today_briefing(db)
        job_focus = [f for f in result["focus"]
                     if f["entity"] == "job" and f["job_title"] == "满岗"]
        assert len(job_focus) == 1
        assert "已满，是否关闭？" in job_focus[0]["signals"]

    def test_no_contact(self, db):
        """Offer沟通阶段、最近 Event > 7 天 → 久未联系"""
        c = _make_candidate(db, "失联")
        j = _make_job(db)
        a = _make_app(db, c, j, stage="Offer沟通")
        # 把唯一事件（application_created）时间改到 10 天前
        for ev in db.query(Event).filter(Event.application_id == a.id).all():
            ev.occurred_at = _dt(_TODAY - timedelta(days=10))
        db.flush()

        result = get_today_briefing(db)
        cand_focus = [f for f in result["focus"]
                      if f["entity"] == "candidate" and f["application_id"] == a.id]
        assert len(cand_focus) == 1
        assert any("天未联系" in s for s in cand_focus[0]["signals"])

    def test_empty_front_pipeline(self, db):
        """前段管道空、后段有人 → 前段管道已空"""
        j = _make_job(db, "前空岗", status="open")
        c = _make_candidate(db, "后段")
        _make_app(db, c, j, stage="Offer沟通")

        result = get_today_briefing(db)
        job_focus = [f for f in result["focus"]
                     if f["entity"] == "job" and f["job_title"] == "前空岗"]
        assert len(job_focus) == 1
        assert "前段管道已空" in job_focus[0]["signals"]


# ══════════════════════════════════════════════════════════════
# 去重
# ══════════════════════════════════════════════════════════════

class TestDedup:
    def test_today_interview_not_in_todos(self, db):
        """面试当天 → 只在日程，不在待办"""
        c = _make_candidate(db, "去重面")
        j = _make_job(db)
        a = _make_app(db, c, j, stage="面试")
        _add_event(db, a, EventType.INTERVIEW_SCHEDULED.value,
                   occurred_at=_dt(_TODAY - timedelta(days=1)),
                   payload={"scheduled_at": _dt(_TODAY, 15).isoformat(),
                            "interview_round": 1})

        result = get_today_briefing(db)
        # 在日程中
        assert any(i["application_id"] == a.id for i in result["schedule"]["today"])
        # 不在待办中
        for g in result["todos"]:
            for item in g["items"]:
                assert item.get("application_id") != a.id

    def test_today_onboard_not_in_todos(self, db):
        """入职当天 → 只在日程，不在待办"""
        c = _make_candidate(db, "去重入")
        j = _make_job(db)
        a = _make_app(db, c, j, stage="待入职")
        _add_event(db, a, EventType.OFFER_RECORDED.value,
                   occurred_at=_dt(_TODAY - timedelta(days=3)),
                   payload={"onboard_date": _TODAY.isoformat()})

        result = get_today_briefing(db)
        assert any(i["application_id"] == a.id for i in result["schedule"]["today"])
        for g in result["todos"]:
            for item in g["items"]:
                assert item.get("application_id") != a.id

    def test_todo_not_in_focus(self, db):
        """Application 在待办 → 不在关注"""
        c = _make_candidate(db, "互斥")
        j = _make_job(db)
        a = _make_app(db, c, j, stage="Offer沟通")
        # Offer沟通 但无 offer_recorded → 不在待办（不符合任何 7 种）
        # 改成待入职 + 入职日期已过 → 在待办
        a.stage = "待入职"
        _add_event(db, a, EventType.OFFER_RECORDED.value,
                   occurred_at=_dt(_TODAY - timedelta(days=10)),
                   payload={"onboard_date": (_TODAY - timedelta(days=3)).isoformat()})
        db.flush()

        result = get_today_briefing(db)
        # 在待办
        todo_ids = set()
        for g in result["todos"]:
            for item in g["items"]:
                if "application_id" in item:
                    todo_ids.add(item["application_id"])
        assert a.id in todo_ids
        # 不在关注
        focus_ids = {f.get("application_id") for f in result["focus"]}
        assert a.id not in focus_ids
