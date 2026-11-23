"""
Postgres integration tests for saved match schedules (issue #77).

Requires a local Postgres (same setup as test_pg_repo_auction.py):
  cd backend
  export DATABASE_URL=<redacted>
  export DATA_BACKEND=postgres
  export PYTHONPATH=.
  pytest tests/test_pg_repo_schedule.py -v

Skips when Postgres is not available.
"""

from __future__ import annotations

import os
import uuid

import pytest

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://powerauction:powerauction@localhost:5434/powerauction",
)
os.environ.setdefault("DATA_BACKEND", "postgres")

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
def schedule_fixture():
    from app.data import pg_repo
    from app.schedule import generate_schedule

    suffix = uuid.uuid4().hex[:8]
    org = f"test-org-{suffix}"
    event_id = f"test-event-{suffix}"

    pg_repo.upsert_user(
        {
            "uid": org,
            "email": f"org-{suffix}@test.local",
            "role": "event_organizer",
            "display_name": "Test Org",
        }
    )
    pg_repo.create_event(
        {
            "id": event_id,
            "name": f"Test Schedule {suffix}",
            "date": "2026-12-10",
            "status": "not_started",
            "rules": {},
            "payment_settings": {"collect_payment": False, "registration_fee": None},
            "created_by": org,
        }
    )
    conditions = {
        "groups": [
            {"name": "Pro", "teams": ["Pro A", "Pro B", "Pro C", "Pro D"]},
            {"name": "Legend", "teams": ["Leg A", "Leg B", "Leg C", "Leg D"]},
        ],
        "finals_per_group": True,
        "matches_per_day": 4,
        "overs": 12,
        "start_date": "2026-12-10",
        "days": 4,
    }
    schedule = generate_schedule(conditions)

    yield {"event_id": event_id, "org": org, "conditions": conditions, "schedule": schedule}

    # Best-effort cleanup (order matters for FKs)
    try:
        from sqlalchemy import select

        from app.data.pg_repo import _session
        from app.models import Event, EventSchedule, User

        with _session() as s:
            row = s.scalars(
                select(EventSchedule).where(EventSchedule.event_id == event_id)
            ).first()
            if row is not None:
                s.delete(row)
            event = s.get(Event, event_id)
            if event is not None:
                s.delete(event)
            user = s.get(User, org)
            if user is not None:
                s.delete(user)
            s.commit()
    except Exception:
        pass


def test_save_get_delete_schedule(schedule_fixture):
    from app.data import pg_repo

    event_id = schedule_fixture["event_id"]
    conditions = schedule_fixture["conditions"]
    schedule = schedule_fixture["schedule"]

    assert pg_repo.get_event_schedule(event_id) is None

    saved = pg_repo.save_event_schedule(event_id, conditions, schedule)
    assert saved["event_id"] == event_id
    assert saved["schedule"]["total_matches"] == 14
    assert [len(d["matches"]) for d in saved["schedule"]["days"]] == [3, 3, 4, 4]

    fetched = pg_repo.get_event_schedule(event_id)
    assert fetched is not None
    assert fetched["id"] == saved["id"]
    assert fetched["conditions"]["groups"][0]["name"] == "Pro"
    assert fetched["schedule"]["days"][2]["matches"][0]["stage"] == "final"

    # Saving again replaces the row (one schedule per event), keeps the id.
    saved2 = pg_repo.save_event_schedule(event_id, conditions, schedule)
    assert saved2["id"] == saved["id"]
    assert pg_repo.get_event_schedule(event_id)["id"] == saved["id"]

    pg_repo.delete_event_schedule(event_id)
    assert pg_repo.get_event_schedule(event_id) is None

    with pytest.raises(ValueError, match="Schedule not found"):
        pg_repo.delete_event_schedule(event_id)
