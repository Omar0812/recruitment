"""人才库 API 测试 — 筛选参数 + 星标切换。"""
import uuid

from app.models.enums import ApplicationState
from app.models.legacy import Candidate, Job
from app.models.application import Application


def _uid():
    return str(uuid.uuid4())


# ── 基础列表 ──────────────────────────────────────


def test_list_includes_latest_application(client, seed):
    """列表响应包含 latest_application 字段。"""
    r = client.get("/api/v1/candidates")
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) >= 1
    found = [i for i in items if i["id"] == seed["candidate"].id]
    assert len(found) == 1
    la = found[0]["latest_application"]
    assert la is not None
    assert la["state"] == "IN_PROGRESS"
    assert la["job_title"] == "Engineer"
    assert la["status_changed_at"] is not None


def test_list_no_application_candidate(client, db):
    """无流程候选人 latest_application 为 null。"""
    c = Candidate(name="无流程李四", phone="13900001111")
    db.add(c)
    db.flush()
    r = client.get("/api/v1/candidates", params={"search": "无流程李四"})
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) == 1
    assert items[0]["latest_application"] is None


# ── 筛选测试 ──────────────────────────────────────


def test_filter_by_education(client, db):
    c = Candidate(name="学历测试", education="硕士")
    db.add(c)
    db.flush()
    r = client.get("/api/v1/candidates", params={"education": "硕士"})
    items = r.json()["items"]
    assert all(i["education"] == "硕士" for i in items)
    assert any(i["name"] == "学历测试" for i in items)


def test_filter_by_skill_tags(client, db):
    c = Candidate(name="技能测试", skill_tags=["Python", "Go", "Vue"])
    db.add(c)
    db.flush()
    # 单标签
    r = client.get("/api/v1/candidates", params={"tags": "Python"})
    assert any(i["name"] == "技能测试" for i in r.json()["items"])
    # 多标签 AND
    r = client.get("/api/v1/candidates", params={"tags": "Python,Go"})
    assert any(i["name"] == "技能测试" for i in r.json()["items"])
    # 不匹配
    r = client.get("/api/v1/candidates", params={"tags": "Java"})
    assert not any(i["name"] == "技能测试" for i in r.json()["items"])


def test_filter_by_years_exp(client, db):
    c = Candidate(name="年限测试", years_exp=5.0)
    db.add(c)
    db.flush()
    r = client.get("/api/v1/candidates", params={"years_exp_min": 3, "years_exp_max": 7})
    assert any(i["name"] == "年限测试" for i in r.json()["items"])
    r = client.get("/api/v1/candidates", params={"years_exp_min": 8})
    assert not any(i["name"] == "年限测试" for i in r.json()["items"])


def test_filter_by_age(client, db):
    c = Candidate(name="年龄测试", age=28)
    db.add(c)
    db.flush()
    r = client.get("/api/v1/candidates", params={"age_min": 25, "age_max": 30})
    assert any(i["name"] == "年龄测试" for i in r.json()["items"])
    r = client.get("/api/v1/candidates", params={"age_min": 35})
    assert not any(i["name"] == "年龄测试" for i in r.json()["items"])


def test_filter_by_source(client, db):
    c = Candidate(name="来源测试", source="猎聘")
    db.add(c)
    db.flush()
    r = client.get("/api/v1/candidates", params={"source": "猎聘"})
    assert any(i["name"] == "来源测试" for i in r.json()["items"])


def test_filter_by_multiple_sources(client, db):
    first = Candidate(name="来源一", source="猎聘")
    second = Candidate(name="来源二", source="Boss直聘")
    third = Candidate(name="来源三", source="内推")
    db.add_all([first, second, third])
    db.flush()

    response = client.get(
        "/api/v1/candidates",
        params=[("source", "猎聘"), ("source", "Boss直聘")],
    )

    names = [item["name"] for item in response.json()["items"]]
    assert "来源一" in names
    assert "来源二" in names
    assert "来源三" not in names


def test_filter_by_starred(client, db):
    c = Candidate(name="星标测试", starred=1)
    db.add(c)
    db.flush()
    r = client.get("/api/v1/candidates", params={"starred": True})
    assert any(i["name"] == "星标测试" for i in r.json()["items"])


def test_filter_by_blacklist_only(client, db):
    c = Candidate(name="黑名单测试", blacklisted=True, blacklist_reason="简历造假")
    db.add(c)
    db.flush()
    r = client.get("/api/v1/candidates", params={"blacklist": "only"})
    assert any(i["name"] == "黑名单测试" for i in r.json()["items"])


def test_filter_by_blacklist_exclude(client, db):
    c = Candidate(name="排除黑名单测试", blacklisted=True)
    db.add(c)
    db.flush()
    r = client.get("/api/v1/candidates", params={"blacklist": "exclude"})
    assert not any(i["name"] == "排除黑名单测试" for i in r.json()["items"])


def test_filter_pipeline_none(client, db):
    c = Candidate(name="无流程筛选")
    db.add(c)
    db.flush()
    r = client.get("/api/v1/candidates", params={"pipeline_status": "none"})
    assert any(i["name"] == "无流程筛选" for i in r.json()["items"])


def test_filter_pipeline_in_progress(client, seed):
    r = client.get("/api/v1/candidates", params={"pipeline_status": "in_progress"})
    # seed 里张三有 IN_PROGRESS application
    assert any(i["name"] == "张三" for i in r.json()["items"])


def test_filter_pipeline_ended(client, db):
    c = Candidate(name="已结束筛选")
    j = Job(title="测试岗")
    db.add_all([c, j])
    db.flush()
    a = Application(
        candidate_id=c.id, job_id=j.id,
        state=ApplicationState.REJECTED.value,
        outcome="rejected",
    )
    db.add(a)
    db.flush()
    r = client.get("/api/v1/candidates", params={"pipeline_status": "ended"})
    assert any(i["name"] == "已结束筛选" for i in r.json()["items"])


def test_search_by_phone(client, db):
    c = Candidate(name="手机搜索", phone="13812345678")
    db.add(c)
    db.flush()
    r = client.get("/api/v1/candidates", params={"search": "13812345678"})
    assert any(i["name"] == "手机搜索" for i in r.json()["items"])


def test_search_by_email(client, db):
    c = Candidate(name="邮箱搜索", email="test@example.com")
    db.add(c)
    db.flush()
    r = client.get("/api/v1/candidates", params={"search": "test@example"})
    assert any(i["name"] == "邮箱搜索" for i in r.json()["items"])


# ── 星标切换 ──────────────────────────────────────


def test_star_toggle_on(client, db):
    c = Candidate(name="星标切换", starred=0)
    db.add(c)
    db.flush()
    r = client.patch(f"/api/v1/candidates/{c.id}/star")
    assert r.status_code == 200
    assert r.json()["starred"] is True


def test_star_toggle_off(client, db):
    c = Candidate(name="取消星标", starred=1)
    db.add(c)
    db.flush()
    r = client.patch(f"/api/v1/candidates/{c.id}/star")
    assert r.status_code == 200
    assert r.json()["starred"] is False


def test_star_toggle_idempotent(client, db):
    c = Candidate(name="双击星标", starred=0)
    db.add(c)
    db.flush()
    client.patch(f"/api/v1/candidates/{c.id}/star")
    r = client.patch(f"/api/v1/candidates/{c.id}/star")
    assert r.json()["starred"] is False


def test_star_404(client):
    r = client.patch("/api/v1/candidates/99999/star")
    assert r.status_code == 404


# ── 组合筛选 ──────────────────────────────────────


def test_combined_filters(client, db):
    c = Candidate(name="组合测试", education="本科", years_exp=3.0, age=27, starred=1)
    db.add(c)
    db.flush()
    r = client.get("/api/v1/candidates", params={
        "education": "本科",
        "years_exp_min": 2,
        "years_exp_max": 5,
        "age_min": 25,
        "age_max": 30,
        "starred": True,
    })
    assert any(i["name"] == "组合测试" for i in r.json()["items"])
