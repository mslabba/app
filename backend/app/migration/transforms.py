"""Transform Firestore documents into ORM-ready dictionaries."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional


def parse_dt(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
    if isinstance(value, str):
        try:
            # Support trailing Z
            v = value.replace("Z", "+00:00")
            return datetime.fromisoformat(v)
        except ValueError:
            return None
    return None


def as_int(value: Any, default: Optional[int] = None) -> Optional[int]:
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def as_bool(value: Any, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ("1", "true", "yes")
    return bool(value)


def transform_user(doc_id: str, data: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": data.get("uid") or doc_id,
        "email": data.get("email") or f"unknown+{doc_id}@invalid.local",
        "role": data.get("role") or "viewer",
        "display_name": data.get("display_name"),
        "mobile_number": data.get("mobile_number"),
        "team_id": data.get("team_id"),
        "created_at": parse_dt(data.get("created_at")),
        "raw_firestore": data,
    }


def transform_event(doc_id: str, data: dict[str, Any]) -> dict[str, Any]:
    rules = data.get("rules") if isinstance(data.get("rules"), dict) else {}
    payment_settings = (
        data.get("payment_settings")
        if isinstance(data.get("payment_settings"), dict)
        else {"collect_payment": False, "registration_fee": None}
    )
    return {
        "id": data.get("id") or doc_id,
        "name": data.get("name") or "Unnamed event",
        "date": data.get("date"),
        "status": data.get("status") or "not_started",
        "rules": rules,
        "payment_settings": payment_settings,
        "description": data.get("description"),
        "logo_url": data.get("logo_url"),
        "banner_url": data.get("banner_url"),
        "created_at": parse_dt(data.get("created_at")),
        "created_by": data.get("created_by"),
        "organizer_name": data.get("organizer_name"),
        "organizer_mobile": data.get("organizer_mobile"),
        "has_registration_limit": as_bool(data.get("has_registration_limit")),
        "registration_limit": as_int(data.get("registration_limit")),
        "raw_firestore": data,
    }


def transform_category(doc_id: str, data: dict[str, Any]) -> dict[str, Any]:
    base = data.get("base_price")
    if base is None:
        base = data.get("base_price_min", 0)
    return {
        "id": data.get("id") or doc_id,
        "event_id": data.get("event_id"),
        "name": data.get("name") or "Unnamed",
        "description": data.get("description"),
        "min_players": as_int(data.get("min_players"), 0) or 0,
        "max_players": as_int(data.get("max_players"), 0) or 0,
        "color": data.get("color"),
        "base_price": as_int(base, 0) or 0,
        "raw_firestore": data,
    }


def transform_team(doc_id: str, data: dict[str, Any]) -> dict[str, Any]:
    budget = as_int(data.get("budget"), 0) or 0
    spent = as_int(data.get("spent"), 0) or 0
    remaining = as_int(data.get("remaining"), budget - spent)
    if remaining is None:
        remaining = budget - spent
    return {
        "id": data.get("id") or doc_id,
        "event_id": data.get("event_id"),
        "name": data.get("name") or "Unnamed team",
        "budget": budget,
        "spent": spent,
        "remaining": remaining,
        "max_squad_size": as_int(data.get("max_squad_size"), 0) or 0,
        "logo_url": data.get("logo_url"),
        "color": data.get("color"),
        "admin_uid": data.get("admin_uid"),
        "admin_email": data.get("admin_email"),
        "players_count": as_int(data.get("players_count"), 0) or 0,
        "original_spent": spent,
        "original_remaining": remaining,
        "original_players_count": as_int(data.get("players_count"), 0) or 0,
        "raw_firestore": data,
    }


def transform_player(doc_id: str, data: dict[str, Any]) -> dict[str, Any]:
    stats = data.get("stats") if isinstance(data.get("stats"), dict) else data.get("stats")
    return {
        "id": data.get("id") or doc_id,
        "event_id": data.get("event_id"),  # may be None — backfilled later
        "category_id": data.get("category_id"),
        "name": data.get("name") or "Unnamed player",
        "base_price": as_int(data.get("base_price"), 0) or 0,
        "current_price": as_int(data.get("current_price")),
        "photo_url": data.get("photo_url"),
        "age": as_int(data.get("age")),
        "position": data.get("position"),
        "specialty": data.get("specialty"),
        "stats": stats if isinstance(stats, dict) else None,
        "status": data.get("status") or "available",
        "sold_to_team_id": data.get("sold_to_team_id"),
        "sold_price": as_int(data.get("sold_price")),
        "previous_team": data.get("previous_team"),
        "cricheroes_link": data.get("cricheroes_link"),
        "contact_number": data.get("contact_number"),
        "district": data.get("district"),
        "identity_proof_url": data.get("identity_proof_url"),
        "is_priority": as_bool(data.get("is_priority")),
        "raw_firestore": data,
    }


def transform_registration(doc_id: str, data: dict[str, Any]) -> dict[str, Any]:
    stats = data.get("stats") if isinstance(data.get("stats"), dict) else None
    return {
        "id": data.get("id") or doc_id,
        "event_id": data.get("event_id"),
        "status": data.get("status") or "pending_approval",
        "registered_at": parse_dt(data.get("registered_at")),
        "payment_order_id": data.get("payment_order_id"),
        "player_id": data.get("player_id"),
        "approved_at": parse_dt(data.get("approved_at")),
        "name": data.get("name"),
        "age": as_int(data.get("age")),
        "position": data.get("position"),
        "specialty": data.get("specialty"),
        "previous_team": data.get("previous_team"),
        "cricheroes_link": data.get("cricheroes_link"),
        "contact_number": data.get("contact_number"),
        "email": data.get("email"),
        "photo_url": data.get("photo_url"),
        "district": data.get("district"),
        "identity_proof_url": data.get("identity_proof_url"),
        "stats": stats,
        "raw_firestore": data,
    }


def transform_sponsor(doc_id: str, data: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": data.get("id") or doc_id,
        "event_id": data.get("event_id"),
        "name": data.get("name") or "Unnamed sponsor",
        "description": data.get("description"),
        "logo_url": data.get("logo_url"),
        "website": data.get("website"),
        "contact_email": data.get("contact_email"),
        "contact_phone": data.get("contact_phone"),
        "address": data.get("address"),
        "sponsorship_amount": as_int(data.get("sponsorship_amount")),
        "tier": data.get("tier"),
        "is_active": as_bool(data.get("is_active"), True),
        "created_at": parse_dt(data.get("created_at")),
        "raw_firestore": data,
    }


def transform_auction_state(doc_id: str, data: dict[str, Any]) -> dict[str, Any]:
    event_id = data.get("event_id")
    if not event_id and doc_id.startswith("auction_"):
        event_id = doc_id[len("auction_") :]
    return {
        "event_id": event_id,
        "current_player_id": data.get("current_player_id"),
        "current_bid": as_int(data.get("current_bid")),
        "current_team_id": data.get("current_team_id"),
        "current_team_name": data.get("current_team_name"),
        "timer_started_at": parse_dt(data.get("timer_started_at")),
        "timer_duration": as_int(data.get("timer_duration"), 60) or 60,
        "status": data.get("status") or "not_started",
        "raw_firestore": data,
    }


def transform_bid(doc_id: str, data: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": data.get("id") or doc_id,
        "event_id": data.get("event_id"),
        "player_id": data.get("player_id"),
        "team_id": data.get("team_id"),
        "team_name": data.get("team_name"),
        "amount": as_int(data.get("amount"), 0) or 0,
        "created_at": parse_dt(data.get("timestamp") or data.get("created_at")),
        "raw_firestore": data,
    }


def transform_public_token(doc_id: str, data: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": doc_id or str(uuid.uuid4()),
        "token": data.get("token"),
        "team_id": data.get("team_id"),
        "expires_at": parse_dt(data.get("expires_at")),
        "created_at": parse_dt(data.get("created_at")),
        "created_by": data.get("created_by"),
        "raw_firestore": data,
    }


def transform_payment(doc_id: str, data: dict[str, Any]) -> dict[str, Any]:
    order_id = data.get("order_id") or doc_id
    return {
        "order_id": order_id,
        "event_id": data.get("event_id"),
        "customer_name": data.get("customer_name"),
        "customer_email": data.get("customer_email"),
        "customer_phone": data.get("customer_phone"),
        "amount": as_int(data.get("amount"), 0) or 0,
        "currency": data.get("currency") or "INR",
        "status": data.get("status") or "PENDING",
        "payment_session_id": data.get("payment_session_id"),
        "transaction_id": data.get("transaction_id"),
        "registration_completed": as_bool(data.get("registration_completed")),
        "registration_id": data.get("registration_id"),
        "created_at": parse_dt(data.get("created_at")),
        "verified_at": parse_dt(data.get("verified_at")),
        "raw_firestore": data,
    }


def transform_bank(doc_id: str, data: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": data.get("id") or doc_id,
        "user_id": data.get("user_id"),
        "bank_name": data.get("bank_name"),
        "account_holder_name": data.get("account_holder_name"),
        "account_number": data.get("account_number"),
        "ifsc_code": data.get("ifsc_code"),
        "swift_code": data.get("swift_code"),
        "branch_name": data.get("branch_name"),
        "upi_id": data.get("upi_id"),
        "created_at": parse_dt(data.get("created_at")),
        "updated_at": parse_dt(data.get("updated_at")),
        "raw_firestore": data,
    }
