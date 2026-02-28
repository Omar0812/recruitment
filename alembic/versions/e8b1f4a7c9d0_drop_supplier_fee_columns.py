"""drop_supplier_fee_columns

Revision ID: e8b1f4a7c9d0
Revises: c3f8a1b2d4e5
Create Date: 2026-03-01 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e8b1f4a7c9d0"
down_revision: Union[str, Sequence[str], None] = "c3f8a1b2d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = {col["name"] for col in inspector.get_columns("suppliers")}
    with op.batch_alter_table("suppliers") as batch_op:
        if "fee_rate" in cols:
            batch_op.drop_column("fee_rate")
        if "payment_notes" in cols:
            batch_op.drop_column("payment_notes")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = {col["name"] for col in inspector.get_columns("suppliers")}
    with op.batch_alter_table("suppliers") as batch_op:
        if "fee_rate" not in cols:
            batch_op.add_column(sa.Column("fee_rate", sa.Text(), nullable=True))
        if "payment_notes" not in cols:
            batch_op.add_column(sa.Column("payment_notes", sa.Text(), nullable=True))
