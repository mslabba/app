#!/usr/bin/env python3
"""
Seed a minimal auction into local Docker Postgres for smoke testing.

Usage (from backend/):
  export DATABASE_URL=postgresql+psycopg://powerauction:powerauction@localhost:5432/powerauction
  export DATA_BACKEND=postgres
  export PYTHONPATH=.
  python scripts/seed_local_postgres.py

Safe for local only — uses fixed demo IDs (upserts / skips if present).
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

# Ensure defaults for local docker if unset
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://powerauction:powerauction@localhost:5434/powerauction",
)
os.environ.setdefault("DATA_BACKEND", "postgres")

from app.data import pg_repo  # noqa: E402


DEMO = {
    "organizer_uid": "local-demo-organizer",
    "team_admin_uid": "local-demo-team-admin",
    "event_id": "local-demo-event",
    "category_id": "local-demo-category",
    "team_id": "local-demo-team",
    "player_ids": [
        "local-demo-player-1",
        "local-demo-player-2",
        "local-demo-player-3",
    ],
}


def main() -> None:
    print("Seeding local Postgres demo data...")

    pg_repo.upsert_user(
        {
            "uid": DEMO["organizer_uid"],
            "email": "organizer@local.test",
            "role": "event_organizer",
            "display_name": "Local Organizer",
            "mobile_number": "9000000001",
        }
    )
    pg_repo.upsert_user(
        {
            "uid": DEMO["team_admin_uid"],
            "email": "teamadmin@local.test",
            "role": "team_admin",
            "display_name": "Local Team Admin",
            "mobile_number": "9000000002",
        }
    )

    existing = pg_repo.get_event(DEMO["event_id"])
    if not existing:
        pg_repo.create_event(
            {
                "id": DEMO["event_id"],
                "name": "Local Demo Auction",
                "date": "2026-12-01",
                "status": "not_started",
                "rules": {
                    "bid_increment": 1000,
                    "timer_seconds": 60,
                    "min_players_per_team": 1,
                    "max_players_per_team": 15,
                },
                "payment_settings": {"collect_payment": False, "registration_fee": None},
                "description": "Seeded auction for local Postgres testing",
                "created_by": DEMO["organizer_uid"],
                "organizer_name": "Local Organizer",
                "organizer_mobile": "9000000001",
                "has_registration_limit": False,
                "registration_limit": None,
            }
        )
        print(f"  created event {DEMO['event_id']}")
    else:
        print(f"  event {DEMO['event_id']} already exists")

    if not pg_repo.get_category(DEMO["category_id"]):
        pg_repo.create_category(
            {
                "id": DEMO["category_id"],
                "event_id": DEMO["event_id"],
                "name": "All-rounder",
                "description": "Demo category",
                "min_players": 1,
                "max_players": 5,
                "color": "#B91C1C",
                "base_price": 50000,
            }
        )
        print(f"  created category {DEMO['category_id']}")
    else:
        print(f"  category already exists")

    if not pg_repo.get_team(DEMO["team_id"]):
        pg_repo.create_team(
            {
                "id": DEMO["team_id"],
                "event_id": DEMO["event_id"],
                "name": "Demo Strikers",
                "budget": 1_000_000,
                "max_squad_size": 11,
                "color": "#1D4ED8",
                "admin_uid": DEMO["team_admin_uid"],
                "admin_email": "teamadmin@local.test",
            }
        )
        print(f"  created team {DEMO['team_id']}")
    else:
        print(f"  team already exists")

    names = ["Aarav Patel", "Rohan Singh", "Vikram Das"]
    for pid, name in zip(DEMO["player_ids"], names):
        if not pg_repo.get_player(pid):
            pg_repo.create_player(
                {
                    "id": pid,
                    "event_id": DEMO["event_id"],
                    "category_id": DEMO["category_id"],
                    "name": name,
                    "base_price": 50000,
                    "position": "All-rounder",
                    "specialty": "Batting",
                    "status": "available",
                }
            )
            print(f"  created player {pid} ({name})")
        else:
            print(f"  player {pid} already exists")

    print("")
    print("Seed complete. Demo IDs:")
    for k, v in DEMO.items():
        print(f"  {k}: {v}")
    print("")
    print("Smoke checks (no auth):")
    print(f"  curl http://localhost:8001/api/health")
    print(f"  curl http://localhost:8001/api/auctions/{DEMO['event_id']}")
    print(f"  curl http://localhost:8001/api/teams/event/{DEMO['event_id']}")
    print(f"  curl http://localhost:8001/api/auctions/{DEMO['event_id']}/players")
    print(f"  curl http://localhost:8001/api/auction/state/{DEMO['event_id']}")


if __name__ == "__main__":
    main()
