"""
Local Postgres integration tests for transactional auction paths.

Requires:
  - Docker Postgres running (./scripts/local_db_up.sh)
  - DATABASE_URL set (default local Docker URL)

Run:
  cd backend
  export DATABASE_URL=postgresql+psycopg://powerauction:powerauction@localhost:5434/powerauction
  export DATA_BACKEND=postgres
  export PYTHONPATH=.
  pytest tests/test_pg_repo_auction.py -v
"""

from __future__ import annotations

import os
import uuid

import pytest

# Defaults for local Docker
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://powerauction:powerauction@localhost:5434/powerauction",
)
os.environ.setdefault("DATA_BACKEND", "postgres")

# Clear settings cache after env set
try:
    from app.core.config import get_settings

    get_settings.cache_clear()
except Exception:
    pass


def _db_available() -> bool:
    try:
        from app.data import pg_repo

        return pg_repo.health_check()
    except Exception:
        return False


pytestmark = pytest.mark.skipif(not _db_available(), reason="Local Postgres not available")


@pytest.fixture()
def auction_fixture():
    from app.data import pg_repo

    suffix = uuid.uuid4().hex[:8]
    org = f"test-org-{suffix}"
    admin = f"test-admin-{suffix}"
    event_id = f"test-event-{suffix}"
    cat_id = f"test-cat-{suffix}"
    team_id = f"test-team-{suffix}"
    p1 = f"test-p1-{suffix}"
    p2 = f"test-p2-{suffix}"

    pg_repo.upsert_user(
        {
            "uid": org,
            "email": f"org-{suffix}@test.local",
            "role": "event_organizer",
            "display_name": "Test Org",
        }
    )
    pg_repo.upsert_user(
        {
            "uid": admin,
            "email": f"admin-{suffix}@test.local",
            "role": "team_admin",
            "display_name": "Test Admin",
        }
    )
    pg_repo.create_event(
        {
            "id": event_id,
            "name": f"Test Auction {suffix}",
            "date": "2026-12-01",
            "status": "not_started",
            "rules": {},
            "payment_settings": {"collect_payment": False, "registration_fee": None},
            "created_by": org,
        }
    )
    pg_repo.create_category(
        {
            "id": cat_id,
            "event_id": event_id,
            "name": "A",
            "min_players": 1,
            "max_players": 5,
            "base_price": 10000,
        }
    )
    pg_repo.create_team(
        {
            "id": team_id,
            "event_id": event_id,
            "name": "Tigers",
            "budget": 500_000,
            "max_squad_size": 11,
            "admin_uid": admin,
            "admin_email": f"admin-{suffix}@test.local",
        }
    )
    for pid, name in ((p1, "Player One"), (p2, "Player Two")):
        pg_repo.create_player(
            {
                "id": pid,
                "event_id": event_id,
                "category_id": cat_id,
                "name": name,
                "base_price": 10000,
                "status": "available",
            }
        )

    yield {
        "event_id": event_id,
        "team_id": team_id,
        "p1": p1,
        "p2": p2,
        "admin": admin,
        "org": org,
    }

    # Best-effort cleanup (order matters for FKs)
    try:
        from sqlalchemy import select

        from app.data.pg_repo import _session
        from app.models import (
            AuctionState,
            Bid,
            Category,
            Event,
            Player,
            PlayerRegistration,
            Team,
            User,
        )

        with _session() as s:
            for bid in s.scalars(select(Bid).where(Bid.event_id == event_id)).all():
                s.delete(bid)
            st = s.get(AuctionState, event_id)
            if st:
                s.delete(st)
            for reg in s.scalars(
                select(PlayerRegistration).where(PlayerRegistration.event_id == event_id)
            ).all():
                s.delete(reg)
            for pid in (p1, p2):
                pl = s.get(Player, pid)
                if pl:
                    s.delete(pl)
            # also clean approved registration players if any
            for pl in s.scalars(select(Player).where(Player.event_id == event_id)).all():
                s.delete(pl)
            t = s.get(Team, team_id)
            if t:
                s.delete(t)
            c = s.get(Category, cat_id)
            if c:
                s.delete(c)
            e = s.get(Event, event_id)
            if e:
                s.delete(e)
            for uid in (org, admin):
                u = s.get(User, uid)
                if u:
                    s.delete(u)
            s.commit()
    except Exception:
        pass


def test_bid_finalize_and_purse(auction_fixture):
    from app.data import pg_repo

    eid = auction_fixture["event_id"]
    tid = auction_fixture["team_id"]
    p1 = auction_fixture["p1"]

    pg_repo.update_event(eid, {"status": "in_progress"})
    pg_repo.upsert_auction_state(eid, {"status": "in_progress", "timer_duration": 60})
    nxt = pg_repo.set_next_player(eid, p1)
    assert nxt["player_id"] == p1
    assert nxt["base_price"] == 10000

    bid = pg_repo.place_bid_atomic(
        player_id=p1,
        event_id=eid,
        team_id=tid,
        team_name="Tigers",
        amount=15000,
    )
    assert bid["amount"] == 15000

    # Lower/equal bid rejected
    with pytest.raises(ValueError):
        pg_repo.place_bid_atomic(
            player_id=p1,
            event_id=eid,
            team_id=tid,
            team_name="Tigers",
            amount=15000,
        )

    fin = pg_repo.finalize_bid_atomic(p1, eid)
    assert fin["sold"] is True
    assert fin["price"] == 15000

    team = pg_repo.get_team(tid)
    assert team["spent"] == 15000
    assert team["remaining"] == 485_000
    assert team["players_count"] == 1

    player = pg_repo.get_player(p1)
    assert player["status"] == "sold"
    assert player["sold_price"] == 15000
    assert player["sold_to_team_id"] == tid


def test_sell_and_release(auction_fixture):
    from app.data import pg_repo

    eid = auction_fixture["event_id"]
    tid = auction_fixture["team_id"]
    p2 = auction_fixture["p2"]

    sold = pg_repo.sell_player_atomic(
        player_id=p2, team_id=tid, price=20000, event_id=eid
    )
    assert sold["player"]["status"] == "sold"
    assert sold["team"]["spent"] >= 20000

    rel = pg_repo.release_player_atomic(p2)
    assert rel["refunded_amount"] == 20000
    player = pg_repo.get_player(p2)
    assert player["status"] == "available"
    assert player["sold_to_team_id"] is None


def test_registration_flow(auction_fixture):
    from app.data import pg_repo

    eid = auction_fixture["event_id"]
    cat = pg_repo.list_categories(eid)[0]["id"]
    reg_id = f"reg-{uuid.uuid4().hex[:8]}"
    pg_repo.create_registration(
        {
            "id": reg_id,
            "event_id": eid,
            "name": "Applicant",
            "status": "pending_approval",
            "email": "app@test.local",
        }
    )
    assert pg_repo.count_pending_registrations(eid) >= 1
    result = pg_repo.approve_registration_atomic(
        reg_id, category_id=cat, base_price=12000
    )
    assert result["player_id"]
    player = pg_repo.get_player(result["player_id"])
    assert player["name"] == "Applicant"
    assert player["base_price"] == 12000
