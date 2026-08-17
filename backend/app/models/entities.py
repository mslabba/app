"""
PostgreSQL ORM entities for PowerAuction.

Primary keys use TEXT and preserve existing Firestore document IDs /
Firebase UIDs / Cashfree order IDs as specified in the master plan.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)  # firebase_uid
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True)
    role: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    display_name: Mapped[Optional[str]] = mapped_column(String(255))
    mobile_number: Mapped[Optional[str]] = mapped_column(String(64))
    # Circular ref with teams — FK added without immediate constraint order issues
    team_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("teams.id", use_alter=True, name="fk_users_team_id"), nullable=True, index=True
    )
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    raw_firestore: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)


class Event(Base):
    __tablename__ = "events"
    __table_args__ = (Index("ix_events_created_by_created_at", "created_by", "created_at"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    date: Mapped[Optional[str]] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    rules: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    payment_settings: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    description: Mapped[Optional[str]] = mapped_column(Text)
    logo_url: Mapped[Optional[str]] = mapped_column(Text)
    banner_url: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[Optional[str]] = mapped_column(
        String(128), ForeignKey("users.id"), nullable=True, index=True
    )
    organizer_name: Mapped[Optional[str]] = mapped_column(String(255))
    organizer_mobile: Mapped[Optional[str]] = mapped_column(String(64))
    has_registration_limit: Mapped[bool] = mapped_column(Boolean, default=False)
    registration_limit: Mapped[Optional[int]] = mapped_column(Integer)
    registration_form_config: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    raw_firestore: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)

    categories: Mapped[list["Category"]] = relationship(back_populates="event")
    teams: Mapped[list["Team"]] = relationship(back_populates="event")


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (Index("ix_categories_event_id", "event_id"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    event_id: Mapped[str] = mapped_column(String(64), ForeignKey("events.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    min_players: Mapped[int] = mapped_column(Integer, default=0)
    max_players: Mapped[int] = mapped_column(Integer, default=0)
    color: Mapped[Optional[str]] = mapped_column(String(64))
    base_price: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    raw_firestore: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)

    event: Mapped["Event"] = relationship(back_populates="categories")
    players: Mapped[list["Player"]] = relationship(back_populates="category")


class Team(Base):
    __tablename__ = "teams"
    __table_args__ = (Index("ix_teams_event_id", "event_id"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    event_id: Mapped[str] = mapped_column(String(64), ForeignKey("events.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    budget: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    spent: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    remaining: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_squad_size: Mapped[int] = mapped_column(Integer, default=0)
    logo_url: Mapped[Optional[str]] = mapped_column(Text)
    color: Mapped[Optional[str]] = mapped_column(String(64))
    admin_uid: Mapped[Optional[str]] = mapped_column(
        String(128), ForeignKey("users.id", use_alter=True, name="fk_teams_admin_uid"), nullable=True
    )
    admin_email: Mapped[Optional[str]] = mapped_column(String(320))
    players_count: Mapped[int] = mapped_column(Integer, default=0)
    # Original Firestore values retained for audit after purse recompute
    original_spent: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    original_remaining: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    original_players_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    raw_firestore: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)

    event: Mapped["Event"] = relationship(back_populates="teams")


class Player(Base):
    __tablename__ = "players"
    __table_args__ = (
        Index("ix_players_event_status", "event_id", "status"),
        Index("ix_players_category_id", "category_id"),
        Index("ix_players_sold_team_status", "sold_to_team_id", "status"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    event_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("events.id"), nullable=True
    )  # nullable until backfill passes gate
    category_id: Mapped[str] = mapped_column(String(64), ForeignKey("categories.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    base_price: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    current_price: Mapped[Optional[int]] = mapped_column(Integer)
    photo_url: Mapped[Optional[str]] = mapped_column(Text)
    age: Mapped[Optional[int]] = mapped_column(Integer)
    position: Mapped[Optional[str]] = mapped_column(String(128))
    specialty: Mapped[Optional[str]] = mapped_column(String(255))
    stats: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(String(64), nullable=False, default="available")
    sold_to_team_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("teams.id"), nullable=True
    )
    sold_price: Mapped[Optional[int]] = mapped_column(Integer)
    previous_team: Mapped[Optional[str]] = mapped_column(String(255))
    cricheroes_link: Mapped[Optional[str]] = mapped_column(Text)
    contact_number: Mapped[Optional[str]] = mapped_column(String(64))
    district: Mapped[Optional[str]] = mapped_column(String(128))
    identity_proof_url: Mapped[Optional[str]] = mapped_column(Text)
    is_priority: Mapped[bool] = mapped_column(Boolean, default=False)
    extra_fields: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    raw_firestore: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)

    category: Mapped["Category"] = relationship(back_populates="players")


class PlayerRegistration(Base):
    __tablename__ = "player_registrations"
    __table_args__ = (Index("ix_registrations_event_status", "event_id", "status"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    event_id: Mapped[str] = mapped_column(String(64), ForeignKey("events.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(64), nullable=False)
    registered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    payment_order_id: Mapped[Optional[str]] = mapped_column(String(128), index=True)
    player_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("players.id"), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    name: Mapped[Optional[str]] = mapped_column(String(255))
    age: Mapped[Optional[int]] = mapped_column(Integer)
    position: Mapped[Optional[str]] = mapped_column(String(128))
    specialty: Mapped[Optional[str]] = mapped_column(String(255))
    previous_team: Mapped[Optional[str]] = mapped_column(String(255))
    cricheroes_link: Mapped[Optional[str]] = mapped_column(Text)
    contact_number: Mapped[Optional[str]] = mapped_column(String(64))
    email: Mapped[Optional[str]] = mapped_column(String(320))
    photo_url: Mapped[Optional[str]] = mapped_column(Text)
    district: Mapped[Optional[str]] = mapped_column(String(128))
    identity_proof_url: Mapped[Optional[str]] = mapped_column(Text)
    stats: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB)
    extra_fields: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    raw_firestore: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)


class Sponsor(Base):
    __tablename__ = "sponsors"
    __table_args__ = (Index("ix_sponsors_event_id", "event_id"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    event_id: Mapped[str] = mapped_column(String(64), ForeignKey("events.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    logo_url: Mapped[Optional[str]] = mapped_column(Text)
    website: Mapped[Optional[str]] = mapped_column(Text)
    contact_email: Mapped[Optional[str]] = mapped_column(String(320))
    contact_phone: Mapped[Optional[str]] = mapped_column(String(64))
    address: Mapped[Optional[str]] = mapped_column(Text)
    sponsorship_amount: Mapped[Optional[int]] = mapped_column(Integer)
    tier: Mapped[Optional[str]] = mapped_column(String(64))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    raw_firestore: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)


class AuctionState(Base):
    __tablename__ = "auction_states"

    event_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("events.id"), primary_key=True
    )
    current_player_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("players.id"), nullable=True
    )
    current_bid: Mapped[Optional[int]] = mapped_column(Integer)
    current_team_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("teams.id"), nullable=True
    )
    current_team_name: Mapped[Optional[str]] = mapped_column(String(255))
    timer_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    timer_duration: Mapped[int] = mapped_column(Integer, default=60)
    status: Mapped[str] = mapped_column(String(64), nullable=False)
    raw_firestore: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)


class Bid(Base):
    __tablename__ = "bids"
    __table_args__ = (
        Index("ix_bids_event_created", "event_id", "created_at"),
        Index("ix_bids_player_created", "player_id", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    event_id: Mapped[str] = mapped_column(String(64), ForeignKey("events.id"), nullable=False)
    player_id: Mapped[str] = mapped_column(String(64), ForeignKey("players.id"), nullable=False)
    team_id: Mapped[str] = mapped_column(String(64), ForeignKey("teams.id"), nullable=False)
    team_name: Mapped[Optional[str]] = mapped_column(String(255))
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    raw_firestore: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)


class PublicTeamToken(Base):
    __tablename__ = "public_team_tokens"
    __table_args__ = (
        UniqueConstraint("token", name="uq_public_team_tokens_token"),
        Index("ix_public_team_tokens_team_id", "team_id"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    token: Mapped[str] = mapped_column(String(512), nullable=False)
    team_id: Mapped[str] = mapped_column(String(64), ForeignKey("teams.id"), nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[Optional[str]] = mapped_column(String(128))
    raw_firestore: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)


class PublicEventBroadcastToken(Base):
    """Event-scoped token for public live auction OBS/vMix boards (no login)."""

    __tablename__ = "public_event_broadcast_tokens"
    __table_args__ = (
        UniqueConstraint("token", name="uq_public_event_broadcast_tokens_token"),
        Index("ix_public_event_broadcast_tokens_event_id", "event_id"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    token: Mapped[str] = mapped_column(String(512), nullable=False)
    event_id: Mapped[str] = mapped_column(String(64), ForeignKey("events.id"), nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[Optional[str]] = mapped_column(String(128))
    label: Mapped[Optional[str]] = mapped_column(String(255))
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)


class PaymentOrder(Base):
    __tablename__ = "payment_orders"
    __table_args__ = (Index("ix_payment_orders_event_created", "event_id", "created_at"),)

    order_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    event_id: Mapped[str] = mapped_column(String(64), ForeignKey("events.id"), nullable=False)
    customer_name: Mapped[Optional[str]] = mapped_column(String(255))
    customer_email: Mapped[Optional[str]] = mapped_column(String(320))
    customer_phone: Mapped[Optional[str]] = mapped_column(String(64))
    amount: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(16), default="INR")
    status: Mapped[str] = mapped_column(String(64), nullable=False)
    payment_session_id: Mapped[Optional[str]] = mapped_column(String(255))
    transaction_id: Mapped[Optional[str]] = mapped_column(String(255))
    registration_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    registration_id: Mapped[Optional[str]] = mapped_column(String(64))
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    raw_firestore: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)


class BankDetails(Base):
    __tablename__ = "bank_details"
    __table_args__ = (UniqueConstraint("user_id", name="uq_bank_details_user_id"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(128), ForeignKey("users.id"), nullable=False)
    bank_name: Mapped[Optional[str]] = mapped_column(String(255))
    account_holder_name: Mapped[Optional[str]] = mapped_column(String(255))
    account_number: Mapped[Optional[str]] = mapped_column(String(128))
    ifsc_code: Mapped[Optional[str]] = mapped_column(String(64))
    swift_code: Mapped[Optional[str]] = mapped_column(String(64))
    branch_name: Mapped[Optional[str]] = mapped_column(String(255))
    upi_id: Mapped[Optional[str]] = mapped_column(String(128))
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    raw_firestore: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)


class PaymentGatewaySettings(Base):
    """Singleton-style Cashfree credentials (one row with fixed id)."""

    __tablename__ = "payment_gateway_settings"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default="payment_gateway_config")
    cashfree_app_id: Mapped[str] = mapped_column(String(255), nullable=False)
    cashfree_secret_key: Mapped[str] = mapped_column(String(512), nullable=False)
    cashfree_mode: Mapped[str] = mapped_column(String(32), nullable=False, default="sandbox")
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    updated_by: Mapped[Optional[str]] = mapped_column(String(128))
    raw_firestore: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)


class MigrationRun(Base):
    __tablename__ = "migration_runs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(64), default="running")
    notes: Mapped[Optional[str]] = mapped_column(Text)
    report: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB)


class MigrationQuarantine(Base):
    """Rows that could not be safely mapped (e.g. player without resolvable event)."""

    __tablename__ = "migration_quarantine"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    source_collection: Mapped[str] = mapped_column(String(128), nullable=False)
    source_id: Mapped[str] = mapped_column(String(128), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
