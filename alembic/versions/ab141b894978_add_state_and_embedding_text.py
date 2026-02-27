"""add_state_and_embedding_text

Revision ID: ab141b894978
Revises: d5f5bd821dff
Create Date: 2026-02-27 12:29:47.022760

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ab141b894978'
down_revision: Union[str, Sequence[str], None] = 'd5f5bd821dff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add state to candidate_job_links
    op.add_column("candidate_job_links", sa.Column("state", sa.String(), nullable=True))

    # Add embedding_text to activity_records
    op.add_column("activity_records", sa.Column("embedding_text", sa.Text(), nullable=True))

    # Backfill state from outcome
    conn = op.get_bind()
    conn.execute(sa.text("""
        UPDATE candidate_job_links SET state = CASE
            WHEN outcome = 'hired'     THEN 'HIRED'
            WHEN outcome = 'rejected'  THEN 'REJECTED'
            WHEN outcome = 'withdrawn' THEN 'WITHDRAWN'
            ELSE 'IN_PROGRESS'
        END
    """))

    # Indexes
    op.create_index("ix_activity_records_link_id", "activity_records", ["link_id"])
    op.create_index("ix_candidates_deleted_at", "candidates", ["deleted_at"])
    op.create_index("ix_candidate_job_links_outcome", "candidate_job_links", ["outcome"])


def downgrade() -> None:
    op.drop_index("ix_candidate_job_links_outcome", "candidate_job_links")
    op.drop_index("ix_candidates_deleted_at", "candidates")
    op.drop_index("ix_activity_records_link_id", "activity_records")
    op.drop_column("activity_records", "embedding_text")
    op.drop_column("candidate_job_links", "state")
