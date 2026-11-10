"""Organizer logo on events (issue #44)

Revision ID: 20261110_0007
Revises: 20261110_0006
Create Date: 2026-11-10
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20261110_0007"
down_revision: Union[str, None] = "20261110_0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Optional: existing events simply have no organizer logo and fall back
    # to the event logo, then the PowerAuction logo, on the ticket.
    op.add_column("events", sa.Column("organizer_logo_url", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("events", "organizer_logo_url")
