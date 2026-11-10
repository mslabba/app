"""
Pure unit tests for the optional WhatsApp group link on the registration
form config (issue #50).

No database, no Firebase: imports only ``app.registration_form``
(stdlib-only) for the pure validator, and ``models`` for the Pydantic
model check (skipped when pydantic is not installed). Run:

  cd backend
  export PYTHONPATH=.
  pytest tests/test_whatsapp_group_link.py -v
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from app.registration_form import (
    WHATSAPP_GROUP_LINK_ERROR,
    normalize_whatsapp_group_link,
    validate_whatsapp_group_link,
)

VALID_LINK = "https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv"


def test_empty_link_is_valid_because_optional():
    assert validate_whatsapp_group_link(None) is None
    assert validate_whatsapp_group_link("") is None
    assert validate_whatsapp_group_link("   ") is None


def test_valid_group_invite_link():
    assert validate_whatsapp_group_link(VALID_LINK) is None
    # Leading/trailing whitespace is tolerated
    assert validate_whatsapp_group_link(f"  {VALID_LINK}  ") is None


def test_non_group_links_rejected():
    for bad in [
        "https://wa.me/919999999999",
        "https://chat.whatsapp.com",
        "https://chat.whatsapp.com/",
        "http://chat.whatsapp.com/AbCdEfGh",
        "chat.whatsapp.com/AbCdEfGh",
        "https://example.com/group",
        "https://web.whatsapp.com/AbCdEfGh",
    ]:
        assert validate_whatsapp_group_link(bad) == WHATSAPP_GROUP_LINK_ERROR


def test_non_string_rejected():
    assert validate_whatsapp_group_link(123) == WHATSAPP_GROUP_LINK_ERROR
    assert validate_whatsapp_group_link(["https://chat.whatsapp.com/x"]) == WHATSAPP_GROUP_LINK_ERROR


def test_normalize_trims_and_empties_to_none():
    assert normalize_whatsapp_group_link(None) is None
    assert normalize_whatsapp_group_link("") is None
    assert normalize_whatsapp_group_link("   ") is None
    assert normalize_whatsapp_group_link(f"  {VALID_LINK} ") == VALID_LINK


def test_model_accepts_valid_link_and_persists_it():
    pytest.importorskip("pydantic")
    from models import RegistrationFormConfig

    cfg = RegistrationFormConfig(fields=[], whatsapp_group_link=VALID_LINK)
    assert cfg.whatsapp_group_link == VALID_LINK
    assert cfg.model_dump()["whatsapp_group_link"] == VALID_LINK


def test_model_rejects_non_group_link():
    pytest.importorskip("pydantic")
    from pydantic import ValidationError

    from models import RegistrationFormConfig

    with pytest.raises(ValidationError) as excinfo:
        RegistrationFormConfig(fields=[], whatsapp_group_link="https://example.com/x")
    assert "WhatsApp group invite link" in str(excinfo.value)


def test_model_normalizes_empty_link_to_none():
    pytest.importorskip("pydantic")
    from models import RegistrationFormConfig

    cfg = RegistrationFormConfig(fields=[], whatsapp_group_link="   ")
    assert cfg.whatsapp_group_link is None
    # Default: no link at all
    assert RegistrationFormConfig(fields=[]).whatsapp_group_link is None
