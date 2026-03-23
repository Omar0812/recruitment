"""测试资源 GET 端点 + 分页。"""
from app.models.action_receipt import ActionReceipt
from app.models.legacy import Candidate
from app.models.term import Term
from app.models.enums import TermType


def test_candidates_list(client, seed):
    r = client.get("/api/v1/candidates")
    assert r.status_code == 200
    body = r.json()
    assert "items" in body
    assert body["total"] >= 1
    assert body["page"] == 1


def test_candidates_list_supports_repeated_source_filters(client, db):
    db.add_all([
        Candidate(name="来源候选人A", source="猎聘"),
        Candidate(name="来源候选人B", source="Boss直聘"),
        Candidate(name="来源候选人C", source="内推"),
    ])
    db.flush()

    response = client.get(
        "/api/v1/candidates",
        params=[("source", "猎聘"), ("source", "Boss直聘")],
    )

    assert response.status_code == 200
    names = [item["name"] for item in response.json()["items"]]
    assert "来源候选人A" in names
    assert "来源候选人B" in names
    assert "来源候选人C" not in names


def test_candidates_detail(client, seed):
    c = seed["candidate"]
    r = client.get(f"/api/v1/candidates/{c.id}")
    assert r.status_code == 200
    assert r.json()["name"] == "张三"


def test_candidates_detail_returns_structured_json_fields(client, db):
    candidate = Candidate(
        name="结构化候选人",
        skill_tags=["Python", "Go"],
        education_list=[{"school": "清华大学", "degree": "本科", "major": "计算机"}],
        work_experience=[
            {
                "company": "字节跳动",
                "title": "后端工程师",
                "start": "2021-06",
                "end": "2025-02",
                "description": "负责核心服务",
            }
        ],
        project_experience=[
            {
                "name": "招聘平台重构",
                "role": "主程",
                "start": "2024-01",
                "end": "2024-12",
                "tech_stack": "Vue 3, FastAPI",
                "description": "主导系统重构",
            }
        ],
    )
    db.add(candidate)
    db.flush()

    response = client.get(f"/api/v1/candidates/{candidate.id}")

    assert response.status_code == 200
    body = response.json()
    assert body["skill_tags"] == ["Python", "Go"]
    assert body["education_list"] == [
        {"school": "清华大学", "degree": "本科", "major": "计算机", "start": None, "end": None}
    ]
    assert body["work_experience"] == [
        {
            "company": "字节跳动",
            "title": "后端工程师",
            "start": "2021-06",
            "end": "2025-02",
            "description": "负责核心服务",
        }
    ]
    assert body["project_experience"] == [
        {
            "name": "招聘平台重构",
            "role": "主程",
            "start": "2024-01",
            "end": "2024-12",
            "description": "主导系统重构",
        }
    ]


def test_candidates_detail_normalizes_null_json_fields(client, db):
    candidate = Candidate(
        name="空数组归一化",
        skill_tags=None,
        education_list=None,
        work_experience=None,
        project_experience=None,
    )
    db.add(candidate)
    db.flush()

    response = client.get(f"/api/v1/candidates/{candidate.id}")

    assert response.status_code == 200
    body = response.json()
    assert body["skill_tags"] == []
    assert body["education_list"] == []
    assert body["work_experience"] == []
    assert body["project_experience"] == []


def test_create_candidate_persists_record_and_receipt(client, db):
    response = client.post("/api/v1/candidates", json={
        "name": "李四",
        "phone": "13900139000",
        "email": "li@test.com",
        "source": "BOSS直聘",
        "project_experience": [
            {
                "name": "ATS 重构",
                "role": "负责人",
                "tech_stack": "Vue 3, FastAPI",
            }
        ],
    })

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "李四"
    assert body["project_experience"] == [
        {
            "name": "ATS 重构",
            "role": "负责人",
            "start": None,
            "end": None,
            "description": None,
        }
    ]

    candidate = db.get(Candidate, body["id"])
    assert candidate is not None
    assert candidate.email == "li@test.com"

    receipt = (
        db.query(ActionReceipt)
        .filter_by(action_code="create_candidate", target_type="candidate", target_id=body["id"], ok=True)
        .first()
    )
    assert receipt is not None


def test_update_candidate_persists_record_and_receipt(client, db, seed):
    candidate = seed["candidate"]

    response = client.put(f"/api/v1/candidates/{candidate.id}", json={
        "name": "张三-更新",
        "phone": "13800138001",
        "source": "拉勾",
        "version": candidate.version,
        "project_experience": [
            {
                "name": "招聘中台",
                "role": "主程",
                "description": "升级流程配置",
            }
        ],
    })

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "张三-更新"
    assert body["phone"] == "13800138001"
    assert body["source"] == "拉勾"

    db.refresh(candidate)
    assert candidate.name == "张三-更新"
    assert candidate.project_experience == [
        {
            "name": "招聘中台",
            "role": "主程",
            "description": "升级流程配置",
        }
    ]

    receipt = (
        db.query(ActionReceipt)
        .filter_by(action_code="update_candidate", target_type="candidate", target_id=candidate.id, ok=True)
        .first()
    )
    assert receipt is not None


def test_candidates_not_found(client):
    r = client.get("/api/v1/candidates/99999")
    assert r.status_code == 404


def test_jobs_list(client, seed):
    r = client.get("/api/v1/jobs")
    assert r.status_code == 200
    assert r.json()["total"] >= 1


def test_jobs_detail(client, seed):
    j = seed["job"]
    r = client.get(f"/api/v1/jobs/{j.id}")
    assert r.status_code == 200
    assert r.json()["title"] == "Engineer"


def test_applications_list(client, seed):
    r = client.get("/api/v1/applications")
    assert r.status_code == 200
    assert r.json()["total"] >= 1


def test_applications_detail(client, seed):
    a = seed["application"]
    r = client.get(f"/api/v1/applications/{a.id}")
    assert r.status_code == 200
    assert r.json()["state"] == "IN_PROGRESS"


def test_events_list(client, seed):
    a = seed["application"]
    r = client.get("/api/v1/events", params={"application_id": a.id})
    assert r.status_code == 200
    events = r.json()
    assert len(events) >= 1
    assert events[0]["type"] == "application_created"


def test_terms_departments(client, db):
    db.add(Term(type=TermType.DEPARTMENT.value, name="工程部", sort_order=0))
    db.flush()
    r = client.get("/api/v1/departments")
    assert r.status_code == 200
    assert any(t["name"] == "工程部" for t in r.json())


def test_suppliers_list(client, seed):
    r = client.get("/api/v1/suppliers")
    assert r.status_code == 200
    assert "items" in r.json()


def test_expenses_list(client):
    r = client.get("/api/v1/expenses")
    assert r.status_code == 200
    assert "items" in r.json()


def test_pagination_defaults(client, seed):
    r = client.get("/api/v1/candidates")
    body = r.json()
    assert body["page"] == 1
    assert body["page_size"] == 20


def test_pagination_custom(client, seed):
    r = client.get("/api/v1/candidates", params={"page": 1, "page_size": 5})
    body = r.json()
    assert body["page_size"] == 5


def test_check_duplicate(client, seed):
    r = client.post("/api/v1/candidates/check-duplicate", params={"name": "张三"})
    assert r.status_code == 200
    assert len(r.json()["duplicates"]) >= 1


def test_check_duplicate_returns_blocking_match_shape(client, seed):
    candidate = seed["candidate"]
    application = seed["application"]
    job = seed["job"]

    response = client.post("/api/v1/candidates/check-duplicate", json={"name": candidate.name})

    assert response.status_code == 200
    body = response.json()
    assert body["requires_decision"] is True
    assert body["has_blocking_in_progress_match"] is True
    match = next(item for item in body["matches"] if item["candidate_id"] == candidate.id)
    assert match["candidate_id"] == candidate.id
    assert match["display_id"] == f"C-{candidate.id:04d}"
    assert match["active_link"] == {
        "application_id": application.id,
        "job_id": job.id,
        "job_title": job.title,
        "stage": "简历筛选",
    }
    assert "name" in match["match_reasons"]


def test_candidate_write_validation_error_is_normalized(client):
    response = client.post("/api/v1/candidates", json={"phone": "13800138000"})

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"
    assert "body.name" in response.json()["message"]


def test_update_candidate_not_found_returns_normalized_error(client):
    response = client.put("/api/v1/candidates/99999", json={"name": "不存在的人"})

    assert response.status_code == 404
    assert response.json() == {
        "code": "http_404",
        "message": "Candidate not found",
    }
