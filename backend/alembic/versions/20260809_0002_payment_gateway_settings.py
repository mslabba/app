"""Add payment_gateway_settings table

Revision ID: 20260809_0002
Revises: 20260809_0001
Create Date: 2026-08-09
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260809_0002"
down_revision: Union[str, None] = "20260809_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "payment_gateway_settings",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("cashfree_app_id", sa.String(length=255), nullable=False),
        sa.Column("cashfree_secret_key", sa.String(length=512), nullable=False),
        sa.Column("cashfree_mode", sa.String(length=32), nullable=False, server_default="sandbox"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_by", sa.String(length=128), nullable=True),
        sa.Column("raw_firestore", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("payment_gateway_settings")
