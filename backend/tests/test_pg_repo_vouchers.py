"""
Postgres integration tests for voucher redemption (issue #40).

Covers the atomic paths in pg_repo that the pure unit tests cannot:
full-voucher consume + registration + VOUCHER payment row in one
transaction, partial-voucher consume at registration completion, and the
cap enforced under the row lock (a second consume past max_uses fails
and writes nothing).

Requires:
  - Docker Postgres running (./scripts/local_db_up.sh)
  - DATABASE_URL set (default local Docker URL)
  - Alembic migrations applied, including 20261110_0006_vouchers
    (./scripts/local_db_up.sh runs `alembic upgrade head`)

Run:
  cd backend
  export DATABASE_URL=postgresql+psycopg://powerauction:powerauction@localhost:5434/powerauction
  export DATA_BACKEND=postgres
  export PYTHONPATH=.
  pytest tests/test_pg_repo_vouchers.py -v
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
def voucher_fixture():
    from app.data import pg_repo

    suffix = uuid.uuid4().hex[:8]
    org = f"test-vorg-{suffix}"
    event_id = f"test-vevent-{suffix}"

    pg_repo.upsert_user(
        {
            "uid": org,
            "email": f"vorg-{suffix}@test.local",
            "role": "event_organizer",
            "display_name": "Test Voucher Org",
        }
    )
    pg_repo.create_event(
        {
            "id": event_id,
            "name": f"Test Voucher Auction {suffix}",
            "date": "2026-12-01",
            "status": "not_started",
            "rules": {},
            "payment_settings": {"collect_payment": True, "registration_fee": 500},
            "created_by": org,
        }
    )

    yield {"event_id": event_id, "org": org}

    # Best-effort cleanup (order matters for FKs)
    try:
        from sqlalchemy import select

        from app.data.pg_repo import _session
        from app.models import Event, PaymentOrder, PlayerRegistration, User, Voucher

        with _session() as s:
            for v in s.scalars(select(Voucher).where(Voucher.event_id == event_id)).all():
                s.delete(v)
            for p in s.scalars(
                select(PaymentOrder).where(PaymentOrder.event_id == event_id)
            ).all():
                s.delete(p)
            for r in s.scalars(
                select(PlayerRegistration).where(PlayerRegistration.event_id == event_id)
            ).all():
                s.delete(r)
            e = s.get(Event, event_id)
            if e:
                s.delete(e)
            u = s.get(User, org)
            if u:
                s.delete(u)
            s.commit()
    except Exception:
        pass


def test_voucher_crud_and_unique_code_per_event(voucher_fixture):
    from app.data import pg_repo

    eid = voucher_fixture["event_id"]
    v = pg_repo.create_voucher(
        {
            "event_id": eid,
            "code": "EARLYBIRD",
            "type": "percent",
            "value": 50,
            "max_uses": 10,
            "created_by": voucher_fixture["org"],
            "label": "Early birds",
        }
    )
    assert v["code"] == "EARLYBIRD"
    assert v["used_count"] == 0
    assert v["active"] is True

    # Same code twice for the same event is a clash.
    with pytest.raises(ValueError):
        pg_repo.create_voucher(
            {"event_id": eid, "code": "earlybird", "type": "full", "value": None}
        )

    found = pg_repo.get_voucher_by_code(eid, " earlybird ")
    assert found and found["id"] == v["id"]

    listed = pg_repo.list_vouchers(eid)
    assert len(listed) == 1 and listed[0]["code"] == "EARLYBIRD"

    updated = pg_repo.update_voucher(v["id"], {"label": "Renamed", "active": False})
    assert updated["label"] == "Renamed"
    assert updated["active"] is False

    pg_repo.delete_voucher(v["id"])
    assert pg_repo.get_voucher(v["id"]) is None


def test_full_voucher_atomic_consume(voucher_fixture):
    from app.data import pg_repo

    eid = voucher_fixture["event_id"]
    v = pg_repo.create_voucher(
        {
            "event_id": eid,
            "code": "FULLFREE",
            "type": "full",
            "value": None,
            "max_uses": 1,
            "created_by": voucher_fixture["org"],
        }
    )
    reg_id = f"reg-{uuid.uuid4().hex[:8]}"
    order_id = f"voucher_{eid[:8]}_{uuid.uuid4().hex[:8]}"
    result = pg_repo.consume_voucher_and_create_registration(
        v["id"],
        {
            "id": reg_id,
            "event_id": eid,
            "name": "Free Player",
            "contact_number": "9999999999",
            "payment_order_id": order_id,
            "voucher_code": "FULLFREE",
            "amount_paid": 0,
            "discount_amount": 500,
            "original_amount": 500,
        },
        {
            "order_id": order_id,
            "event_id": eid,
            "customer_name": "Free Player",
            "customer_phone": "9999999999",
            "amount": 0,
            "status": "VOUCHER",
            "voucher_code": "FULLFREE",
            "original_amount": 500,
            "discount_amount": 500,
        },
    )
    assert result["registration"]["id"] == reg_id
    assert result["registration"]["voucher_code"] == "FULLFREE"
    assert result["registration"]["amount_paid"] == 0
    assert result["payment"]["status"] == "VOUCHER"
    assert result["payment"]["registration_completed"] is True
    assert result["voucher"]["used_count"] == 1

    # Second consume past the cap fails and writes nothing.
    before = len(pg_repo.list_registrations(eid))
    with pytest.raises(ValueError, match="fully used"):
        pg_repo.consume_voucher_and_create_registration(
            v["id"],
            {
                "id": f"reg-{uuid.uuid4().hex[:8]}",
                "event_id": eid,
                "name": "Second Player",
                "contact_number": "8888888888",
                "payment_order_id": f"voucher_{eid[:8]}_{uuid.uuid4().hex[:8]}",
            },
            {
                "order_id": f"voucher_{eid[:8]}_{uuid.uuid4().hex[:8]}",
                "event_id": eid,
                "customer_name": "Second Player",
                "customer_phone": "8888888888",
                "amount": 0,
                "status": "VOUCHER",
            },
        )
    assert len(pg_repo.list_registrations(eid)) == before
    assert pg_repo.get_voucher(v["id"])["used_count"] == 1


def test_partial_voucher_consume_at_completion(voucher_fixture):
    from app.data import pg_repo

    eid = voucher_fixture["event_id"]
    v = pg_repo.create_voucher(
        {
            "event_id": eid,
            "code": "HALF50",
            "type": "percent",
            "value": 50,
            "max_uses": 1,
            "created_by": voucher_fixture["org"],
        }
    )
    # Order creation does NOT consume: used_count stays 0.
    order_id = f"order_{eid[:8]}_{uuid.uuid4().hex[:8]}"
    pg_repo.create_payment(
        {
            "order_id": order_id,
            "event_id": eid,
            "customer_name": "Half Player",
            "customer_email": "half@test.local",
            "customer_phone": "7777777777",
            "amount": 250,
            "status": "PENDING",
            "voucher_code": "HALF50",
            "original_amount": 500,
            "discount_amount": 250,
        }
    )
    assert pg_repo.get_voucher(v["id"])["used_count"] == 0

    # Completion consumes exactly one use, atomically with the registration.
    reg = pg_repo.create_registration_with_voucher_consume(
        {
            "id": f"reg-{uuid.uuid4().hex[:8]}",
            "event_id": eid,
            "name": "Half Player",
            "contact_number": "7777777777",
            "payment_order_id": order_id,
            "voucher_code": "HALF50",
            "amount_paid": 250,
            "discount_amount": 250,
            "original_amount": 500,
        },
        v["id"],
    )
    assert reg["voucher_code"] == "HALF50"
    assert reg["amount_paid"] == 250
    assert pg_repo.get_voucher(v["id"])["used_count"] == 1
    assert pg_repo.get_payment(order_id)["registration_completed"] is True
    assert pg_repo.get_payment(order_id)["registration_id"] == reg["id"]

    # A second completion past the cap fails and writes nothing.
    order_id2 = f"order_{eid[:8]}_{uuid.uuid4().hex[:8]}"
    pg_repo.create_payment(
        {
            "order_id": order_id2,
            "event_id": eid,
            "customer_name": "Late Player",
            "customer_phone": "6666666666",
            "amount": 250,
            "status": "PENDING",
            "voucher_code": "HALF50",
            "original_amount": 500,
            "discount_amount": 250,
        }
    )
    before = len(pg_repo.list_registrations(eid))
    with pytest.raises(ValueError, match="fully used"):
        pg_repo.create_registration_with_voucher_consume(
            {
                "id": f"reg-{uuid.uuid4().hex[:8]}",
                "event_id": eid,
                "name": "Late Player",
                "contact_number": "6666666666",
                "payment_order_id": order_id2,
            },
            v["id"],
        )
    assert len(pg_repo.list_registrations(eid)) == before
    assert pg_repo.get_voucher(v["id"])["used_count"] == 1


def test_payment_and_registration_carry_voucher_fields(voucher_fixture):
    from app.data import pg_repo

    eid = voucher_fixture["event_id"]
    order_id = f"order_{eid[:8]}_{uuid.uuid4().hex[:8]}"
    pg_repo.create_payment(
        {
            "order_id": order_id,
            "event_id": eid,
            "customer_name": "Plain Payer",
            "customer_phone": "5555555555",
            "amount": 500,
            "status": "PAID",
            "voucher_code": None,
            "original_amount": 500,
            "discount_amount": 0,
        }
    )
    payment = pg_repo.get_payment(order_id)
    assert payment["original_amount"] == 500
    assert payment["discount_amount"] == 0
    assert payment["voucher_code"] is None

    reg = pg_repo.create_registration(
        {
            "id": f"reg-{uuid.uuid4().hex[:8]}",
            "event_id": eid,
            "name": "Plain Payer",
            "contact_number": "5555555555",
            "payment_order_id": order_id,
            "voucher_code": None,
            "amount_paid": 500,
            "discount_amount": 0,
            "original_amount": 500,
        }
    )
    assert reg["amount_paid"] == 500
    assert reg["original_amount"] == 500
