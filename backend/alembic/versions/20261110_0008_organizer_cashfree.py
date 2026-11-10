"""Per-event organizer Cashfree settings (issue #46)

Revision ID: 20261110_0008
Revises: 20261110_0007
Create Date: 2026-11-10
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20261110_0008"
down_revision: Union[str, None] = "20261110_0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Optional: existing events simply have no organizer credentials and
    # keep using the platform Cashfree account, as today.
    op.add_column("events", sa.Column("organizer_cashfree_app_id", sa.Text(), nullable=True))
    op.add_column("events", sa.Column("organizer_cashfree_secret_key", sa.Text(), nullable=True))
    op.add_column("events", sa.Column("organizer_cashfree_mode", sa.String(length=16), nullable=True))
    # Which Cashfree account each payment order was created under, so the
    # webhook / verify / reconcile steps resolve the same credentials.
    op.add_column("payment_orders", sa.Column("gateway_source", sa.String(length=16), nullable=True))
    op.add_column("payment_orders", sa.Column("cashfree_app_id", sa.String(length=128), nullable=True))


def downgrade() -> None:
    op.drop_column("payment_orders", "cashfree_app_id")
    op.drop_column("payment_orders", "gateway_source")
    op.drop_column("events", "organizer_cashfree_mode")
    op.drop_column("events", "organizer_cashfree_secret_key")
    op.drop_column("events", "organizer_cashfree_app_id")
