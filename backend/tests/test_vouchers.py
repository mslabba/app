"""
Pure unit tests for the voucher feature (issue #40).

No database, no Firebase: imports only ``app.vouchers`` and
``app.registration_form`` (both stdlib-only). Run:

  cd backend
  export PYTHONPATH=.
  pytest tests/test_vouchers.py -v
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from app.registration_form import (
    default_registration_form_config,
    legacy_registration_form_config,
    validate_registration_payload,
)
from app.vouchers import (
    CROCKFORD_ALPHABET,
    can_consume,
    compute_amount_due,
    discount_amount,
    generate_code,
    is_valid_custom_code,
    normalize_code,
    validate_voucher,
    validate_voucher_definition,
)

NOW = datetime(2026, 11, 10, 12, 0, tzinfo=timezone.utc)


def _voucher(**overrides):
    v = {
        "id": "v1",
        "event_id": "ev1",
        "code": "KITE7Q2X",
        "type": "percent",
        "value": 50,
        "max_uses": None,
        "used_count": 0,
        "active": True,
        "expires_at": None,
        "created_by": "org1",
        "created_at": "2026-11-10T00:00:00+00:00",
        "label": None,
    }
    v.update(overrides)
    return v


# ---------------------------------------------------------------------------
# Voucher validity
# ---------------------------------------------------------------------------


def test_validate_voucher_valid_unlimited():
    assert validate_voucher(_voucher(), "ev1", NOW) == (True, "valid")


def test_validate_voucher_missing_is_not_found():
    assert validate_voucher(None, "ev1", NOW) == (False, "not_found")


def test_validate_voucher_wrong_event():
    assert validate_voucher(_voucher(), "ev2", NOW) == (False, "wrong_event")


def test_validate_voucher_inactive():
    assert validate_voucher(_voucher(active=False), "ev1", NOW) == (False, "inactive")


def test_validate_voucher_expired_iso_string():
    past = (NOW - timedelta(days=1)).isoformat()
    assert validate_voucher(_voucher(expires_at=past), "ev1", NOW) == (False, "expired")


def test_validate_voucher_expired_datetime():
    past = NOW - timedelta(hours=1)
    assert validate_voucher(_voucher(expires_at=past), "ev1", NOW) == (False, "expired")


def test_validate_voucher_expiry_exactly_now_is_expired():
    assert validate_voucher(_voucher(expires_at=NOW), "ev1", NOW) == (False, "expired")


def test_validate_voucher_future_expiry_is_valid():
    future = (NOW + timedelta(days=1)).isoformat()
    assert validate_voucher(_voucher(expires_at=future), "ev1", NOW) == (True, "valid")


def test_validate_voucher_used_up_at_cap():
    assert validate_voucher(_voucher(max_uses=2, used_count=2), "ev1", NOW) == (
        False,
        "fully_used",
    )


def test_validate_voucher_used_up_over_cap():
    assert validate_voucher(_voucher(max_uses=1, used_count=3), "ev1", NOW) == (
        False,
        "fully_used",
    )


def test_validate_voucher_one_use_left_is_valid():
    assert validate_voucher(_voucher(max_uses=2, used_count=1), "ev1", NOW) == (
        True,
        "valid",
    )


def test_validate_voucher_unparseable_expiry_is_expired():
    assert validate_voucher(_voucher(expires_at="not-a-date"), "ev1", NOW) == (
        False,
        "expired",
    )


def test_validate_voucher_date_only_expiry_means_end_of_day():
    # A bare YYYY-MM-DD expiry is usable throughout that day (end of day,
    # UTC), not just until midnight at its start.
    assert validate_voucher(_voucher(expires_at="2026-11-10"), "ev1", NOW) == (
        True,
        "valid",
    )
    assert validate_voucher(
        _voucher(expires_at="2026-11-10"), "ev1",
        datetime(2026, 11, 10, 23, 59, 59, tzinfo=timezone.utc),
    ) == (True, "valid")
    assert validate_voucher(
        _voucher(expires_at="2026-11-10"), "ev1",
        datetime(2026, 11, 11, 0, 0, 0, tzinfo=timezone.utc),
    ) == (False, "expired")
    # A date object behaves the same way.
    assert validate_voucher(
        _voucher(expires_at=datetime(2026, 11, 10).date()), "ev1", NOW
    ) == (True, "valid")


def test_voucher_create_date_only_expiry_means_end_of_day():
    pytest.importorskip("pydantic")
    from models import VoucherCreate, VoucherUpdate

    v = VoucherCreate(type="full", expires_at="2026-12-01")
    assert v.expires_at == datetime(2026, 12, 1, 23, 59, 59, 999999)
    # A full ISO datetime passes through unchanged.
    v2 = VoucherCreate(type="percent", value=10, expires_at="2026-12-01T10:30:00")
    assert v2.expires_at == datetime(2026, 12, 1, 10, 30, 0)
    # Same rule on PATCH.
    u = VoucherUpdate(expires_at="2026-12-25")
    assert u.expires_at == datetime(2026, 12, 25, 23, 59, 59, 999999)
    # Null stays null.
    assert VoucherCreate(type="full", expires_at=None).expires_at is None


# ---------------------------------------------------------------------------
# Discount math
# ---------------------------------------------------------------------------


def test_discount_full_is_free():
    assert compute_amount_due(500, "full", None) == 0
    assert compute_amount_due(0, "full", None) == 0
    assert discount_amount(500, "full", None) == 500


def test_discount_percent():
    assert compute_amount_due(1000, "percent", 50) == 500
    assert compute_amount_due(1000, "percent", 10) == 900
    assert compute_amount_due(1000, "percent", 99) == 10
    assert discount_amount(1000, "percent", 25) == 250


def test_discount_percent_rounding_half_up():
    # 50% of 501 = 250.5 -> discount rounds half-UP to 251, due 250.
    # (Python's round() would banker's-round 250.5 to 250 — wrong here.)
    assert compute_amount_due(501, "percent", 50) == 250
    assert discount_amount(501, "percent", 50) == 251


def test_discount_fixed():
    assert compute_amount_due(500, "fixed", 100) == 400
    assert compute_amount_due(500, "fixed", 500) == 0
    assert discount_amount(500, "fixed", 100) == 100


def test_discount_fixed_larger_than_fee_floors_at_zero():
    assert compute_amount_due(300, "fixed", 1000) == 0
    assert discount_amount(300, "fixed", 1000) == 300


def test_discount_unknown_type_raises():
    with pytest.raises(ValueError):
        compute_amount_due(500, "mystery", 10)


# ---------------------------------------------------------------------------
# Code generation / validation
# ---------------------------------------------------------------------------


def test_generate_code_shape():
    for _ in range(50):
        code = generate_code()
        assert len(code) == 8
        assert all(ch in CROCKFORD_ALPHABET for ch in code)
        # No ambiguous characters 0/O/1/I/L by construction.
        assert not set(code) & set("01OIL")


def test_generate_code_uniqueness():
    codes = {generate_code() for _ in range(200)}
    assert len(codes) > 190  # 32^8 space; collisions ~impossible


def test_normalize_code():
    assert normalize_code("  kite-7q2x ") == "KITE-7Q2X"
    assert normalize_code(None) == ""


def test_is_valid_custom_code():
    assert is_valid_custom_code("EARLYBIRD")
    assert is_valid_custom_code("earlybird")  # normalized
    assert is_valid_custom_code("KITE-7Q2X")
    assert is_valid_custom_code("A-B-C-D")
    assert is_valid_custom_code("ABCD")  # minimum length
    assert not is_valid_custom_code("ABC")  # too short
    assert not is_valid_custom_code("A" * 21)  # too long
    assert not is_valid_custom_code("ABC!")  # bad character
    assert not is_valid_custom_code("AB CD")  # space
    assert not is_valid_custom_code("")
    assert not is_valid_custom_code(None)


def test_validate_voucher_definition():
    assert validate_voucher_definition("full", None, None) is None
    assert validate_voucher_definition("full", 50, None) is not None
    assert validate_voucher_definition("percent", 50, 10) is None
    assert validate_voucher_definition("percent", 0, None) is not None
    assert validate_voucher_definition("percent", 100, None) is not None
    assert validate_voucher_definition("percent", None, None) is not None
    assert validate_voucher_definition("fixed", 100, None) is None
    assert validate_voucher_definition("fixed", 0, None) is not None
    assert validate_voucher_definition("fixed", None, None) is not None
    assert validate_voucher_definition("mystery", None, None) is not None
    assert validate_voucher_definition("percent", 50, 0) is not None
    assert validate_voucher_definition("percent", 50, None) is None


# ---------------------------------------------------------------------------
# Atomic-consume guard logic
# ---------------------------------------------------------------------------


def test_can_consume_usable_voucher():
    assert can_consume(_voucher(max_uses=1, used_count=0), "ev1") is True


def test_can_consume_refuses_spent_expired_inactive():
    assert can_consume(_voucher(max_uses=1, used_count=1), "ev1") is False
    assert can_consume(_voucher(active=False), "ev1") is False
    assert can_consume(_voucher(expires_at=(NOW - timedelta(days=1)).isoformat()), "ev1") is False
    assert can_consume(_voucher(), "other-event") is False


def test_consume_guard_tracks_used_count():
    """The guard is a pre-check only: the transaction / row lock enforces
    the cap. This pins the observable half — after each consume the
    voucher reports one fewer remaining use, and at the cap it refuses."""
    v = _voucher(max_uses=2, used_count=0)
    assert can_consume(v, "ev1") is True
    v["used_count"] = 1  # simulate one atomic consume
    assert can_consume(v, "ev1") is True
    v["used_count"] = 2  # simulate the second atomic consume
    assert can_consume(v, "ev1") is False
    assert validate_voucher(v, "ev1", NOW) == (False, "fully_used")


# ---------------------------------------------------------------------------
# Form-config enforcement
# ---------------------------------------------------------------------------


def _event_with_fields(fields):
    return {"registration_form_config": {"fields": fields}}


def _name_mobile_fields():
    return [
        {"id": "name", "key": "name", "label": "Full name", "type": "text",
         "enabled": True, "required": True},
        {"id": "contact_number", "key": "contact_number", "label": "Mobile number",
         "type": "tel", "enabled": True, "required": True},
    ]


def test_form_default_config_requires_name_and_mobile():
    event = {"registration_form_config": default_registration_form_config()}
    assert validate_registration_payload(event, {"name": "Asha", "contact_number": "9999999999"}) == []
    errors = validate_registration_payload(event, {"contact_number": "9999999999"})
    assert errors == ["Full name is required"]
    errors = validate_registration_payload(event, {"name": "  ", "contact_number": "9999999999"})
    assert errors == ["Full name is required"]


def test_form_missing_required_field_rejected():
    event = _event_with_fields(_name_mobile_fields() + [
        {"id": "district", "key": "district", "label": "District", "type": "text",
         "enabled": True, "required": True},
    ])
    errors = validate_registration_payload(
        event, {"name": "Asha", "contact_number": "9999999999"})
    assert errors == ["District is required"]
    ok = validate_registration_payload(
        event, {"name": "Asha", "contact_number": "9999999999", "district": "Kollam"})
    assert ok == []


def test_form_disabled_fields_not_required():
    event = _event_with_fields(_name_mobile_fields() + [
        {"id": "district", "key": "district", "label": "District", "type": "text",
         "enabled": False, "required": True},
    ])
    assert validate_registration_payload(
        event, {"name": "Asha", "contact_number": "9999999999"}) == []


def test_form_custom_field_in_extra_fields():
    event = _event_with_fields(_name_mobile_fields() + [
        {"id": "custom_abc", "key": "custom_abc", "label": "Jersey size", "type": "text",
         "enabled": True, "required": True},
    ])
    payload = {"name": "Asha", "contact_number": "9999999999", "extra_fields": {}}
    assert validate_registration_payload(event, payload) == ["Jersey size is required"]
    payload["extra_fields"] = {"custom_abc": "M"}
    assert validate_registration_payload(event, payload) == []


def test_form_stats_field_required():
    event = _event_with_fields(_name_mobile_fields() + [
        {"id": "matches", "key": "matches", "label": "Matches played", "type": "number",
         "enabled": True, "required": True},
    ])
    payload = {"name": "Asha", "contact_number": "9999999999", "stats": {}}
    assert validate_registration_payload(event, payload) == ["Matches played is required"]
    payload["stats"] = {"matches": 12}
    assert validate_registration_payload(event, payload) == []


def test_form_value_condition_violation_rejected():
    event = _event_with_fields(_name_mobile_fields() + [
        {"id": "age", "key": "age", "label": "Age", "type": "number",
         "enabled": True, "required": False,
         "conditions": [{"kind": "value", "op": "gte", "value": 18,
                         "message": "Must be 18 or older"}]},
    ])
    payload = {"name": "Asha", "contact_number": "9999999999", "age": 16}
    assert validate_registration_payload(event, payload) == ["Must be 18 or older"]
    payload["age"] = 18
    assert validate_registration_payload(event, payload) == []
    payload["age"] = 25
    assert validate_registration_payload(event, payload) == []


def test_form_condition_custom_message_falls_back_to_description():
    event = _event_with_fields(_name_mobile_fields() + [
        {"id": "age", "key": "age", "label": "Age", "type": "number",
         "enabled": True, "required": False,
         "conditions": [{"kind": "value", "op": "lt", "value": 40}]},
    ])
    payload = {"name": "Asha", "contact_number": "9999999999", "age": 45}
    assert validate_registration_payload(event, payload) == ["Age must be less than 40"]


def test_form_age_condition_from_dob():
    event = _event_with_fields(_name_mobile_fields() + [
        {"id": "date_of_birth", "key": "date_of_birth", "label": "Date of birth",
         "type": "date", "enabled": True, "required": False,
         "conditions": [{"kind": "age", "op": "gte", "value": 18}]},
    ])
    payload = {"name": "Asha", "contact_number": "9999999999",
               "extra_fields": {"date_of_birth": "2015-06-01"}}
    errors = validate_registration_payload(event, payload)
    assert len(errors) == 1 and "18" in errors[0]
    payload["extra_fields"] = {"date_of_birth": "2000-01-01"}
    assert validate_registration_payload(event, payload) == []


def test_form_date_condition():
    event = _event_with_fields(_name_mobile_fields() + [
        {"id": "date_of_birth", "key": "date_of_birth", "label": "Date of birth",
         "type": "date", "enabled": True, "required": False,
         "conditions": [{"kind": "date", "op": "lt", "value": "2010-01-01"}]},
    ])
    payload = {"name": "Asha", "contact_number": "9999999999",
               "extra_fields": {"date_of_birth": "2015-06-01"}}
    assert len(validate_registration_payload(event, payload)) == 1
    payload["extra_fields"] = {"date_of_birth": "2005-06-01"}
    assert validate_registration_payload(event, payload) == []


def test_form_conditions_skipped_when_value_empty():
    event = _event_with_fields(_name_mobile_fields() + [
        {"id": "age", "key": "age", "label": "Age", "type": "number",
         "enabled": True, "required": False,
         "conditions": [{"kind": "value", "op": "gte", "value": 18}]},
    ])
    # Optional field left blank: no condition error (mirrors the frontend).
    assert validate_registration_payload(
        event, {"name": "Asha", "contact_number": "9999999999"}) == []


def test_form_disabled_field_conditions_not_checked():
    event = _event_with_fields(_name_mobile_fields() + [
        {"id": "age", "key": "age", "label": "Age", "type": "number",
         "enabled": False, "required": False,
         "conditions": [{"kind": "value", "op": "gte", "value": 18}]},
    ])
    payload = {"name": "Asha", "contact_number": "9999999999", "age": 10}
    assert validate_registration_payload(event, payload) == []


def test_form_legacy_config_behaviour():
    # No config saved yet -> legacy form: name + mobile + photo required,
    # most other fields enabled but optional.
    event = {"registration_form_config": legacy_registration_form_config()}
    assert validate_registration_payload(event, {}) != []
    errors = validate_registration_payload(
        event, {"name": "Asha", "contact_number": "9999999999"})
    assert errors == ["Player photo is required"]
    ok = validate_registration_payload(
        event, {"name": "Asha", "contact_number": "9999999999",
                "photo_url": "https://example.com/p.jpg"})
    assert ok == []


def test_form_no_config_at_all_uses_legacy():
    errors = validate_registration_payload(
        {}, {"name": "Asha", "contact_number": "9999999999"})
    assert errors == ["Player photo is required"]


def test_form_multiple_errors_collected():
    event = _event_with_fields(_name_mobile_fields() + [
        {"id": "district", "key": "district", "label": "District", "type": "text",
         "enabled": True, "required": True},
        {"id": "age", "key": "age", "label": "Age", "type": "number",
         "enabled": True, "required": False,
         "conditions": [{"kind": "value", "op": "gte", "value": 18}]},
    ])
    errors = validate_registration_payload(event, {"age": 12})
    assert errors == ["Full name is required", "Mobile number is required",
                      "District is required", "Age must be at least 18"]
