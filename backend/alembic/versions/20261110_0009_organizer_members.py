"""Organizer member list + registration category pricing (issue #57)

Revision ID: 20261110_0009
Revises: 20261110_0007
Create Date: 2026-11-11

NOTE: revision 20261110_0008 is claimed by unmerged PR #47 (organizer
Cashfree settings). If #47 merges first, its 0008 and this 0009 will
both revise 0007 — a two-head history that needs a merge revision
before `alembic upgrade head` runs cleanly.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20261110_0009"
down_revision: Union[str, None] = "20261110_0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # One member list per organizer (their events' created_by uid),
    # shared across all their events. Phones are stored normalised to
    # 10 digits; matching is by phone only.
    op.create_table(
        "organizer_members",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("organizer_id", sa.String(length=128), nullable=False),
        sa.Column("phone_normalized", sa.String(length=16), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "organizer_id", "phone_normalized", name="uq_organizer_members_organizer_phone"
        ),
    )
    op.create_index(
        "ix_organizer_members_organizer_id", "organizer_members", ["organizer_id"]
    )

    # Category name + member flag on the registration and the payment
    # order, so the ticket and the admin page show what was charged for.
    # registration_category stores the category NAME (receipt semantics).
    op.add_column(
        "player_registrations",
        sa.Column("registration_category", sa.String(length=128), nullable=True),
    )
    op.add_column(
        "player_registrations", sa.Column("is_member", sa.Boolean(), nullable=True)
    )
    op.add_column(
        "payment_orders",
        sa.Column("registration_category", sa.String(length=128), nullable=True),
    )
    op.add_column(
        "payment_orders", sa.Column("is_member", sa.Boolean(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("payment_orders", "is_member")
    op.drop_column("payment_orders", "registration_category")
    op.drop_column("player_registrations", "is_member")
    op.drop_column("player_registrations", "registration_category")
    op.drop_index("ix_organizer_members_organizer_id", table_name="organizer_members")
    op.drop_table("organizer_members")
