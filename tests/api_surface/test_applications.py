from __future__ import annotations

from sqlalchemy import text

from app.models.application import Application
from app.models.enums import ApplicationState
from app.models.legacy import Candidate, Job


def test_list_applications_for_job_includes_candidate_name(client, db):
    candidate = Candidate(name="李四")
    job = Job(title="Operations")
    db.add_all([candidate, job])
    db.flush()

    db.add(
        Application(
            candidate_id=candidate.id,
            job_id=job.id,
            state=ApplicationState.IN_PROGRESS.value,
            stage="面试",
        )
    )
    db.commit()

    response = client.get(f"/api/v1/applications?job_id={job.id}")

    assert response.status_code == 200
    item = response.json()["items"][0]
    assert item["candidate_id"] == candidate.id
    assert item["candidate_name"] == "李四"
    assert item["stage"] == "面试"


def test_list_applications_for_job_keeps_candidate_name_key_when_candidate_missing(client, db):
    candidate = Candidate(name="历史候选人")
    job = Job(title="Legacy Job")
    db.add_all([candidate, job])
    db.flush()

    application = Application(
        candidate_id=candidate.id,
        job_id=job.id,
        state=ApplicationState.IN_PROGRESS.value,
        stage="初筛",
    )
    db.add(application)
    db.commit()

    db.execute(text("PRAGMA foreign_keys=OFF"))
    db.execute(
        text("UPDATE applications SET candidate_id = :candidate_id WHERE id = :application_id"),
        {"candidate_id": 999999, "application_id": application.id},
    )
    db.commit()
    db.execute(text("PRAGMA foreign_keys=ON"))
    db.expire_all()

    response = client.get(f"/api/v1/applications?job_id={job.id}")

    assert response.status_code == 200
    item = response.json()["items"][0]
    assert "candidate_name" in item
    assert item["candidate_name"] is None
    assert item["candidate_id"] == 999999
