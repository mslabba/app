"""Voucher codes for player registration (issue #40)

Revision ID: 20261110_0006
Revises: 20260810_0005
Create Date: 2026-11-10
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20261110_0006"
down_revision: Union[str, None] = "20260810_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "vouchers",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("event_id", sa.String(length=64), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("type", sa.String(length=16), nullable=False),
        sa.Column("value", sa.Integer(), nullable=True),
        sa.Column("max_uses", sa.Integer(), nullable=True),
        sa.Column("used_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("label", sa.String(length=255), nullable=True),
        sa.Column("raw_firestore", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id", "code", name="uq_vouchers_event_code"),
    )
    op.create_index("ix_vouchers_event_id", "vouchers", ["event_id"])

    # Voucher fields on payment orders: amount stays what was charged;
    # original_amount is the event fee, discount_amount the rupees saved.
    # A zero-amount row with status='VOUCHER' records a full-voucher
    # registration (no Cashfree order exists for it).
    op.add_column("payment_orders", sa.Column("voucher_code", sa.String(length=64), nullable=True))
    op.add_column("payment_orders", sa.Column("original_amount", sa.Integer(), nullable=True))
    op.add_column("payment_orders", sa.Column("discount_amount", sa.Integer(), nullable=True))

    # Same fields carried onto the registration itself.
    op.add_column("player_registrations", sa.Column("voucher_code", sa.String(length=64), nullable=True))
    op.add_column("player_registrations", sa.Column("amount_paid", sa.Integer(), nullable=True))
    op.add_column("player_registrations", sa.Column("discount_amount", sa.Integer(), nullable=True))
    op.add_column("player_registrations", sa.Column("original_amount", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("player_registrations", "original_amount")
    op.drop_column("player_registrations", "discount_amount")
    op.drop_column("player_registrations", "amount_paid")
    op.drop_column("player_registrations", "voucher_code")
    op.drop_column("payment_orders", "discount_amount")
    op.drop_column("payment_orders", "original_amount")
    op.drop_column("payment_orders", "voucher_code")
    op.drop_index("ix_vouchers_event_id", table_name="vouchers")
    op.drop_table("vouchers")
