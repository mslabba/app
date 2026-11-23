"""Event match schedule storage (issue #77)

Revision ID: 20261123_0010
Revises: 20261110_0009
Create Date: 2026-11-23

One saved schedule per event: the conditions the organiser entered
plus the generated day-by-day fixture list. event_id is unique —
regenerating a schedule replaces the row.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20261123_0010"
down_revision: Union[str, None] = "20261110_0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "event_schedules",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("event_id", sa.String(length=64), nullable=False),
        sa.Column(
            "conditions", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column(
            "schedule", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id", name="uq_event_schedules_event_id"),
    )
    op.create_index(
        "ix_event_schedules_event_id", "event_schedules", ["event_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_event_schedules_event_id", table_name="event_schedules")
    op.drop_table("event_schedules")
