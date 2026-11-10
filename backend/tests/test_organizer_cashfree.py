"""
Pure unit tests for per-event organizer Cashfree settings (issue #46).

No database, no Firebase, no FastAPI: imports only ``app.cashfree``
(stdlib-only). Run:

  cd backend
  export PYTHONPATH=.
  pytest tests/test_organizer_cashfree.py -v
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from app.cashfree import (
    mask_secret,
    masked_read,
    normalize_organizer_settings,
    resolve_cashfree_settings,
)

PLATFORM = {
    "cashfree_app_id": "platform_app",
    "cashfree_secret_key": "platform_secret",
    "cashfree_mode": "production",
}

ORGANIZER = {
    "cashfree_app_id": "org_app_123",
    "cashfree_secret_key": "org_secret_abcdef",
    "cashfree_mode": "sandbox",
}


def test_mask_secret_shows_last_four_only():
    assert mask_secret("org_secret_abcdef") == "••••cdef"
    assert mask_secret("") is None
    assert mask_secret(None) is None
    assert mask_secret("ab12") == "••••"


def test_masked_read_never_includes_secret():
    read = masked_read(ORGANIZER)
    assert read["configured"] is True
    assert read["cashfree_app_id"] == "org_app_123"
    assert read["cashfree_mode"] == "sandbox"
    assert read["secret_last4"] == "••••cdef"
    assert "cashfree_secret_key" not in read
    assert "org_secret_abcdef" not in str(read)


def test_masked_read_unconfigured():
    assert masked_read(None) == {
        "configured": False,
        "cashfree_app_id": None,
        "cashfree_mode": "sandbox",
        "secret_last4": None,
    }
    assert masked_read({})["configured"] is False


def test_resolve_prefers_organizer_when_configured():
    resolved = resolve_cashfree_settings(ORGANIZER, PLATFORM)
    assert resolved["gateway_source"] == "organizer"
    assert resolved["cashfree_app_id"] == "org_app_123"
    assert resolved["cashfree_secret_key"] == "org_secret_abcdef"
    assert resolved["cashfree_mode"] == "sandbox"


def test_resolve_falls_back_to_platform_when_unconfigured():
    for organizer in (None, {}, {"cashfree_app_id": "", "cashfree_secret_key": ""}):
        resolved = resolve_cashfree_settings(organizer, PLATFORM)
        assert resolved["gateway_source"] == "platform"
        assert resolved["cashfree_app_id"] == "platform_app"
        assert resolved["cashfree_mode"] == "production"


def test_resolve_refuses_half_configured_organizer():
    # App ID without a secret must never silently use the platform account.
    with pytest.raises(ValueError, match="incomplete"):
        resolve_cashfree_settings({"cashfree_app_id": "org_app_123"}, PLATFORM)
    with pytest.raises(ValueError, match="incomplete"):
        resolve_cashfree_settings({"cashfree_secret_key": "org_secret"}, PLATFORM)


def test_resolve_requires_platform_when_nothing_configured():
    with pytest.raises(ValueError, match="not configured"):
        resolve_cashfree_settings(None, {})
    with pytest.raises(ValueError, match="not configured"):
        resolve_cashfree_settings(None, {"cashfree_app_id": "x"})


def test_normalize_save_both_fields():
    stored = normalize_organizer_settings(
        {
            "cashfree_app_id": "  org_app_123 ",
            "cashfree_secret_key": "org_secret_abcdef",
            "cashfree_mode": "production",
        },
        None,
    )
    assert stored == {
        "cashfree_app_id": "org_app_123",
        "cashfree_secret_key": "org_secret_abcdef",
        "cashfree_mode": "production",
    }


def test_normalize_save_blank_clears():
    assert normalize_organizer_settings(
        {"cashfree_app_id": "", "cashfree_secret_key": "", "cashfree_mode": "sandbox"},
        ORGANIZER,
    ) is None


def test_normalize_save_keeps_existing_secret_when_blank():
    # The form leaves the secret field empty to mean "unchanged".
    stored = normalize_organizer_settings(
        {"cashfree_app_id": "org_app_999", "cashfree_secret_key": "", "cashfree_mode": "sandbox"},
        ORGANIZER,
    )
    assert stored["cashfree_app_id"] == "org_app_999"
    assert stored["cashfree_secret_key"] == "org_secret_abcdef"


def test_normalize_save_refuses_half_configured():
    with pytest.raises(ValueError, match="secret key is required"):
        normalize_organizer_settings(
            {"cashfree_app_id": "org_app_123", "cashfree_secret_key": ""},
            None,
        )
    with pytest.raises(ValueError, match="App ID is required"):
        normalize_organizer_settings(
            {"cashfree_app_id": "", "cashfree_secret_key": "org_secret"},
            None,
        )


def test_normalize_save_rejects_bad_mode():
    with pytest.raises(ValueError, match="sandbox.*production"):
        normalize_organizer_settings(
            {
                "cashfree_app_id": "org_app_123",
                "cashfree_secret_key": "org_secret",
                "cashfree_mode": "live",
            },
            None,
        )
