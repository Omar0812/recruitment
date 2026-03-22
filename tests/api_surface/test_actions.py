"""测试 actions 端点：execute / catalog / available。"""
import uuid

import pytest


def _uid():
    return str(uuid.uuid4())


def test_catalog_returns_all_actions(client):
    r = client.get("/api/v1/actions/catalog")
    assert r.status_code == 200
    items = r.json()
    codes = [i["action_code"] for i in items]
    assert "create_application" in codes
    assert "pass_screening" in codes
    assert "add_note" in codes


def test_execute_success(client, seed):
    app = seed["application"]
    r = client.post("/api/v1/actions/execute", json={
        "command_id": _uid(),
        "action_code": "pass_screening",
        "target": {"type": "application", "id": app.id},
        "payload": {},
        "actor": {"type": "human"},
    })
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["action_code"] == "pass_screening"


def test_execute_non_application_success(client, db, seed):
    from app.models.legacy import Candidate

    candidate = seed["candidate"]
    response = client.post("/api/v1/actions/execute", json={
        "command_id": _uid(),
        "action_code": "update_candidate",
        "target": {"type": "candidate", "id": candidate.id},
        "payload": {"notes": "更新备注"},
        "actor": {"type": "human"},
    })

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["action_code"] == "update_candidate"
    assert body["target_type"] == "candidate"
    assert body["target_id"] == candidate.id

    updated_candidate = db.get(Candidate, candidate.id)
    assert updated_candidate is not None
    assert updated_candidate.notes == "更新备注"


def test_execute_candidate_create_application_creates_real_application(client, db):
    from app.models.enums import ApplicationState
    from app.models.legacy import Candidate, Job
    from app.models.application import Application

    candidate = Candidate(name="待建流程候选人")
    job = Job(title="后端工程师")
    db.add_all([candidate, job])
    db.commit()

    response = client.post("/api/v1/actions/execute", json={
        "command_id": _uid(),
        "action_code": "create_application",
        "target": {"type": "candidate", "id": candidate.id},
        "payload": {"job_id": job.id},
        "actor": {"type": "human"},
    })

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["action_code"] == "create_application"
    assert body["target_type"] == "application"

    application = (
        db.query(Application)
        .filter(
            Application.candidate_id == candidate.id,
            Application.job_id == job.id,
        )
        .one()
    )
    assert application.state == ApplicationState.IN_PROGRESS.value
    assert application.stage == "简历筛选"


def test_execute_candidate_blacklist_persists_fields(client, db, seed):
    candidate = seed["candidate"]

    response = client.post("/api/v1/actions/execute", json={
        "command_id": _uid(),
        "action_code": "blacklist_candidate",
        "target": {"type": "candidate", "id": candidate.id},
        "payload": {
            "reason": "背调不通过",
            "note": "学历造假",
        },
        "actor": {"type": "human"},
    })

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["action_code"] == "blacklist_candidate"

    db.refresh(candidate)
    assert candidate.blacklisted is True
    assert candidate.blacklist_reason == "背调不通过"
    assert candidate.blacklist_note == "学历造假"


def test_execute_candidate_unblacklist_clears_fields(client, db, seed):
    candidate = seed["candidate"]

    # 先拉黑
    client.post("/api/v1/actions/execute", json={
        "command_id": _uid(),
        "action_code": "blacklist_candidate",
        "target": {"type": "candidate", "id": candidate.id},
        "payload": {"reason": "背调不通过", "note": "学历造假"},
        "actor": {"type": "human"},
    })
    db.refresh(candidate)
    assert candidate.blacklisted is True

    # 解除黑名单
    response = client.post("/api/v1/actions/execute", json={
        "command_id": _uid(),
        "action_code": "unblacklist_candidate",
        "target": {"type": "candidate", "id": candidate.id},
        "payload": {},
        "actor": {"type": "human"},
    })

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["action_code"] == "unblacklist_candidate"

    db.refresh(candidate)
    assert candidate.blacklisted is False
    assert candidate.blacklist_reason is None
    assert candidate.blacklist_note is None


def test_execute_candidate_blacklist_idempotent_replay(client, db, seed):
    candidate = seed["candidate"]
    command_id = _uid()

    first = client.post("/api/v1/actions/execute", json={
        "command_id": command_id,
        "action_code": "blacklist_candidate",
        "target": {"type": "candidate", "id": candidate.id},
        "payload": {
            "reason": "态度问题",
            "note": "第一次写入",
        },
        "actor": {"type": "human"},
    })
    assert first.status_code == 200

    second = client.post("/api/v1/actions/execute", json={
        "command_id": command_id,
        "action_code": "blacklist_candidate",
        "target": {"type": "candidate", "id": candidate.id},
        "payload": {
            "reason": "简历造假",
            "note": "第二次请求不应覆盖",
        },
        "actor": {"type": "human"},
    })
    assert second.status_code == 200
    assert first.json()["command_id"] == second.json()["command_id"]

    db.refresh(candidate)
    assert candidate.blacklisted is True
    assert candidate.blacklist_reason == "态度问题"
    assert candidate.blacklist_note == "第一次写入"


def test_execute_idempotent(client, seed):
    app = seed["application"]
    cid = _uid()
    r1 = client.post("/api/v1/actions/execute", json={
        "command_id": cid,
        "action_code": "add_note",
        "target": {"type": "application", "id": app.id},
        "payload": {"body": "test note"},
        "actor": {"type": "human"},
    })
    assert r1.status_code == 200
    r2 = client.post("/api/v1/actions/execute", json={
        "command_id": cid,
        "action_code": "add_note",
        "target": {"type": "application", "id": app.id},
        "payload": {"body": "test note"},
        "actor": {"type": "human"},
    })
    assert r2.status_code == 200
    assert r1.json()["command_id"] == r2.json()["command_id"]


def test_execute_business_error(client, seed):
    app = seed["application"]
    r = client.post("/api/v1/actions/execute", json={
        "command_id": _uid(),
        "action_code": "confirm_hire",
        "target": {"type": "application", "id": app.id},
        "payload": {},
        "actor": {"type": "human"},
    })
    assert r.status_code == 422
    body = r.json()
    assert "code" in body


def test_execute_not_found(client):
    r = client.post("/api/v1/actions/execute", json={
        "command_id": _uid(),
        "action_code": "add_note",
        "target": {"type": "application", "id": 99999},
        "payload": {},
        "actor": {"type": "human"},
    })
    assert r.status_code == 404


@pytest.mark.parametrize(
    ("body_overrides", "message_fragment"),
    [
        ({"target": {"type": "resume", "id": 1}}, "target.type"),
        ({"command_id": "not-a-uuid"}, "command_id"),
    ],
)
def test_execute_rejects_invalid_request_shape(client, seed, body_overrides, message_fragment):
    app = seed["application"]
    body = {
        "command_id": _uid(),
        "action_code": "add_note",
        "target": {"type": "application", "id": app.id},
        "payload": {"body": "test note"},
        "actor": {"type": "human"},
    }
    body.update(body_overrides)

    response = client.post("/api/v1/actions/execute", json=body)

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"
    assert message_fragment in response.json()["message"]


def test_available_actions(client, seed):
    app = seed["application"]
    r = client.get(
        "/api/v1/actions/available",
        params={"target_type": "application", "target_id": app.id},
    )
    assert r.status_code == 200
    codes = [i["action_code"] for i in r.json()]
    # add_note always available
    assert "add_note" in codes
