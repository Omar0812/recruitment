"""
迁移脚本：为所有无 resume_review 活动的 CandidateJobLink 补创建 resume_review 活动。

运行方式：
  cd /Users/a0000/Desktop/vibe/recruitment
  python3 scripts/migrate_resume_review.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import CandidateJobLink, ActivityRecord


def migrate():
    db = SessionLocal()
    try:
        links = db.query(CandidateJobLink).all()
        created = 0
        for lnk in links:
            has_rr = db.query(ActivityRecord).filter(
                ActivityRecord.link_id == lnk.id,
                ActivityRecord.type == "resume_review",
            ).first()
            if has_rr:
                continue
            rr = ActivityRecord(
                link_id=lnk.id,
                type="resume_review",
                stage="简历筛选",
                status="completed",
                conclusion="通过",
                created_at=lnk.created_at,
            )
            db.add(rr)
            created += 1

        db.commit()
        print(f"迁移完成：为 {created} 个 link 补创建了 resume_review 活动")
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
