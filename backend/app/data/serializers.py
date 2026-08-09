"""Convert ORM rows to dicts matching existing Firestore/API shapes."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional


def _iso(value: Optional[datetime]) -> Optional[str]:
    if value is None:
        return None
    return value.isoformat()


def user_to_dict(u) -> dict[str, Any]:
    return {
        "uid": u.id,
        "id": u.id,
        "email": u.email,
        "role": u.role,
        "display_name": u.display_name,
        "mobile_number": u.mobile_number,
        "team_id": u.team_id,
        "created_at": _iso(u.created_at),
    }


def event_to_dict(e) -> dict[str, Any]:
    return {
        "id": e.id,
        "name": e.name,
        "date": e.date,
        "status": e.status,
        "rules": e.rules or {},
        "payment_settings": e.payment_settings
        or {"collect_payment": False, "registration_fee": None},
        "description": e.description,
        "logo_url": e.logo_url,
        "banner_url": e.banner_url,
        "created_at": _iso(e.created_at),
        "created_by": e.created_by,
        "organizer_name": e.organizer_name,
        "organizer_mobile": e.organizer_mobile,
        "has_registration_limit": bool(e.has_registration_limit),
        "registration_limit": e.registration_limit,
    }


def category_to_dict(c) -> dict[str, Any]:
    return {
        "id": c.id,
        "event_id": c.event_id,
        "name": c.name,
        "description": c.description,
        "min_players": c.min_players,
        "max_players": c.max_players,
        "color": c.color,
        "base_price": c.base_price,
    }


def team_to_dict(t) -> dict[str, Any]:
    return {
        "id": t.id,
        "event_id": t.event_id,
        "name": t.name,
        "budget": t.budget,
        "spent": t.spent,
        "remaining": t.remaining,
        "max_squad_size": t.max_squad_size,
        "logo_url": t.logo_url,
        "color": t.color,
        "admin_uid": t.admin_uid,
        "admin_email": t.admin_email,
        "players_count": t.players_count,
    }


def player_to_dict(p) -> dict[str, Any]:
    return {
        "id": p.id,
        "event_id": p.event_id,
        "category_id": p.category_id,
        "name": p.name,
        "base_price": p.base_price,
        "current_price": p.current_price,
        "photo_url": p.photo_url,
        "age": p.age,
        "position": p.position,
        "specialty": p.specialty,
        "stats": p.stats,
        "status": p.status,
        "sold_to_team_id": p.sold_to_team_id,
        "sold_price": p.sold_price,
        "previous_team": p.previous_team,
        "cricheroes_link": p.cricheroes_link,
        "contact_number": p.contact_number,
        "district": p.district,
        "identity_proof_url": p.identity_proof_url,
        "is_priority": bool(p.is_priority),
    }


def registration_to_dict(r) -> dict[str, Any]:
    d = {
        "id": r.id,
        "event_id": r.event_id,
        "status": r.status,
        "registered_at": _iso(r.registered_at),
        "payment_order_id": r.payment_order_id,
        "player_id": r.player_id,
        "approved_at": _iso(r.approved_at),
        "name": r.name,
        "age": r.age,
        "position": r.position,
        "specialty": r.specialty,
        "previous_team": r.previous_team,
        "cricheroes_link": r.cricheroes_link,
        "contact_number": r.contact_number,
        "email": r.email,
        "photo_url": r.photo_url,
        "district": r.district,
        "identity_proof_url": r.identity_proof_url,
        "stats": r.stats,
    }
    return d


def sponsor_to_dict(s) -> dict[str, Any]:
    return {
        "id": s.id,
        "event_id": s.event_id,
        "name": s.name,
        "description": s.description,
        "logo_url": s.logo_url,
        "website": s.website,
        "contact_email": s.contact_email,
        "contact_phone": s.contact_phone,
        "address": s.address,
        "sponsorship_amount": s.sponsorship_amount,
        "tier": s.tier,
        "is_active": bool(s.is_active),
        "created_at": _iso(s.created_at),
    }


def auction_state_to_dict(a) -> dict[str, Any]:
    return {
        "id": f"auction_{a.event_id}",
        "event_id": a.event_id,
        "current_player_id": a.current_player_id,
        "current_bid": a.current_bid,
        "current_team_id": a.current_team_id,
        "current_team_name": a.current_team_name,
        "timer_started_at": _iso(a.timer_started_at),
        "timer_duration": a.timer_duration,
        "status": a.status,
        "bid_history": [],  # full history via bids table; API may append later
    }


def bid_to_dict(b) -> dict[str, Any]:
    return {
        "id": b.id,
        "player_id": b.player_id,
        "event_id": b.event_id,
        "team_id": b.team_id,
        "team_name": b.team_name,
        "amount": b.amount,
        "timestamp": _iso(b.created_at),
    }


def payment_to_dict(p) -> dict[str, Any]:
    return {
        "order_id": p.order_id,
        "event_id": p.event_id,
        "customer_name": p.customer_name,
        "customer_email": p.customer_email,
        "customer_phone": p.customer_phone,
        "amount": p.amount,
        "currency": p.currency,
        "status": p.status,
        "payment_session_id": p.payment_session_id,
        "transaction_id": p.transaction_id,
        "registration_completed": bool(p.registration_completed),
        "registration_id": p.registration_id,
        "created_at": _iso(p.created_at),
        "verified_at": _iso(p.verified_at),
    }
