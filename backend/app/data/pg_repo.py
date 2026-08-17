"""
PostgreSQL repository used when DATA_BACKEND=postgres.

Returns plain dicts compatible with existing FastAPI / Pydantic code paths.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.data.serializers import (
    auction_state_to_dict,
    bid_to_dict,
    category_to_dict,
    event_to_dict,
    payment_to_dict,
    player_to_dict,
    registration_to_dict,
    sponsor_to_dict,
    team_to_dict,
    user_to_dict,
)
from app.db.session import get_session_factory
from app.models import (
    AuctionState,
    BankDetails,
    Bid,
    Category,
    Event,
    PaymentGatewaySettings,
    PaymentOrder,
    Player,
    PlayerRegistration,
    PublicEventBroadcastToken,
    PublicTeamToken,
    Sponsor,
    Team,
    User,
)


def _session() -> Session:
    return get_session_factory()()


def get_user(uid: str) -> Optional[dict[str, Any]]:
    with _session() as s:
        u = s.get(User, uid)
        return user_to_dict(u) if u else None


def get_user_by_email(email: str) -> Optional[dict[str, Any]]:
    with _session() as s:
        u = s.scalars(select(User).where(User.email == email).limit(1)).first()
        return user_to_dict(u) if u else None


def set_user_team(uid: str, team_id: Optional[str]) -> None:
    with _session() as s:
        u = s.get(User, uid)
        if u:
            u.team_id = team_id
            s.commit()


def upsert_user(data: dict[str, Any]) -> dict[str, Any]:
    with _session() as s:
        uid = data.get("uid") or data.get("id")
        u = s.get(User, uid)
        if not u:
            u = User(
                id=uid,
                email=data.get("email") or f"{uid}@unknown.local",
                role=data.get("role") or "event_organizer",
            )
            s.add(u)
        u.email = data.get("email") or u.email
        u.role = data.get("role") or u.role
        u.display_name = data.get("display_name", u.display_name)
        u.mobile_number = data.get("mobile_number", u.mobile_number)
        if "team_id" in data:
            u.team_id = data.get("team_id")
        if data.get("created_at") and not u.created_at:
            # leave as string-parsed later if needed
            pass
        s.commit()
        s.refresh(u)
        return user_to_dict(u)


def list_users(order_desc: bool = True) -> list[dict[str, Any]]:
    with _session() as s:
        q: Select = select(User)
        if order_desc:
            q = q.order_by(User.created_at.desc().nullslast())
        return [user_to_dict(u) for u in s.scalars(q).all()]


def update_user(uid: str, fields: dict[str, Any]) -> dict[str, Any]:
    with _session() as s:
        u = s.get(User, uid)
        if not u:
            raise ValueError("User not found")
        for k, v in fields.items():
            if k in ("uid", "id"):
                continue
            if hasattr(u, k):
                setattr(u, k, v)
        s.commit()
        s.refresh(u)
        return user_to_dict(u)


def delete_user(uid: str) -> None:
    with _session() as s:
        u = s.get(User, uid)
        if not u:
            raise ValueError("User not found")
        # Clear team admin link if any
        if u.team_id:
            t = s.get(Team, u.team_id)
            if t and t.admin_uid == uid:
                t.admin_uid = None
                t.admin_email = None
        s.delete(u)
        s.commit()


def list_events_for_user(uid: str, role: str) -> list[dict[str, Any]]:
    with _session() as s:
        q = select(Event).order_by(Event.created_at.desc().nullslast())
        if role == "event_organizer":
            q = q.where(Event.created_by == uid)
        return [event_to_dict(e) for e in s.scalars(q).all()]


def get_event(event_id: str) -> Optional[dict[str, Any]]:
    with _session() as s:
        e = s.get(Event, event_id)
        return event_to_dict(e) if e else None


def create_event(data: dict[str, Any]) -> dict[str, Any]:
    with _session() as s:
        e = Event(
            id=data["id"],
            name=data["name"],
            date=data.get("date"),
            status=data.get("status") or "not_started",
            rules=data.get("rules") or {},
            payment_settings=data.get("payment_settings")
            or {"collect_payment": False, "registration_fee": None},
            description=data.get("description"),
            logo_url=data.get("logo_url"),
            banner_url=data.get("banner_url"),
            created_at=datetime.now(timezone.utc),
            created_by=data.get("created_by"),
            organizer_name=data.get("organizer_name"),
            organizer_mobile=data.get("organizer_mobile"),
            has_registration_limit=bool(data.get("has_registration_limit")),
            registration_limit=data.get("registration_limit"),
            registration_form_config=data.get("registration_form_config"),
        )
        s.add(e)
        s.commit()
        s.refresh(e)
        return event_to_dict(e)


def update_event(event_id: str, fields: dict[str, Any]) -> None:
    with _session() as s:
        e = s.get(Event, event_id)
        if not e:
            raise ValueError("Event not found")
        for k, v in fields.items():
            if hasattr(e, k):
                setattr(e, k, v)
        s.commit()


def list_categories(event_id: str) -> list[dict[str, Any]]:
    with _session() as s:
        rows = s.scalars(select(Category).where(Category.event_id == event_id)).all()
        return [category_to_dict(c) for c in rows]


def get_category(category_id: str) -> Optional[dict[str, Any]]:
    with _session() as s:
        c = s.get(Category, category_id)
        return category_to_dict(c) if c else None


def create_category(data: dict[str, Any]) -> dict[str, Any]:
    with _session() as s:
        c = Category(
            id=data["id"],
            event_id=data["event_id"],
            name=data["name"],
            description=data.get("description"),
            min_players=data.get("min_players") or 0,
            max_players=data.get("max_players") or 0,
            color=data.get("color"),
            base_price=data.get("base_price") or 0,
        )
        s.add(c)
        s.commit()
        s.refresh(c)
        return category_to_dict(c)


def update_category(category_id: str, fields: dict[str, Any]) -> dict[str, Any]:
    with _session() as s:
        c = s.get(Category, category_id)
        if not c:
            raise ValueError("Category not found")
        for k, v in fields.items():
            if hasattr(c, k) and k != "id":
                setattr(c, k, v)
        if "base_price" in fields:
            # Mirror firestore behavior: push base_price to players in category
            players = s.scalars(
                select(Player).where(Player.category_id == category_id)
            ).all()
            for p in players:
                p.base_price = fields["base_price"]
        s.commit()
        s.refresh(c)
        return category_to_dict(c)


def delete_category(category_id: str) -> None:
    with _session() as s:
        players = s.scalars(select(Player).where(Player.category_id == category_id)).all()
        for p in players:
            s.delete(p)
        c = s.get(Category, category_id)
        if c:
            s.delete(c)
        s.commit()


def list_teams(event_id: str) -> list[dict[str, Any]]:
    with _session() as s:
        teams = s.scalars(select(Team).where(Team.event_id == event_id)).all()
        out = []
        for t in teams:
            # Recompute spent like list endpoint does
            sold = s.scalars(
                select(Player).where(
                    Player.sold_to_team_id == t.id, Player.status == "sold"
                )
            ).all()
            spent = sum((p.sold_price or 0) for p in sold)
            t.spent = spent
            t.remaining = t.budget - spent
            t.players_count = len(sold)
            out.append(team_to_dict(t))
        s.commit()
        return out


def get_team(team_id: str) -> Optional[dict[str, Any]]:
    with _session() as s:
        t = s.get(Team, team_id)
        if not t:
            return None
        sold = s.scalars(
            select(Player).where(Player.sold_to_team_id == t.id, Player.status == "sold")
        ).all()
        spent = sum((p.sold_price or 0) for p in sold)
        t.spent = spent
        t.remaining = t.budget - spent
        t.players_count = len(sold)
        s.commit()
        s.refresh(t)
        return team_to_dict(t)


def create_team(data: dict[str, Any]) -> dict[str, Any]:
    with _session() as s:
        budget = data.get("budget") or 0
        t = Team(
            id=data["id"],
            event_id=data["event_id"],
            name=data["name"],
            budget=budget,
            spent=0,
            remaining=budget,
            max_squad_size=data.get("max_squad_size") or 0,
            logo_url=data.get("logo_url"),
            color=data.get("color"),
            admin_uid=data.get("admin_uid"),
            admin_email=data.get("admin_email"),
            players_count=0,
        )
        s.add(t)
        if data.get("admin_uid"):
            u = s.get(User, data["admin_uid"])
            if u:
                u.team_id = t.id
        s.commit()
        s.refresh(t)
        return team_to_dict(t)


def update_team(team_id: str, fields: dict[str, Any]) -> dict[str, Any]:
    with _session() as s:
        t = s.get(Team, team_id)
        if not t:
            raise ValueError("Team not found")
        for k, v in fields.items():
            if hasattr(t, k) and k != "id":
                setattr(t, k, v)
        if "budget" in fields:
            t.remaining = t.budget - (t.spent or 0)
        s.commit()
        s.refresh(t)
        return team_to_dict(t)


def list_players_for_event(
    event_id: str, status: Optional[str] = None
) -> list[dict[str, Any]]:
    """List players for an event. status may be a single value or comma-separated list."""
    with _session() as s:
        q = select(Player).where(Player.event_id == event_id)
        statuses: list[str] = []
        if status:
            statuses = [s.strip().lower() for s in str(status).split(",") if s.strip()]
            if len(statuses) == 1:
                q = q.where(Player.status == statuses[0])
            elif statuses:
                q = q.where(Player.status.in_(statuses))
        # Fallback: players only linked via category
        players = list(s.scalars(q).all())
        if not players:
            cat_ids = [
                c.id
                for c in s.scalars(
                    select(Category).where(Category.event_id == event_id)
                ).all()
            ]
            if cat_ids:
                q2 = select(Player).where(Player.category_id.in_(cat_ids))
                if len(statuses) == 1:
                    q2 = q2.where(Player.status == statuses[0])
                elif statuses:
                    q2 = q2.where(Player.status.in_(statuses))
                players = list(s.scalars(q2).all())
        return [player_to_dict(p) for p in players]


def get_player(player_id: str) -> Optional[dict[str, Any]]:
    with _session() as s:
        p = s.get(Player, player_id)
        return player_to_dict(p) if p else None


def list_players_for_team(team_id: str) -> list[dict[str, Any]]:
    with _session() as s:
        rows = s.scalars(
            select(Player).where(
                Player.sold_to_team_id == team_id, Player.status == "sold"
            )
        ).all()
        return [player_to_dict(p) for p in rows]


def list_players_for_category(category_id: str) -> list[dict[str, Any]]:
    with _session() as s:
        rows = s.scalars(select(Player).where(Player.category_id == category_id)).all()
        return [player_to_dict(p) for p in rows]


def clear_current_players(event_id: str, except_player_id: Optional[str] = None) -> int:
    """Reset CURRENT players for an event to AVAILABLE (except optional id)."""
    with _session() as s:
        q = select(Player).where(
            Player.event_id == event_id, Player.status == "current"
        )
        # Also match via categories if event_id missing on some rows
        players = list(s.scalars(q).all())
        if not players:
            cat_ids = [
                c.id
                for c in s.scalars(
                    select(Category).where(Category.event_id == event_id)
                ).all()
            ]
            if cat_ids:
                players = list(
                    s.scalars(
                        select(Player).where(
                            Player.category_id.in_(cat_ids), Player.status == "current"
                        )
                    ).all()
                )
        fixed = 0
        for p in players:
            if except_player_id and p.id == except_player_id:
                continue
            p.status = "available"
            fixed += 1
        s.commit()
        return fixed


def set_next_player(event_id: str, player_id: str) -> dict[str, Any]:
    """
    Atomically set current player for auction.
    Any previous CURRENT player (not sold/unsold) is moved to on_hold
    so they can be re-auctioned later without counting as available until ready.
    """
    with _session() as s:
        player = s.get(Player, player_id)
        if not player:
            raise ValueError("Player not found")
        if (player.status or "").lower() in ("sold",):
            raise ValueError("Cannot put a sold player on the block")

        # Previous CURRENT players for this event → on_hold (skipped without sale)
        cat_ids = [
            c.id
            for c in s.scalars(select(Category).where(Category.event_id == event_id)).all()
        ]
        if player.event_id:
            currents = list(
                s.scalars(
                    select(Player).where(
                        Player.event_id == event_id, Player.status == "current"
                    )
                ).all()
            )
        elif cat_ids:
            currents = list(
                s.scalars(
                    select(Player).where(
                        Player.category_id.in_(cat_ids), Player.status == "current"
                    )
                ).all()
            )
        else:
            currents = []

        held: list[dict[str, Any]] = []
        for p in currents:
            if p.id != player_id:
                p.status = "on_hold"
                held.append({"player_id": p.id, "player_name": p.name})

        player.status = "current"
        if not player.event_id:
            player.event_id = event_id

        state = s.get(AuctionState, event_id)
        if not state:
            state = AuctionState(
                event_id=event_id,
                status="in_progress",
                timer_duration=60,
            )
            s.add(state)
        now = datetime.now(timezone.utc)
        state.current_player_id = player_id
        state.current_bid = player.base_price or 0
        state.current_team_id = None
        state.current_team_name = None
        state.timer_started_at = now
        # Clear any in-progress selection wheel once a player is on the block
        meta = dict(state.raw_firestore or {}) if isinstance(state.raw_firestore, dict) else {}
        if "spin" in meta:
            meta.pop("spin", None)
            state.raw_firestore = meta

        s.commit()
        return {
            "player_id": player_id,
            "player_name": player.name,
            "base_price": player.base_price or 0,
            "held_players": held,
        }


def _meta_dict(state: AuctionState) -> dict[str, Any]:
    return dict(state.raw_firestore or {}) if isinstance(state.raw_firestore, dict) else {}


def set_spin_state(event_id: str, spin: Optional[dict[str, Any]]) -> dict[str, Any]:
    """Broadcast spinning-wheel selection to control + public boards."""
    with _session() as s:
        state = s.get(AuctionState, event_id)
        if not state:
            state = AuctionState(
                event_id=event_id,
                status="in_progress",
                timer_duration=60,
            )
            s.add(state)
        meta = _meta_dict(state)
        if spin is None:
            meta.pop("spin", None)
        else:
            meta["spin"] = spin
        state.raw_firestore = meta
        s.commit()
        s.refresh(state)
        return auction_state_to_dict(state)


def _set_last_result(state: AuctionState, result: dict[str, Any]) -> None:
    """Persist brief sold/unsold snapshot for public boards (12s UI window)."""
    meta = _meta_dict(state)
    meta["last_result"] = {
        **result,
        "at": datetime.now(timezone.utc).isoformat(),
    }
    state.raw_firestore = meta


def mark_player_unsold_atomic(player_id: str, event_id: str) -> dict[str, Any]:
    with _session() as s:
        player = s.get(Player, player_id)
        if not player:
            raise ValueError("Player not found")
        name = player.name
        photo = player.photo_url
        player.status = "unsold"
        state = s.get(AuctionState, event_id)
        if state and state.current_player_id == player_id:
            state.current_player_id = None
            state.current_bid = None
            state.current_team_id = None
            state.current_team_name = None
            _set_last_result(
                state,
                {
                    "type": "unsold",
                    "player_id": player_id,
                    "player_name": name,
                    "photo_url": photo,
                    "team_id": None,
                    "team_name": None,
                    "price": None,
                },
            )
        s.commit()
        return {"player_id": player_id, "player_name": name}


def finalize_bid_atomic(player_id: str, event_id: str) -> dict[str, Any]:
    """Sell to current bidder or mark unsold if no bid."""
    with _session() as s:
        state = s.execute(
            select(AuctionState).where(AuctionState.event_id == event_id).with_for_update()
        ).scalar_one_or_none()
        if not state:
            raise ValueError("Auction state not found")

        player = s.execute(
            select(Player).where(Player.id == player_id).with_for_update()
        ).scalar_one_or_none()
        if not player:
            raise ValueError("Player not found")

        if not state.current_team_id:
            player.status = "unsold"
            _set_last_result(
                state,
                {
                    "type": "unsold",
                    "player_id": player_id,
                    "player_name": player.name,
                    "photo_url": player.photo_url,
                    "team_id": None,
                    "team_name": None,
                    "price": None,
                },
            )
            state.current_player_id = None
            state.current_bid = None
            state.current_team_id = None
            state.current_team_name = None
            s.commit()
            return {"message": "Player marked as unsold", "sold": False}

        price = state.current_bid or 0
        team = s.execute(
            select(Team).where(Team.id == state.current_team_id).with_for_update()
        ).scalar_one_or_none()
        if not team:
            raise ValueError("Team not found")

        player.status = "sold"
        player.sold_to_team_id = team.id
        player.sold_price = price
        team.spent = (team.spent or 0) + price
        team.remaining = team.budget - team.spent
        team.players_count = (team.players_count or 0) + 1

        _set_last_result(
            state,
            {
                "type": "sold",
                "player_id": player_id,
                "player_name": player.name,
                "photo_url": player.photo_url,
                "team_id": team.id,
                "team_name": team.name,
                "team_logo_url": team.logo_url,
                "team_color": team.color,
                "price": price,
            },
        )
        state.current_player_id = None
        state.current_bid = None
        state.current_team_id = None
        state.current_team_name = None
        s.commit()
        return {
            "message": "Bid finalized successfully",
            "sold": True,
            "team_id": team.id,
            "team_name": team.name,
            "price": price,
        }


def create_player(data: dict[str, Any]) -> dict[str, Any]:
    with _session() as s:
        # Ensure event_id from category
        event_id = data.get("event_id")
        if not event_id and data.get("category_id"):
            cat = s.get(Category, data["category_id"])
            if cat:
                event_id = cat.event_id
        p = Player(
            id=data["id"],
            event_id=event_id,
            category_id=data["category_id"],
            name=data["name"],
            base_price=data.get("base_price") or 0,
            current_price=data.get("current_price"),
            photo_url=data.get("photo_url"),
            age=data.get("age"),
            position=data.get("position"),
            specialty=data.get("specialty"),
            stats=data.get("stats"),
            status=data.get("status") or "available",
            sold_to_team_id=data.get("sold_to_team_id"),
            sold_price=data.get("sold_price"),
            previous_team=data.get("previous_team"),
            cricheroes_link=data.get("cricheroes_link"),
            contact_number=data.get("contact_number"),
            district=data.get("district"),
            identity_proof_url=data.get("identity_proof_url"),
            is_priority=bool(data.get("is_priority")),
            extra_fields=data.get("extra_fields"),
        )
        s.add(p)
        s.commit()
        s.refresh(p)
        return player_to_dict(p)


def update_player(player_id: str, fields: dict[str, Any]) -> dict[str, Any]:
    with _session() as s:
        p = s.get(Player, player_id)
        if not p:
            raise ValueError("Player not found")
        for k, v in fields.items():
            if hasattr(p, k) and k != "id":
                setattr(p, k, v)
        s.commit()
        s.refresh(p)
        return player_to_dict(p)


def delete_player(player_id: str) -> None:
    with _session() as s:
        p = s.get(Player, player_id)
        if p:
            s.delete(p)
            s.commit()


def list_registrations(event_id: str) -> list[dict[str, Any]]:
    with _session() as s:
        rows = s.scalars(
            select(PlayerRegistration).where(PlayerRegistration.event_id == event_id)
        ).all()
        return [registration_to_dict(r) for r in rows]


def count_pending_registrations(event_id: str) -> int:
    with _session() as s:
        rows = s.scalars(
            select(PlayerRegistration).where(
                PlayerRegistration.event_id == event_id,
                PlayerRegistration.status == "pending_approval",
            )
        ).all()
        return len(rows)


def count_players_for_event(event_id: str) -> int:
    return len(list_players_for_event(event_id))


def get_registration(registration_id: str) -> Optional[dict[str, Any]]:
    with _session() as s:
        r = s.get(PlayerRegistration, registration_id)
        return registration_to_dict(r) if r else None


def create_registration(data: dict[str, Any]) -> dict[str, Any]:
    with _session() as s:
        r = PlayerRegistration(
            id=data["id"],
            event_id=data["event_id"],
            status=data.get("status") or "pending_approval",
            registered_at=datetime.now(timezone.utc),
            payment_order_id=data.get("payment_order_id"),
            name=data.get("name"),
            age=data.get("age"),
            position=data.get("position"),
            specialty=data.get("specialty"),
            previous_team=data.get("previous_team"),
            cricheroes_link=data.get("cricheroes_link"),
            contact_number=data.get("contact_number"),
            email=data.get("email"),
            photo_url=data.get("photo_url"),
            district=data.get("district"),
            identity_proof_url=data.get("identity_proof_url"),
            stats=data.get("stats"),
            extra_fields=data.get("extra_fields"),
        )
        s.add(r)
        if data.get("payment_order_id"):
            po = s.get(PaymentOrder, data["payment_order_id"])
            if po:
                po.registration_completed = True
                po.registration_id = r.id
        s.commit()
        s.refresh(r)
        return registration_to_dict(r)


def update_registration(registration_id: str, fields: dict[str, Any]) -> dict[str, Any]:
    with _session() as s:
        r = s.get(PlayerRegistration, registration_id)
        if not r:
            raise ValueError("Registration not found")
        for k, v in fields.items():
            if hasattr(r, k) and k != "id":
                setattr(r, k, v)
        s.commit()
        s.refresh(r)
        return registration_to_dict(r)


def approve_registration_atomic(
    registration_id: str,
    *,
    category_id: str,
    base_price: int,
) -> dict[str, Any]:
    """Create player from registration and mark registration approved."""
    with _session() as s:
        r = s.get(PlayerRegistration, registration_id)
        if not r:
            raise ValueError("Registration not found")
        cat = s.get(Category, category_id)
        if not cat:
            raise ValueError("Category not found")
        player_id = str(uuid.uuid4())
        # Carry registration extras (custom form fields + email if present on reg)
        extra = dict(r.extra_fields or {})
        if getattr(r, "email", None) and "email" not in extra:
            extra["email"] = r.email
        p = Player(
            id=player_id,
            event_id=r.event_id or cat.event_id,
            category_id=category_id,
            name=r.name or "Unknown",
            base_price=base_price,
            age=r.age,
            position=r.position,
            specialty=r.specialty,
            previous_team=r.previous_team,
            cricheroes_link=r.cricheroes_link,
            contact_number=r.contact_number,
            district=r.district,
            identity_proof_url=r.identity_proof_url,
            stats=r.stats,
            status="available",
            photo_url=r.photo_url,
            extra_fields=extra or None,
        )
        s.add(p)
        r.status = "approved"
        r.approved_at = datetime.now(timezone.utc)
        r.player_id = player_id
        s.commit()
        return {"player_id": player_id, "registration_id": registration_id}


def make_unsold_available(event_id: str) -> int:
    with _session() as s:
        players = list(
            s.scalars(
                select(Player).where(
                    Player.event_id == event_id, Player.status == "unsold"
                )
            ).all()
        )
        if not players:
            cat_ids = [
                c.id
                for c in s.scalars(
                    select(Category).where(Category.event_id == event_id)
                ).all()
            ]
            if cat_ids:
                players = list(
                    s.scalars(
                        select(Player).where(
                            Player.category_id.in_(cat_ids), Player.status == "unsold"
                        )
                    ).all()
                )
        for p in players:
            p.status = "available"
        s.commit()
        return len(players)


def release_player_atomic(player_id: str) -> dict[str, Any]:
    """Release sold player back to available; refund team purse."""
    with _session() as s:
        player = s.execute(
            select(Player).where(Player.id == player_id).with_for_update()
        ).scalar_one_or_none()
        if not player:
            raise ValueError("Player not found")
        if player.status != "sold":
            raise ValueError("Player is not sold to any team")
        team_id = player.sold_to_team_id
        sold_price = player.sold_price or 0
        if not team_id:
            raise ValueError("Player has no associated team")
        team = s.execute(
            select(Team).where(Team.id == team_id).with_for_update()
        ).scalar_one_or_none()
        if not team:
            raise ValueError("Team not found")
        name = player.name
        team_name = team.name
        player.status = "available"
        player.sold_to_team_id = None
        player.sold_price = None
        team.spent = max(0, (team.spent or 0) - sold_price)
        team.remaining = team.budget - team.spent
        team.players_count = max(0, (team.players_count or 0) - 1)
        s.commit()
        return {
            "player_id": player_id,
            "player_name": name,
            "released_from_team": team_name,
            "refunded_amount": sold_price,
        }


def get_auction_state(event_id: str) -> Optional[dict[str, Any]]:
    with _session() as s:
        a = s.get(AuctionState, event_id)
        if not a:
            return None
        d = auction_state_to_dict(a)
        # Prefer bids for current player so boards show this lot's call trail
        q = select(Bid).where(Bid.event_id == event_id)
        if a.current_player_id:
            q = q.where(Bid.player_id == a.current_player_id)
        bids = s.scalars(
            q.order_by(Bid.created_at.desc().nullslast()).limit(20)
        ).all()
        d["bid_history"] = list(reversed([bid_to_dict(b) for b in bids]))
        return d


def upsert_auction_state(event_id: str, fields: dict[str, Any]) -> dict[str, Any]:
    with _session() as s:
        a = s.get(AuctionState, event_id)
        if not a:
            a = AuctionState(
                event_id=event_id,
                status=fields.get("status") or "not_started",
                timer_duration=fields.get("timer_duration") or 60,
            )
            s.add(a)
        for k, v in fields.items():
            if hasattr(a, k) and k != "event_id":
                setattr(a, k, v)
        s.commit()
        s.refresh(a)
        return auction_state_to_dict(a)


def place_bid_atomic(
    *,
    player_id: str,
    event_id: str,
    team_id: str,
    team_name: str,
    amount: int,
) -> dict[str, Any]:
    """Transactional bid placement with row locks."""
    with _session() as s:
        # Lock auction state + team
        state = s.execute(
            select(AuctionState).where(AuctionState.event_id == event_id).with_for_update()
        ).scalar_one_or_none()
        if not state:
            raise ValueError("Auction not started")

        team = s.execute(
            select(Team).where(Team.id == team_id).with_for_update()
        ).scalar_one_or_none()
        if not team:
            raise ValueError("Team not found")

        player = s.get(Player, player_id)
        if not player:
            raise ValueError("Player not found")

        current_bid = state.current_bid or 0
        if amount <= current_bid:
            raise ValueError("Bid amount must be higher than current bid")
        if team.remaining < amount:
            raise ValueError("Insufficient budget")

        bid_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        bid = Bid(
            id=bid_id,
            event_id=event_id,
            player_id=player_id,
            team_id=team_id,
            team_name=team_name,
            amount=amount,
            created_at=now,
        )
        s.add(bid)
        state.current_bid = amount
        state.current_team_id = team_id
        state.current_team_name = team_name
        state.timer_started_at = now
        if not state.current_player_id:
            state.current_player_id = player_id
        s.commit()
        return bid_to_dict(bid)


def sell_player_atomic(
    *,
    player_id: str,
    team_id: str,
    price: int,
    event_id: str,
) -> dict[str, Any]:
    """Transactional sell: player + team purse + clear auction state."""
    with _session() as s:
        player = s.execute(
            select(Player).where(Player.id == player_id).with_for_update()
        ).scalar_one_or_none()
        if not player:
            raise ValueError("Player not found")
        if player.status not in ("available", "current"):
            raise ValueError("Player not available for sale")

        team = s.execute(
            select(Team).where(Team.id == team_id).with_for_update()
        ).scalar_one_or_none()
        if not team:
            raise ValueError("Team not found")
        if team.remaining < price:
            raise ValueError("Team has insufficient budget")

        player.status = "sold"
        player.sold_to_team_id = team_id
        player.sold_price = price

        team.spent = (team.spent or 0) + price
        team.remaining = team.budget - team.spent
        team.players_count = (team.players_count or 0) + 1

        state = s.execute(
            select(AuctionState).where(AuctionState.event_id == event_id).with_for_update()
        ).scalar_one_or_none()
        if state and state.current_player_id == player_id:
            _set_last_result(
                state,
                {
                    "type": "sold",
                    "player_id": player_id,
                    "player_name": player.name,
                    "photo_url": player.photo_url,
                    "team_id": team_id,
                    "team_name": team.name,
                    "team_logo_url": team.logo_url,
                    "team_color": team.color,
                    "price": price,
                },
            )
            state.current_player_id = None
            state.current_bid = None
            state.current_team_id = None
            state.current_team_name = None

        s.commit()
        return {
            "player": player_to_dict(player),
            "team": team_to_dict(team),
        }


def list_sponsors(event_id: str) -> list[dict[str, Any]]:
    with _session() as s:
        rows = s.scalars(select(Sponsor).where(Sponsor.event_id == event_id)).all()
        return [sponsor_to_dict(x) for x in rows]


def create_sponsor(data: dict[str, Any]) -> dict[str, Any]:
    with _session() as s:
        sp = Sponsor(
            id=data["id"],
            event_id=data["event_id"],
            name=data["name"],
            description=data.get("description"),
            logo_url=data.get("logo_url"),
            website=data.get("website"),
            contact_email=data.get("contact_email"),
            contact_phone=data.get("contact_phone"),
            address=data.get("address"),
            sponsorship_amount=data.get("sponsorship_amount"),
            tier=data.get("tier") or "bronze",
            is_active=bool(data.get("is_active", True)),
            created_at=datetime.now(timezone.utc),
        )
        s.add(sp)
        s.commit()
        s.refresh(sp)
        return sponsor_to_dict(sp)


def get_sponsor(sponsor_id: str) -> Optional[dict[str, Any]]:
    with _session() as s:
        sp = s.get(Sponsor, sponsor_id)
        return sponsor_to_dict(sp) if sp else None


def update_sponsor(sponsor_id: str, fields: dict[str, Any]) -> dict[str, Any]:
    with _session() as s:
        sp = s.get(Sponsor, sponsor_id)
        if not sp:
            raise ValueError("Sponsor not found")
        for k, v in fields.items():
            if hasattr(sp, k) and k != "id":
                setattr(sp, k, v)
        s.commit()
        s.refresh(sp)
        return sponsor_to_dict(sp)


def delete_sponsor(sponsor_id: str) -> None:
    with _session() as s:
        sp = s.get(Sponsor, sponsor_id)
        if not sp:
            raise ValueError("Sponsor not found")
        s.delete(sp)
        s.commit()


def get_payment(order_id: str) -> Optional[dict[str, Any]]:
    with _session() as s:
        p = s.get(PaymentOrder, order_id)
        return payment_to_dict(p) if p else None


def create_payment(data: dict[str, Any]) -> dict[str, Any]:
    with _session() as s:
        p = PaymentOrder(
            order_id=data["order_id"],
            event_id=data["event_id"],
            customer_name=data.get("customer_name"),
            customer_email=data.get("customer_email"),
            customer_phone=data.get("customer_phone"),
            amount=data.get("amount") or 0,
            currency=data.get("currency") or "INR",
            status=data.get("status") or "PENDING",
            payment_session_id=data.get("payment_session_id"),
            created_at=datetime.now(timezone.utc),
        )
        s.add(p)
        s.commit()
        s.refresh(p)
        return payment_to_dict(p)


def update_payment(order_id: str, fields: dict[str, Any]) -> dict[str, Any]:
    with _session() as s:
        p = s.get(PaymentOrder, order_id)
        if not p:
            raise ValueError("Payment not found")
        for k, v in fields.items():
            if hasattr(p, k) and k != "order_id":
                setattr(p, k, v)
        s.commit()
        s.refresh(p)
        return payment_to_dict(p)


def list_payments(event_id: str) -> list[dict[str, Any]]:
    with _session() as s:
        rows = s.scalars(
            select(PaymentOrder).where(PaymentOrder.event_id == event_id)
        ).all()
        return [payment_to_dict(p) for p in rows]


def validate_public_token(team_id: str, token: str) -> bool:
    with _session() as s:
        row = s.scalars(
            select(PublicTeamToken).where(
                PublicTeamToken.team_id == team_id,
                PublicTeamToken.token == token,
            )
        ).first()
        if not row:
            return False
        if row.expires_at and row.expires_at < datetime.now(timezone.utc):
            return False
        return True


def create_public_token(data: dict[str, Any]) -> dict[str, Any]:
    with _session() as s:
        tok = PublicTeamToken(
            id=data.get("id") or str(uuid.uuid4()),
            token=data["token"],
            team_id=data["team_id"],
            expires_at=data.get("expires_at"),
            created_at=datetime.now(timezone.utc),
            created_by=data.get("created_by"),
        )
        s.add(tok)
        s.commit()
        return {
            "id": tok.id,
            "token": tok.token,
            "team_id": tok.team_id,
            "expires_at": tok.expires_at.isoformat() if tok.expires_at else None,
        }


def create_event_broadcast_token(data: dict[str, Any]) -> dict[str, Any]:
    with _session() as s:
        tok = PublicEventBroadcastToken(
            id=data.get("id") or str(uuid.uuid4()),
            token=data["token"],
            event_id=data["event_id"],
            expires_at=data.get("expires_at"),
            created_at=datetime.now(timezone.utc),
            created_by=data.get("created_by"),
            label=data.get("label"),
            revoked=False,
        )
        s.add(tok)
        s.commit()
        return {
            "id": tok.id,
            "token": tok.token,
            "event_id": tok.event_id,
            "expires_at": tok.expires_at.isoformat() if tok.expires_at else None,
            "label": tok.label,
        }


def resolve_event_broadcast_token(token: str) -> Optional[str]:
    """Return event_id if token is valid, else None. Strict validation only."""
    if not token or len(token) < 16:
        return None
    with _session() as s:
        row = s.scalars(
            select(PublicEventBroadcastToken).where(
                PublicEventBroadcastToken.token == token,
                PublicEventBroadcastToken.revoked.is_(False),
            )
        ).first()
        if not row:
            return None
        if row.expires_at and row.expires_at < datetime.now(timezone.utc):
            return None
        return row.event_id


def list_available_team_admins() -> list[dict[str, Any]]:
    with _session() as s:
        users = s.scalars(
            select(User).where(User.role == "team_admin", User.team_id.is_(None))
        ).all()
        return [user_to_dict(u) for u in users]


def _bank_to_dict(b: BankDetails) -> dict[str, Any]:
    return {
        "id": b.id,
        "user_id": b.user_id,
        "bank_name": b.bank_name,
        "account_holder_name": b.account_holder_name,
        "account_number": b.account_number,
        "ifsc_code": b.ifsc_code,
        "swift_code": b.swift_code,
        "branch_name": b.branch_name,
        "upi_id": b.upi_id,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "updated_at": b.updated_at.isoformat() if b.updated_at else None,
    }


def get_bank_details(user_id: str) -> Optional[dict[str, Any]]:
    with _session() as s:
        b = s.scalars(select(BankDetails).where(BankDetails.user_id == user_id)).first()
        if not b:
            return None
        return _bank_to_dict(b)


def upsert_bank_details(user_id: str, data: dict[str, Any]) -> dict[str, Any]:
    with _session() as s:
        b = s.scalars(select(BankDetails).where(BankDetails.user_id == user_id)).first()
        now = datetime.now(timezone.utc)
        if b:
            b.bank_name = data.get("bank_name", b.bank_name)
            b.account_holder_name = data.get("account_holder_name", b.account_holder_name)
            b.account_number = data.get("account_number", b.account_number)
            b.ifsc_code = data.get("ifsc_code", b.ifsc_code)
            b.swift_code = data.get("swift_code", b.swift_code)
            b.branch_name = data.get("branch_name", b.branch_name)
            b.upi_id = data.get("upi_id", b.upi_id)
            b.updated_at = now
        else:
            b = BankDetails(
                id=data.get("id") or str(uuid.uuid4()),
                user_id=user_id,
                bank_name=data.get("bank_name"),
                account_holder_name=data.get("account_holder_name"),
                account_number=data.get("account_number"),
                ifsc_code=data.get("ifsc_code"),
                swift_code=data.get("swift_code"),
                branch_name=data.get("branch_name"),
                upi_id=data.get("upi_id"),
                created_at=now,
                updated_at=now,
            )
            s.add(b)
        s.commit()
        s.refresh(b)
        return _bank_to_dict(b)


def _gateway_to_dict(g: PaymentGatewaySettings) -> dict[str, Any]:
    return {
        "id": g.id,
        "cashfree_app_id": g.cashfree_app_id,
        "cashfree_secret_key": g.cashfree_secret_key,
        "cashfree_mode": g.cashfree_mode,
        "created_at": g.created_at.isoformat() if g.created_at else None,
        "updated_at": g.updated_at.isoformat() if g.updated_at else None,
        "updated_by": g.updated_by,
    }


def get_payment_gateway_settings() -> Optional[dict[str, Any]]:
    """Load Cashfree settings from Postgres, falling back to env vars for local dev."""
    import os

    with _session() as s:
        g = s.get(PaymentGatewaySettings, "payment_gateway_config")
        if g:
            return _gateway_to_dict(g)

    # Env fallback (local testing without super-admin UI seed)
    app_id = os.getenv("CASHFREE_APP_ID")
    secret = os.getenv("CASHFREE_SECRET_KEY")
    if app_id and secret:
        return {
            "id": "payment_gateway_config",
            "cashfree_app_id": app_id,
            "cashfree_secret_key": secret,
            "cashfree_mode": os.getenv("CASHFREE_MODE", "sandbox"),
            "created_at": None,
            "updated_at": None,
            "updated_by": "env",
        }
    return None


def upsert_payment_gateway_settings(data: dict[str, Any], updated_by: str) -> dict[str, Any]:
    with _session() as s:
        now = datetime.now(timezone.utc)
        g = s.get(PaymentGatewaySettings, "payment_gateway_config")
        if g:
            g.cashfree_app_id = data["cashfree_app_id"]
            g.cashfree_secret_key = data["cashfree_secret_key"]
            g.cashfree_mode = data.get("cashfree_mode") or "sandbox"
            g.updated_at = now
            g.updated_by = updated_by
        else:
            g = PaymentGatewaySettings(
                id="payment_gateway_config",
                cashfree_app_id=data["cashfree_app_id"],
                cashfree_secret_key=data["cashfree_secret_key"],
                cashfree_mode=data.get("cashfree_mode") or "sandbox",
                created_at=now,
                updated_at=now,
                updated_by=updated_by,
            )
            s.add(g)
        s.commit()
        s.refresh(g)
        return _gateway_to_dict(g)


def health_check() -> bool:
    with _session() as s:
        s.execute(select(1))
        return True
