"""Per-event organizer Cashfree settings (issue #46).

Pure helpers — stdlib only, no database, no FastAPI — so they are unit
testable in isolation (see tests/test_organizer_cashfree.py).

The platform has one Cashfree account (super-admin
``PaymentGatewaySettings``). An event may additionally carry its own
organizer Cashfree credentials, stored on the event document as
``organizer_cashfree`` (``cashfree_app_id`` / ``cashfree_secret_key`` /
``cashfree_mode``). At payment time the server resolves credentials per
event: organizer settings if configured, platform default otherwise.
The secret key is never returned to the frontend — reads expose the App
ID, the mode and the last 4 characters of the secret only.
"""

from __future__ import annotations

from typing import Any, Optional

CASHFREE_MODES = ("sandbox", "production")


def mask_secret(secret: Optional[str]) -> Optional[str]:
    """Last-4 masked form of a secret key, for API reads. None when unset."""
    if not secret:
        return None
    secret = str(secret)
    if len(secret) <= 4:
        return "••••"
    return "••••" + secret[-4:]


def masked_read(stored: Optional[dict]) -> dict[str, Any]:
    """What the settings GET endpoint returns. Never includes the secret."""
    stored = stored or {}
    app_id = (stored.get("cashfree_app_id") or "").strip()
    if not app_id:
        return {
            "configured": False,
            "cashfree_app_id": None,
            "cashfree_mode": "sandbox",
            "secret_last4": None,
        }
    return {
        "configured": True,
        "cashfree_app_id": app_id,
        "cashfree_mode": stored.get("cashfree_mode") or "sandbox",
        "secret_last4": mask_secret(stored.get("cashfree_secret_key")),
    }


def normalize_organizer_settings(payload: dict, existing: Optional[dict]):
    """Validate a settings save. Returns the dict to store, or None to clear.

    ``payload`` carries raw ``cashfree_app_id`` / ``cashfree_secret_key`` /
    ``cashfree_mode`` strings (possibly empty). ``existing`` is the stored
    organizer settings dict, or None.

    Rules (issue #46):
    - App ID and secret blank -> clear the settings (None).
    - App ID set, secret blank -> keep the existing secret when one is
      stored (the form leaves the field empty to mean "unchanged");
      without an existing secret this is a half-configured save and is
      refused.
    - Secret set, App ID blank -> refused (a secret without an account).
    - Mode must be sandbox or production (defaults to sandbox).
    """
    app_id = (payload.get("cashfree_app_id") or "").strip()
    secret = payload.get("cashfree_secret_key") or ""
    secret = secret.strip() if isinstance(secret, str) else secret
    mode = (payload.get("cashfree_mode") or "sandbox").strip() or "sandbox"
    if mode not in CASHFREE_MODES:
        raise ValueError("Cashfree mode must be 'sandbox' or 'production'")

    if not app_id and not secret:
        return None
    if app_id and not secret:
        existing_secret = (existing or {}).get("cashfree_secret_key") or ""
        if not existing_secret:
            raise ValueError(
                "Cashfree secret key is required when an App ID is set — "
                "set both, or leave both empty to use the platform account."
            )
        return {
            "cashfree_app_id": app_id,
            "cashfree_secret_key": existing_secret,
            "cashfree_mode": mode,
        }
    if secret and not app_id:
        raise ValueError(
            "Cashfree App ID is required when a secret key is set — "
            "set both, or leave both empty to use the platform account."
        )
    return {
        "cashfree_app_id": app_id,
        "cashfree_secret_key": secret,
        "cashfree_mode": mode,
    }


def resolve_cashfree_settings(
    organizer: Optional[dict], platform: dict
) -> dict[str, Any]:
    """Per-event credential resolution (issue #46).

    ``organizer`` is the event's stored ``organizer_cashfree`` dict (or
    None); ``platform`` is the platform ``PaymentGatewaySettings`` dict.
    Returns the credentials to use, plus ``gateway_source`` ('organizer'
    or 'platform') so the payment order records which account was used.
    A half-configured organizer entry is refused, never silently
    downgraded to the platform account.
    """
    organizer = organizer or {}
    org_app_id = (organizer.get("cashfree_app_id") or "").strip()
    org_secret = organizer.get("cashfree_secret_key") or ""
    if org_app_id or org_secret:
        if not org_app_id or not org_secret:
            raise ValueError(
                "Organizer Cashfree settings are incomplete — set both the "
                "App ID and the secret key, or clear both to use the "
                "platform account."
            )
        return {
            "cashfree_app_id": org_app_id,
            "cashfree_secret_key": org_secret,
            "cashfree_mode": organizer.get("cashfree_mode") or "sandbox",
            "gateway_source": "organizer",
        }
    app_id = (platform or {}).get("cashfree_app_id") or ""
    secret = (platform or {}).get("cashfree_secret_key") or ""
    if not app_id or not secret:
        raise ValueError(
            "Payment gateway not configured. Contact PowerAuction admin."
        )
    return {
        "cashfree_app_id": app_id,
        "cashfree_secret_key": secret,
        "cashfree_mode": (platform or {}).get("cashfree_mode") or "sandbox",
        "gateway_source": "platform",
    }
