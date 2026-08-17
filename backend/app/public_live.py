"""
Assemble public-safe DTOs for live auction broadcast boards.
No private fields (contact, payment, admin emails, bank).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional


def _public_sponsors(sponsors: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out = []
    for s in sponsors or []:
        if s.get("is_active") is False:
            continue
        out.append(
            {
                "id": s.get("id"),
                "name": s.get("name"),
                "logo_url": s.get("logo_url"),
                "website": s.get("website"),
                "tier": s.get("tier") or "bronze",
            }
        )
    # Prefer higher tiers first if present
    tier_rank = {"platinum": 0, "gold": 1, "silver": 2, "bronze": 3}
    out.sort(key=lambda x: tier_rank.get(str(x.get("tier") or "").lower(), 9))
    return out


def _public_event(event: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": event.get("id"),
        "name": event.get("name"),
        "logo_url": event.get("logo_url"),
        "banner_url": event.get("banner_url"),
        "status": event.get("status"),
        "date": event.get("date"),
    }


def _last_result_fresh(auction: Optional[dict[str, Any]], window_sec: float = 12.0) -> Optional[dict[str, Any]]:
    if not auction:
        return None
    lr = auction.get("last_result")
    if not isinstance(lr, dict) or not lr.get("type"):
        return None
    at = lr.get("at")
    if not at:
        return lr
    try:
        when = datetime.fromisoformat(str(at).replace("Z", "+00:00"))
        if when.tzinfo is None:
            when = when.replace(tzinfo=timezone.utc)
        age = (datetime.now(timezone.utc) - when).total_seconds()
        if age > window_sec:
            return None
    except Exception:
        return lr
    return lr


def _spin_fresh(auction: Optional[dict[str, Any]], window_sec: float = 18.0) -> Optional[dict[str, Any]]:
    """Public-safe spinning wheel payload while active and within the window."""
    if not auction:
        return None
    spin = auction.get("spin")
    if not isinstance(spin, dict) or not spin.get("winner_id"):
        return None
    at = spin.get("started_at") or spin.get("at")
    if at:
        try:
            when = datetime.fromisoformat(str(at).replace("Z", "+00:00"))
            if when.tzinfo is None:
                when = when.replace(tzinfo=timezone.utc)
            age = (datetime.now(timezone.utc) - when).total_seconds()
            if age > window_sec:
                return None
        except Exception:
            pass
    players = []
    for p in spin.get("players") or []:
        if not isinstance(p, dict) or not p.get("id"):
            continue
        players.append(
            {
                "id": p.get("id"),
                "name": p.get("name") or "Player",
                "photo_url": p.get("photo_url"),
                "position": p.get("position"),
                "base_price": p.get("base_price"),
            }
        )
    if not players:
        return None
    return {
        "winner_id": spin.get("winner_id"),
        "started_at": at,
        "players": players,
    }


def _derive_display_state(
    auction: Optional[dict[str, Any]],
    player: Optional[dict[str, Any]],
) -> str:
    if not auction:
        return "loading"
    status = (auction.get("status") or "not_started").lower()
    if status == "completed":
        return "completed"
    # Selection wheel takes the stage while active
    if _spin_fresh(auction):
        return "spinning"
    # Prefer brief sold/unsold celebration even if player cleared from block
    lr = _last_result_fresh(auction)
    if lr and not player:
        if lr.get("type") == "sold":
            return "sold"
        if lr.get("type") == "unsold":
            return "unsold"
    if status == "paused":
        return "paused"
    if status == "not_started":
        return "waiting"
    # in_progress
    if not player:
        return "no_player"
    pstatus = (player.get("status") or "").lower()
    if pstatus == "sold":
        return "sold"
    if pstatus == "unsold":
        return "unsold"
    if auction.get("current_bid") is not None and auction.get("current_team_id"):
        return "bidding"
    return "selected"


def public_player_payload(
    *,
    event: dict[str, Any],
    auction: Optional[dict[str, Any]],
    player: Optional[dict[str, Any]],
    category: Optional[dict[str, Any]],
    sold_team: Optional[dict[str, Any]],
    sponsors: list[dict[str, Any]],
) -> dict[str, Any]:
    auction = auction or {
        "status": "not_started",
        "current_player_id": None,
        "current_bid": None,
        "current_team_id": None,
        "current_team_name": None,
        "timer_started_at": None,
        "timer_duration": (event.get("rules") or {}).get("timer_duration") or 60,
        "bid_history": [],
    }

    public_player = None
    if player:
        stats = player.get("stats") or {}
        if hasattr(stats, "model_dump"):
            stats = stats.model_dump()
        # Only non-null stat keys
        clean_stats = {
            k: v
            for k, v in (stats or {}).items()
            if v is not None and k in ("matches", "runs", "wickets", "goals", "assists")
        }
        public_player = {
            "id": player.get("id"),
            "name": player.get("name"),
            "photo_url": player.get("photo_url"),
            "category_id": player.get("category_id"),
            "category_name": (category or {}).get("name"),
            "category_color": (category or {}).get("color"),
            "base_price": player.get("base_price"),
            "position": player.get("position"),
            "specialty": player.get("specialty"),
            "age": player.get("age"),
            "stats": clean_stats or None,
            "status": (player.get("status") or "").lower() or None,
            "sold_price": player.get("sold_price"),
            "sold_to_team_id": player.get("sold_to_team_id"),
            "sold_to_team_name": (sold_team or {}).get("name"),
            "sold_to_team_logo_url": (sold_team or {}).get("logo_url"),
            "sold_to_team_color": (sold_team or {}).get("color"),
        }

    last_result = _last_result_fresh(auction)
    spin = _spin_fresh(auction)
    # Synthetic player from last_result for SOLD/UNSOLD celebration frames
    if not public_player and last_result:
        public_player = {
            "id": last_result.get("player_id"),
            "name": last_result.get("player_name"),
            "photo_url": last_result.get("photo_url"),
            "status": last_result.get("type"),
            "sold_price": last_result.get("price"),
            "sold_to_team_id": last_result.get("team_id"),
            "sold_to_team_name": last_result.get("team_name"),
            "sold_to_team_logo_url": last_result.get("team_logo_url"),
            "sold_to_team_color": last_result.get("team_color"),
            "base_price": None,
            "category_name": None,
            "stats": None,
        }

    bid_history = auction.get("bid_history") or []
    if not isinstance(bid_history, list):
        bid_history = []
    # Last few bids only; strip to public fields
    public_bids = []
    for b in bid_history[-12:]:
        if not isinstance(b, dict):
            continue
        public_bids.append(
            {
                "team_name": b.get("team_name"),
                "amount": b.get("amount"),
                "timestamp": b.get("timestamp"),
            }
        )

    # Timer duration: prefer auction state, else event rules
    timer_duration = auction.get("timer_duration")
    if not timer_duration:
        timer_duration = (event.get("rules") or {}).get("timer_duration") or 60

    return {
        "event": _public_event(event),
        "auction": {
            "status": auction.get("status") or "not_started",
            "current_bid": auction.get("current_bid"),
            "current_team_id": auction.get("current_team_id"),
            "current_team_name": auction.get("current_team_name"),
            "timer_started_at": auction.get("timer_started_at"),
            "timer_duration": timer_duration,
            "bid_history": public_bids,
            "last_result": last_result,
            "spin": spin,
        },
        "player": public_player,
        "sponsors": _public_sponsors(sponsors),
        "display_state": _derive_display_state(auction, public_player if player else None),
        "server_time": datetime.now(timezone.utc).isoformat(),
    }


def public_teams_payload(
    *,
    event: dict[str, Any],
    auction: Optional[dict[str, Any]],
    teams: list[dict[str, Any]],
    categories: list[dict[str, Any]],
    sold_players: list[dict[str, Any]],
    sponsors: list[dict[str, Any]],
) -> dict[str, Any]:
    # Count sold players per team per category
    by_team_cat: dict[str, dict[str, int]] = {}
    by_team_count: dict[str, int] = {}
    for p in sold_players or []:
        if (p.get("status") or "").lower() != "sold":
            # list may already be sold-only
            if p.get("sold_to_team_id") is None:
                continue
        tid = p.get("sold_to_team_id")
        if not tid:
            continue
        by_team_count[tid] = by_team_count.get(tid, 0) + 1
        cid = p.get("category_id") or "_none"
        by_team_cat.setdefault(tid, {})
        by_team_cat[tid][cid] = by_team_cat[tid].get(cid, 0) + 1

    team_rows = []
    # Stable order: name then id
    ordered = sorted(teams or [], key=lambda t: ((t.get("name") or "").lower(), t.get("id") or ""))
    for t in ordered:
        tid = t.get("id")
        budget = int(t.get("budget") or 0)
        spent = int(t.get("spent") or 0)
        remaining = t.get("remaining")
        if remaining is None:
            remaining = budget - spent
        remaining = int(remaining)
        max_squad = int(t.get("max_squad_size") or 0)
        players_count = int(t.get("players_count") or by_team_count.get(tid, 0))
        util = round((spent / budget) * 100, 1) if budget > 0 else 0.0

        cat_progress = []
        for c in categories or []:
            cid = c.get("id")
            selected = by_team_cat.get(tid, {}).get(cid, 0)
            min_req = int(c.get("min_players") or 0)
            max_all = int(c.get("max_players") or 0)
            remaining_needed = max(0, min_req - selected)
            # Only include categories with a real requirement or any selected
            if min_req <= 0 and selected <= 0 and max_all <= 0:
                continue
            if min_req <= 0 and selected <= 0:
                continue
            cat_progress.append(
                {
                    "category_id": cid,
                    "name": c.get("name"),
                    "color": c.get("color"),
                    "selected": selected,
                    "min_required": min_req,
                    "max_allowed": max_all,
                    "remaining_needed": remaining_needed,
                }
            )

        team_rows.append(
            {
                "id": tid,
                "name": t.get("name"),
                "logo_url": t.get("logo_url"),
                "color": t.get("color"),
                "budget": budget,
                "spent": spent,
                "remaining": remaining,
                "players_count": players_count,
                "max_squad_size": max_squad,
                "slots_remaining": max(0, max_squad - players_count) if max_squad else None,
                "purse_utilization_pct": util,
                "categories": cat_progress,
            }
        )

    auction = auction or {}
    return {
        "event": _public_event(event),
        "auction_status": auction.get("status") or "not_started",
        "current_team_id": auction.get("current_team_id"),
        "current_team_name": auction.get("current_team_name"),
        "current_bid": auction.get("current_bid"),
        "teams": team_rows,
        "sponsors": _public_sponsors(sponsors),
        "server_time": datetime.now(timezone.utc).isoformat(),
    }
