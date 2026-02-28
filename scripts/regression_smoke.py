#!/usr/bin/env python3
"""
Run a lightweight regression suite against an isolated temp workspace.

Usage:
  .venv/bin/python scripts/regression_smoke.py
"""

from __future__ import annotations

import os
import sys
import tempfile
from datetime import datetime
from pathlib import Path


def prepare_temp_workspace(temp_dir: str) -> None:
    os.chdir(temp_dir)
    Path("data").mkdir(parents=True, exist_ok=True)
    Path("static/dist/assets").mkdir(parents=True, exist_ok=True)
    Path("static/dist/index.html").write_text("<html>ok</html>", encoding="utf-8")


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    config_path = repo_root / "config.json"
    config_backup = config_path.read_bytes() if config_path.exists() else None

    try:
        sys.path.insert(0, str(repo_root))
        with tempfile.TemporaryDirectory() as temp_dir:
            prepare_temp_workspace(temp_dir)

            from fastapi.testclient import TestClient
            from app.server import app
            from app.database import SessionLocal
            from app.models import Candidate

            client = TestClient(app)
            failures: list[str] = []

            def check(name: str, ok: bool, detail: str = "") -> None:
                if ok:
                    print(f"[PASS] {name}")
                else:
                    msg = f"[FAIL] {name}"
                    if detail:
                        msg += f" :: {detail}"
                    print(msg)
                    failures.append(msg)

            # 1) Unknown API routes should return 404 (not SPA fallback 200)
            unknown_api = client.get("/api/not-exist")
            check("Unknown API returns 404", unknown_api.status_code == 404, f"status={unknown_api.status_code}")

            # 2) AI settings API compatibility: api_base alias
            updated = client.patch("/api/settings/ai", json={"api_base": "https://api.example.com/v1", "model": "demo-model"})
            check("PATCH /api/settings/ai accepts api_base", updated.status_code == 200, str(updated.status_code))
            ai_cfg = client.get("/api/settings/ai")
            ai_data = ai_cfg.json() if ai_cfg.status_code == 200 else {}
            check(
                "GET /api/settings/ai returns base_url/api_base",
                ai_data.get("base_url") == ai_data.get("api_base") == "https://api.example.com/v1",
                str(ai_data),
            )

            # 3) Upload filename traversal should be neutralized
            upload = client.post(
                "/api/resume/upload",
                files={"file": ("../../../../escape.pdf", b"%PDF-1.4 fake", "application/pdf")},
            )
            if upload.status_code == 200:
                saved_path = Path(upload.json()["resume_path"]).resolve()
                expected_root = (Path(temp_dir) / "data" / "resumes").resolve()
                inside_resume_root = str(saved_path).startswith(str(expected_root))
            else:
                inside_resume_root = False
            check("Resume upload path traversal blocked", upload.status_code == 200 and inside_resume_root, upload.text[:120])

            # 4) keep_records should change transfer behavior
            supplier = client.post("/api/suppliers", json={"name": "供应商A", "fee_rate": "15"}).json()
            job = client.post("/api/jobs", json={"title": "后端工程师"}).json()
            candidate = client.post("/api/candidates", json={"name": "张三", "supplier_id": supplier["id"]}).json()
            link = client.post("/api/pipeline/link", json={"candidate_id": candidate["id"], "job_id": job["id"]}).json()

            # complete initial resume_review
            records = client.get("/api/activities", params={"link_id": link["id"]}).json()
            resume_review_id = records[-1]["id"]
            client.patch(f"/api/activities/{resume_review_id}", json={"status": "completed", "conclusion": "通过"})
            client.post(
                "/api/activities",
                json={"link_id": link["id"], "type": "interview", "round": "一面", "status": "completed", "conclusion": "通过"},
            )

            next_job_keep = client.post("/api/jobs", json={"title": "数据工程师A"}).json()
            next_job_no_keep = client.post("/api/jobs", json={"title": "数据工程师B"}).json()

            transfer_keep = client.patch(
                f"/api/pipeline/link/{link['id']}/transfer",
                json={"new_job_id": next_job_keep["id"], "keep_records": True},
            )
            check("Transfer keep_records=True succeeds", transfer_keep.status_code == 200, str(transfer_keep.status_code))
            keep_link_id = transfer_keep.json().get("id") if transfer_keep.status_code == 200 else None
            keep_activities = client.get("/api/activities", params={"link_id": keep_link_id}).json() if keep_link_id else []

            # relink once more for no_keep flow
            client.patch(f"/api/pipeline/link/{keep_link_id}/withdraw", json={"reason": "测试"})
            relink = client.post("/api/pipeline/link", json={"candidate_id": candidate["id"], "job_id": job["id"]}).json()
            relink_records = client.get("/api/activities", params={"link_id": relink["id"]}).json()
            relink_resume_review_id = relink_records[-1]["id"]
            client.patch(f"/api/activities/{relink_resume_review_id}", json={"status": "completed", "conclusion": "通过"})
            client.post(
                "/api/activities",
                json={"link_id": relink["id"], "type": "interview", "round": "二面", "status": "completed", "conclusion": "通过"},
            )

            transfer_no_keep = client.patch(
                f"/api/pipeline/link/{relink['id']}/transfer",
                json={"new_job_id": next_job_no_keep["id"], "keep_records": False},
            )
            check("Transfer keep_records=False succeeds", transfer_no_keep.status_code == 200, str(transfer_no_keep.status_code))
            no_keep_link_id = transfer_no_keep.json().get("id") if transfer_no_keep.status_code == 200 else None
            no_keep_activities = client.get("/api/activities", params={"link_id": no_keep_link_id}).json() if no_keep_link_id else []

            check(
                "keep_records changes copied activities",
                len(keep_activities) > len(no_keep_activities),
                f"keep={len(keep_activities)} no_keep={len(no_keep_activities)}",
            )

            # 5) Interview conclusion=淘汰 should atomically set pipeline outcome
            reject_cand = client.post("/api/candidates", json={"name": "李四"}).json()
            reject_link = client.post(
                "/api/pipeline/link",
                json={"candidate_id": reject_cand["id"], "job_id": job["id"]},
            ).json()
            reject_records = client.get("/api/activities", params={"link_id": reject_link["id"]}).json()
            reject_rr_id = reject_records[-1]["id"]
            client.patch(f"/api/activities/{reject_rr_id}", json={"status": "completed", "conclusion": "通过"})
            reject_iv = client.post(
                "/api/activities",
                json={
                    "link_id": reject_link["id"],
                    "type": "interview",
                    "round": "一面",
                    "conclusion": "淘汰",
                    "rejection_reason": "技术能力不达标",
                    "status": "completed",
                },
            )
            reject_ok = reject_iv.status_code == 200
            reject_active = client.get("/api/pipeline/active").json()
            still_active = any(x.get("id") == reject_link["id"] for x in reject_active) if isinstance(reject_active, list) else False
            check(
                "Interview reject auto-updates pipeline outcome",
                reject_ok and not still_active,
                f"status={reject_iv.status_code} still_active={still_active}",
            )

            # 6) Job list/detail active_count should remain consistent when candidate soft-deleted
            db = SessionLocal()
            cand_obj = db.query(Candidate).filter(Candidate.id == candidate["id"]).first()
            cand_obj.deleted_at = datetime.utcnow()
            db.commit()
            db.close()

            jobs = client.get("/api/jobs").json()
            job_detail = client.get(f"/api/jobs/{job['id']}").json()
            list_count = jobs[0]["active_count"] if jobs else -1
            detail_count = job_detail.get("active_count", -1)
            check("Job list/detail active_count consistency", list_count == detail_count, f"list={list_count}, detail={detail_count}")

            if failures:
                print(f"\nRegression failed ({len(failures)}):")
                for item in failures:
                    print(f"  - {item}")
                return 1

            print("\nRegression passed")
            return 0
    finally:
        if config_backup is None:
            if config_path.exists():
                config_path.unlink()
        else:
            config_path.write_bytes(config_backup)


if __name__ == "__main__":
    raise SystemExit(main())
