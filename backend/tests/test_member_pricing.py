"""
Pure unit tests for member / category pricing (issue #57).

No database, no Firebase: imports only ``app.registration_form``
(stdlib-only) for the pure pricing/phone/member-row helpers, and
``models`` for the Pydantic model checks (skipped when pydantic is not
installed). Run:

  cd backend
  export PYTHONPATH=.
  pytest tests/test_member_pricing.py -v
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from app.registration_form import (
    category_price,
    detect_member_header_row,
    is_member_phone,
    normalize_phone_number,
    normalize_registration_categories,
    parse_member_rows,
    resolve_registration_category,
    validate_registration_categories,
)


def _categories():
    return [
        {
            "id": "cat_gents",
            "name": "Gentswear retailer",
            "pricing_type": "member_tiered",
            "member_price": 5000,
            "non_member_price": 6000,
        },
        {
            "id": "cat_textile",
            "name": "Textile owner",
            "pricing_type": "flat",
            "flat_price": 7500,
        },
        {"id": "cat_sponsor", "name": "Sponsor", "pricing_type": "voucher"},
    ]


# --- phone normalisation -------------------------------------------------

def test_normalize_phone_strips_country_code_and_spaces():
    assert normalize_phone_number("+91 98765 43210") == "9876543210"
    assert normalize_phone_number("919876543210") == "9876543210"
    assert normalize_phone_number("09876543210") == "9876543210"
    assert normalize_phone_number("98765-43210") == "9876543210"
    assert normalize_phone_number("(98765) 43210") == "9876543210"


def test_normalize_phone_rejects_unusable_numbers():
    assert normalize_phone_number("") == ""
    assert normalize_phone_number(None) == ""
    assert normalize_phone_number("12345") == ""
    assert normalize_phone_number("not a number") == ""


# --- category validation / normalisation ---------------------------------

def test_categories_validate_ok():
    assert validate_registration_categories(_categories()) is None
    assert validate_registration_categories([]) is None
    assert validate_registration_categories(None) is None


def test_categories_reject_missing_prices():
    flat = [{"id": "a", "name": "Flat", "pricing_type": "flat"}]
    assert "needs a price" in (validate_registration_categories(flat) or "")
    tiered = [{
        "id": "a", "name": "Tiered", "pricing_type": "member_tiered",
        "member_price": 5000,
    }]
    assert "non-member price" in (validate_registration_categories(tiered) or "")


def test_categories_reject_duplicate_names_and_bad_types():
    dup = [
        {"id": "a", "name": "Same", "pricing_type": "flat", "flat_price": 100},
        {"id": "b", "name": "same", "pricing_type": "flat", "flat_price": 100},
    ]
    assert "Duplicate" in (validate_registration_categories(dup) or "")
    bad = [{"id": "a", "name": "X", "pricing_type": "mystery"}]
    assert "Unknown pricing rule" in (validate_registration_categories(bad) or "")


def test_categories_normalize_drops_nameless_and_coerces_prices():
    raw = [
        {"id": "a", "name": "  Flat  ", "pricing_type": "flat", "flat_price": "7500"},
        {"name": "", "pricing_type": "flat", "flat_price": 1},
        {"id": "c", "name": "Voucher", "pricing_type": "voucher"},
    ]
    cleaned = normalize_registration_categories(raw)
    assert [c["name"] for c in cleaned] == ["Flat", "Voucher"]
    assert cleaned[0]["flat_price"] == 7500
    assert cleaned[0]["id"] == "a"
    assert cleaned[1]["id"]  # generated id when missing


def test_resolve_category_by_id():
    cats = _categories()
    assert resolve_registration_category(cats, "cat_gents")["name"] == "Gentswear retailer"
    assert resolve_registration_category(cats, "nope") is None
    assert resolve_registration_category(cats, None) is None


# --- category price -------------------------------------------------------

def test_category_price_no_categories_is_base_fee():
    assert category_price(5000, [], None, False) == 5000
    assert category_price(5000, None, None, True) == 5000


def test_category_price_member_tiered():
    cats = _categories()
    assert category_price(5000, cats, "cat_gents", True) == 5000
    assert category_price(5000, cats, "cat_gents", False) == 6000


def test_category_price_flat_replaces_base():
    assert category_price(5000, _categories(), "cat_textile", False) == 7500
    assert category_price(5000, _categories(), "cat_textile", True) == 7500


def test_category_price_voucher_keeps_base_fee():
    assert category_price(5000, _categories(), "cat_sponsor", False) == 5000


def test_category_price_unknown_category_is_base_fee():
    assert category_price(5000, _categories(), "cat_missing", True) == 5000


def test_category_price_free_member_price_is_zero():
    cats = [{
        "id": "m", "name": "Member", "pricing_type": "member_tiered",
        "member_price": 0, "non_member_price": 6000,
    }]
    assert category_price(5000, cats, "m", True) == 0
    assert category_price(5000, cats, "m", False) == 6000


# --- member flag ----------------------------------------------------------

def test_is_member_either_source_counts():
    assert is_member_phone(listed=True, existing_player=False) is True
    assert is_member_phone(listed=False, existing_player=True) is True
    assert is_member_phone(listed=True, existing_player=True) is True
    assert is_member_phone(listed=False, existing_player=False) is False


# --- member sheet rows ----------------------------------------------------

def test_parse_member_rows_happy_path():
    members, errors = parse_member_rows([
        {"Name": "Ravi Kumar", "Phone": "+91 98765 43210", "Shop": "Ravi Textiles"},
        {"Name": "Meera", "Mobile": "9123456780", "City": "Kochi"},
    ])
    assert errors == []
    assert members[0] == {
        "phone": "9876543210", "name": "Ravi Kumar",
        "details": {"Shop": "Ravi Textiles"},
    }
    assert members[1]["phone"] == "9123456780"
    assert members[1]["details"] == {"City": "Kochi"}


def test_parse_member_rows_bad_rows_reported_not_fatal():
    members, errors = parse_member_rows([
        {"Name": "No Phone", "City": "Kochi"},
        {"Name": "Short", "Phone": "12345"},
        {"Name": "Good", "Phone": "9876543210"},
        {"Name": "", "Phone": "", "City": ""},  # fully empty: skipped silently
    ])
    assert len(members) == 1
    assert members[0]["phone"] == "9876543210"
    assert errors == ["Row 2: no usable phone number", "Row 3: no usable phone number"]


def test_parse_member_rows_float_phone_and_duplicate_last_wins():
    members, errors = parse_member_rows([
        {"Name": "First", "Phone": 9876543210.0},
        {"Name": "Second", "Phone": "9876543210", "Shop": "New"},
    ])
    assert errors == []
    assert len(members) == 1
    assert members[0]["name"] == "Second"
    assert members[0]["details"] == {"Shop": "New"}


# --- member sheet header-row detection (issue #59) ----------------------

def test_detect_member_header_row_title_row_above_headers():
    # His real sheet: row 1 a title, row 2 the headers, rows 3-4 data.
    raw = [
        ["Table 1", None, None],
        ["Registration ID", "Name", "Mobile"],
        [101, "Muhammed", 9037138030],
        [102, "Shihab", 9947702294],
    ]
    assert detect_member_header_row(raw) == 1


def test_detect_member_header_row_first_row():
    raw = [["Name", "Mobile"], ["Ravi", "9876543210"]]
    assert detect_member_header_row(raw) == 0


def test_detect_member_header_row_none_found():
    assert detect_member_header_row([["Foo", "Bar"], ["x", "y"]]) is None
    assert detect_member_header_row([]) is None
    # A title row that merely mentions a phone is not a header row:
    # only an exact header cell counts.
    assert detect_member_header_row([["Mobile members list"], ["x"]]) is None


def test_parse_member_rows_real_header_row_numbers():
    # Headers on sheet row 2: errors must carry the real sheet rows.
    members, errors = parse_member_rows([
        {"Registration ID": 201, "Name": "No Phone", "Mobile": None},
        {"Registration ID": 202, "Name": "Good", "Mobile": "9876543210"},
        {"Registration ID": None, "Name": "", "Mobile": ""},  # empty: skipped
    ], header_row=2)
    assert len(members) == 1
    assert members[0]["phone"] == "9876543210"
    assert errors == ["Row 3: no usable phone number"]


def test_parse_member_rows_phone_key_variants():
    # "Mobile No." (trailing period) and "Telephone" both match.
    members, errors = parse_member_rows([
        {"Name": "A", "Mobile No.": "9876543210"},
        {"Name": "B", "Telephone": "9123456780"},
    ])
    assert errors == []
    assert [m["phone"] for m in members] == ["9876543210", "9123456780"]


def test_parse_member_rows_multiple_phone_columns():
    # A sheet with both Mobile and Phone columns, different rows
    # filling different ones — each row takes its first usable number.
    members, errors = parse_member_rows([
        {"Name": "A", "Mobile": "9876543210", "Phone": None},
        {"Name": "B", "Mobile": None, "Phone": "9123456780"},
    ])
    assert errors == []
    assert [m["phone"] for m in members] == ["9876543210", "9123456780"]


def test_parse_member_rows_title_row_shape_like_real_sheet():
    # Dicts exactly as pandas produces for his membership.xlsx once
    # the detected header row (row 2) is used: 2 members, 0 skipped.
    members, errors = parse_member_rows([
        {"Registration ID": 101, "Name": "Muhammed", "Mobile": 9037138030,
         "Unnamed: 3": None, "Unnamed: 4": None},
        {"Registration ID": 102, "Name": "Shihab", "Mobile": 9947702294,
         "Unnamed: 3": None, "Unnamed: 4": None},
    ], header_row=2)
    assert errors == []
    assert [(m["phone"], m["name"]) for m in members] == [
        ("9037138030", "Muhammed"), ("9947702294", "Shihab")]
    assert members[0]["details"] == {"Registration ID": 101}


# --- Pydantic models (skipped when pydantic is absent) --------------------

def test_model_categories_round_trip():
    pytest.importorskip("pydantic")
    from models import RegistrationFormConfig

    cfg = RegistrationFormConfig(fields=[], categories=_categories())
    dumped = cfg.model_dump()
    assert [c["name"] for c in dumped["categories"]] == [
        "Gentswear retailer", "Textile owner", "Sponsor"]
    assert RegistrationFormConfig(fields=[]).categories == []


def test_model_rejects_invalid_categories():
    pytest.importorskip("pydantic")
    from pydantic import ValidationError

    from models import RegistrationFormConfig

    with pytest.raises(ValidationError) as excinfo:
        RegistrationFormConfig(fields=[], categories=[
            {"id": "a", "name": "Flat", "pricing_type": "flat"}])
    assert "needs a price" in str(excinfo.value)


def test_model_registration_carries_category_and_member():
    pytest.importorskip("pydantic")
    from models import PublicPlayerRegistration

    reg = PublicPlayerRegistration(
        name="Ravi", contact_number="9876543210",
        registration_category="cat_gents", is_member=True)
    assert reg.registration_category == "cat_gents"
    assert reg.is_member is True
    assert PublicPlayerRegistration(name="A").registration_category is None
