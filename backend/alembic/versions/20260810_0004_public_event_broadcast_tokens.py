"""Add public_event_broadcast_tokens for live OBS boards

Revision ID: 20260810_0004
Revises: 20260810_0003
Create Date: 2026-08-10
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260810_0004"
down_revision: Union[str, None] = "20260810_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "public_event_broadcast_tokens",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("token", sa.String(length=512), nullable=False),
        sa.Column("event_id", sa.String(length=64), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.String(length=128), nullable=True),
        sa.Column("label", sa.String(length=255), nullable=True),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default="false"),
        sa.UniqueConstraint("token", name="uq_public_event_broadcast_tokens_token"),
    )
    op.create_index(
        "ix_public_event_broadcast_tokens_event_id",
        "public_event_broadcast_tokens",
        ["event_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_public_event_broadcast_tokens_event_id",
        table_name="public_event_broadcast_tokens",
    )
    op.drop_table("public_event_broadcast_tokens")
