"""Initial PowerAuction PostgreSQL schema

Revision ID: 20260809_0001
Revises:
Create Date: 2026-08-09

Preserves string IDs from Firestore/Firebase/Cashfree as primary keys.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260809_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=128), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("role", sa.String(length=64), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=True),
        sa.Column("mobile_number", sa.String(length=64), nullable=True),
        sa.Column("team_id", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("raw_firestore", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_role", "users", ["role"])
    op.create_index("ix_users_team_id", "users", ["team_id"])

    op.create_table(
        "events",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=512), nullable=False),
        sa.Column("date", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("rules", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("payment_settings", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("logo_url", sa.Text(), nullable=True),
        sa.Column("banner_url", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.String(length=128), nullable=True),
        sa.Column("organizer_name", sa.String(length=255), nullable=True),
        sa.Column("organizer_mobile", sa.String(length=64), nullable=True),
        sa.Column("has_registration_limit", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("registration_limit", sa.Integer(), nullable=True),
        sa.Column("raw_firestore", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_events_status", "events", ["status"])
    op.create_index("ix_events_created_by", "events", ["created_by"])
    op.create_index("ix_events_created_by_created_at", "events", ["created_by", "created_at"])

    op.create_table(
        "categories",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("event_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("min_players", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_players", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("color", sa.String(length=64), nullable=True),
        sa.Column("base_price", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("raw_firestore", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_categories_event_id", "categories", ["event_id"])

    op.create_table(
        "teams",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("event_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("budget", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("spent", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("remaining", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_squad_size", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("logo_url", sa.Text(), nullable=True),
        sa.Column("color", sa.String(length=64), nullable=True),
        sa.Column("admin_uid", sa.String(length=128), nullable=True),
        sa.Column("admin_email", sa.String(length=320), nullable=True),
        sa.Column("players_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("original_spent", sa.Integer(), nullable=True),
        sa.Column("original_remaining", sa.Integer(), nullable=True),
        sa.Column("original_players_count", sa.Integer(), nullable=True),
        sa.Column("raw_firestore", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"]),
        sa.ForeignKeyConstraint(["admin_uid"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_teams_event_id", "teams", ["event_id"])

    # users.team_id FK (deferred after teams table exists)
    op.create_foreign_key("fk_users_team_id", "users", "teams", ["team_id"], ["id"])

    op.create_table(
        "players",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("event_id", sa.String(length=64), nullable=True),
        sa.Column("category_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("base_price", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("current_price", sa.Integer(), nullable=True),
        sa.Column("photo_url", sa.Text(), nullable=True),
        sa.Column("age", sa.Integer(), nullable=True),
        sa.Column("position", sa.String(length=128), nullable=True),
        sa.Column("specialty", sa.String(length=255), nullable=True),
        sa.Column("stats", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("sold_to_team_id", sa.String(length=64), nullable=True),
        sa.Column("sold_price", sa.Integer(), nullable=True),
        sa.Column("previous_team", sa.String(length=255), nullable=True),
        sa.Column("cricheroes_link", sa.Text(), nullable=True),
        sa.Column("contact_number", sa.String(length=64), nullable=True),
        sa.Column("district", sa.String(length=128), nullable=True),
        sa.Column("identity_proof_url", sa.Text(), nullable=True),
        sa.Column("is_priority", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("raw_firestore", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"]),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"]),
        sa.ForeignKeyConstraint(["sold_to_team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_players_event_status", "players", ["event_id", "status"])
    op.create_index("ix_players_category_id", "players", ["category_id"])
    op.create_index("ix_players_sold_team_status", "players", ["sold_to_team_id", "status"])

    op.create_table(
        "player_registrations",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("event_id", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("registered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("payment_order_id", sa.String(length=128), nullable=True),
        sa.Column("player_id", sa.String(length=64), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("age", sa.Integer(), nullable=True),
        sa.Column("position", sa.String(length=128), nullable=True),
        sa.Column("specialty", sa.String(length=255), nullable=True),
        sa.Column("previous_team", sa.String(length=255), nullable=True),
        sa.Column("cricheroes_link", sa.Text(), nullable=True),
        sa.Column("contact_number", sa.String(length=64), nullable=True),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("photo_url", sa.Text(), nullable=True),
        sa.Column("district", sa.String(length=128), nullable=True),
        sa.Column("identity_proof_url", sa.Text(), nullable=True),
        sa.Column("stats", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("raw_firestore", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"]),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_registrations_event_status", "player_registrations", ["event_id", "status"])
    op.create_index("ix_player_registrations_payment_order_id", "player_registrations", ["payment_order_id"])

    op.create_table(
        "sponsors",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("event_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("logo_url", sa.Text(), nullable=True),
        sa.Column("website", sa.Text(), nullable=True),
        sa.Column("contact_email", sa.String(length=320), nullable=True),
        sa.Column("contact_phone", sa.String(length=64), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("sponsorship_amount", sa.Integer(), nullable=True),
        sa.Column("tier", sa.String(length=64), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("raw_firestore", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_sponsors_event_id", "sponsors", ["event_id"])

    op.create_table(
        "auction_states",
        sa.Column("event_id", sa.String(length=64), nullable=False),
        sa.Column("current_player_id", sa.String(length=64), nullable=True),
        sa.Column("current_bid", sa.Integer(), nullable=True),
        sa.Column("current_team_id", sa.String(length=64), nullable=True),
        sa.Column("current_team_name", sa.String(length=255), nullable=True),
        sa.Column("timer_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("timer_duration", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("raw_firestore", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"]),
        sa.ForeignKeyConstraint(["current_player_id"], ["players.id"]),
        sa.ForeignKeyConstraint(["current_team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("event_id"),
    )

    op.create_table(
        "bids",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("event_id", sa.String(length=64), nullable=False),
        sa.Column("player_id", sa.String(length=64), nullable=False),
        sa.Column("team_id", sa.String(length=64), nullable=False),
        sa.Column("team_name", sa.String(length=255), nullable=True),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("raw_firestore", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"]),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_bids_event_created", "bids", ["event_id", "created_at"])
    op.create_index("ix_bids_player_created", "bids", ["player_id", "created_at"])

    op.create_table(
        "public_team_tokens",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("token", sa.String(length=512), nullable=False),
        sa.Column("team_id", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.String(length=128), nullable=True),
        sa.Column("raw_firestore", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token", name="uq_public_team_tokens_token"),
    )
    op.create_index("ix_public_team_tokens_team_id", "public_team_tokens", ["team_id"])

    op.create_table(
        "payment_orders",
        sa.Column("order_id", sa.String(length=128), nullable=False),
        sa.Column("event_id", sa.String(length=64), nullable=False),
        sa.Column("customer_name", sa.String(length=255), nullable=True),
        sa.Column("customer_email", sa.String(length=320), nullable=True),
        sa.Column("customer_phone", sa.String(length=64), nullable=True),
        sa.Column("amount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(length=16), nullable=False, server_default="INR"),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("payment_session_id", sa.String(length=255), nullable=True),
        sa.Column("transaction_id", sa.String(length=255), nullable=True),
        sa.Column("registration_completed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("registration_id", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("raw_firestore", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"]),
        sa.PrimaryKeyConstraint("order_id"),
    )
    op.create_index("ix_payment_orders_event_created", "payment_orders", ["event_id", "created_at"])

    op.create_table(
        "bank_details",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.String(length=128), nullable=False),
        sa.Column("bank_name", sa.String(length=255), nullable=True),
        sa.Column("account_holder_name", sa.String(length=255), nullable=True),
        sa.Column("account_number", sa.String(length=128), nullable=True),
        sa.Column("ifsc_code", sa.String(length=64), nullable=True),
        sa.Column("swift_code", sa.String(length=64), nullable=True),
        sa.Column("branch_name", sa.String(length=255), nullable=True),
        sa.Column("upi_id", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("raw_firestore", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_bank_details_user_id"),
    )

    op.create_table(
        "migration_runs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("report", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "migration_quarantine",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("source_collection", sa.String(length=128), nullable=False),
        sa.Column("source_id", sa.String(length=128), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("migration_quarantine")
    op.drop_table("migration_runs")
    op.drop_table("bank_details")
    op.drop_index("ix_payment_orders_event_created", table_name="payment_orders")
    op.drop_table("payment_orders")
    op.drop_index("ix_public_team_tokens_team_id", table_name="public_team_tokens")
    op.drop_table("public_team_tokens")
    op.drop_index("ix_bids_player_created", table_name="bids")
    op.drop_index("ix_bids_event_created", table_name="bids")
    op.drop_table("bids")
    op.drop_table("auction_states")
    op.drop_index("ix_sponsors_event_id", table_name="sponsors")
    op.drop_table("sponsors")
    op.drop_index("ix_player_registrations_payment_order_id", table_name="player_registrations")
    op.drop_index("ix_registrations_event_status", table_name="player_registrations")
    op.drop_table("player_registrations")
    op.drop_index("ix_players_sold_team_status", table_name="players")
    op.drop_index("ix_players_category_id", table_name="players")
    op.drop_index("ix_players_event_status", table_name="players")
    op.drop_table("players")
    op.drop_constraint("fk_users_team_id", "users", type_="foreignkey")
    op.drop_index("ix_teams_event_id", table_name="teams")
    op.drop_table("teams")
    op.drop_index("ix_categories_event_id", table_name="categories")
    op.drop_table("categories")
    op.drop_index("ix_events_created_by_created_at", table_name="events")
    op.drop_index("ix_events_created_by", table_name="events")
    op.drop_index("ix_events_status", table_name="events")
    op.drop_table("events")
    op.drop_index("ix_users_team_id", table_name="users")
    op.drop_index("ix_users_role", table_name="users")
    op.drop_table("users")
