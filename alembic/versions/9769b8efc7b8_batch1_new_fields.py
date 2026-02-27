"""batch1_new_fields

Revision ID: 9769b8efc7b8
Revises: ab141b894978
Create Date: 2026-02-27 13:52:03.326927

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9769b8efc7b8'
down_revision: Union[str, Sequence[str], None] = 'ab141b894978'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- suppliers: fee terms ---
    op.add_column("suppliers", sa.Column("fee_rate", sa.Text(), nullable=True))
    op.add_column("suppliers", sa.Column("fee_guarantee_days", sa.Integer(), nullable=True))
    op.add_column("suppliers", sa.Column("payment_notes", sa.Text(), nullable=True))

    # --- candidates: referral + blacklist ---
    op.add_column("candidates", sa.Column("referred_by", sa.String(), nullable=True))
    op.add_column("candidates", sa.Column("blacklisted", sa.Boolean(), nullable=False, server_default=sa.text("0")))
    op.add_column("candidates", sa.Column("blacklist_reason", sa.String(), nullable=True))
    op.add_column("candidates", sa.Column("blacklist_note", sa.Text(), nullable=True))

    # --- jobs: headcount + target_onboard_date ---
    op.add_column("jobs", sa.Column("headcount", sa.Integer(), nullable=False, server_default=sa.text("1")))
    op.add_column("jobs", sa.Column("target_onboard_date", sa.Date(), nullable=True))

    # --- activity_records: payload JSON ---
    op.add_column("activity_records", sa.Column("payload", sa.JSON(), nullable=True))

    # --- data migration: pack sparse columns into payload (idempotent) ---
    conn = op.get_bind()
    conn.execute(sa.text("""
        UPDATE activity_records
        SET payload = CASE type
            WHEN 'interview' THEN json_object(
                'round', round,
                'score', score,
                'conclusion', conclusion,
                'scheduled_at', CAST(scheduled_at AS TEXT),
                'location', location,
                'status', status,
                'comment', comment
            )
            WHEN 'offer' THEN json_object(
                'salary', salary,
                'start_date', start_date,
                'conclusion', conclusion,
                'comment', comment
            )
            WHEN 'resume_review' THEN json_object(
                'conclusion', conclusion,
                'comment', comment
            )
            WHEN 'note' THEN json_object(
                'comment', comment
            )
            WHEN 'onboard' THEN json_object(
                'conclusion', conclusion,
                'comment', comment
            )
            ELSE json_object('comment', comment)
        END
        WHERE payload IS NULL
    """))


def downgrade() -> None:
    op.drop_column("activity_records", "payload")
    op.drop_column("jobs", "target_onboard_date")
    op.drop_column("jobs", "headcount")
    op.drop_column("candidates", "blacklist_note")
    op.drop_column("candidates", "blacklist_reason")
    op.drop_column("candidates", "blacklisted")
    op.drop_column("candidates", "referred_by")
    op.drop_column("suppliers", "payment_notes")
    op.drop_column("suppliers", "fee_guarantee_days")
    op.drop_column("suppliers", "fee_rate")
