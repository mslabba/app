"""Default registration form configs for auctions."""

from __future__ import annotations

from typing import Any


def _field(
    key: str,
    label: str,
    ftype: str,
    *,
    enabled: bool = False,
    required: bool = False,
    locked: bool = False,
    placeholder: str | None = None,
    options: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "id": key,
        "key": key,
        "label": label,
        "type": ftype,
        "enabled": enabled,
        "required": required,
        "builtin": True,
        "locked": locked,
        "placeholder": placeholder,
        "options": options or [],
    }


def default_registration_form_config() -> dict[str, Any]:
    """Minimal default for new auctions: name + mobile only."""
    return {
        "fields": [
            _field("name", "Full name", "text", enabled=True, required=True, locked=True, placeholder="Enter your full name"),
            _field("contact_number", "Mobile number", "tel", enabled=True, required=True, locked=True, placeholder="+91 …"),
            _field("email", "Email address", "email", placeholder="you@example.com"),
            _field("age", "Age", "number", placeholder="Age"),
            _field("date_of_birth", "Date of birth", "date"),
            _field("district", "District", "text", placeholder="District"),
            _field("state", "State", "text", placeholder="State"),
            _field("position", "Position / role", "text", placeholder="e.g. Batsman, Forward"),
            _field("specialty", "Specialty", "text"),
            _field("previous_team", "Previous team", "text"),
            _field("cricheroes_link", "CricHeroes / profile link", "text", placeholder="https://…"),
            _field("photo_url", "Player photo", "image"),
            _field("identity_proof_url", "ID proof", "file"),
            _field("matches", "Matches played", "number"),
            _field("runs", "Runs / goals", "number"),
            _field("wickets", "Wickets / assists", "number"),
        ]
    }


def legacy_registration_form_config() -> dict[str, Any]:
    """Match the old public form when no config is saved yet."""
    cfg = default_registration_form_config()
    always = {
        "name",
        "contact_number",
        "age",
        "email",
        "district",
        "position",
        "specialty",
        "previous_team",
        "cricheroes_link",
        "photo_url",
        "identity_proof_url",
        "matches",
        "runs",
        "wickets",
    }
    required = {"name", "contact_number", "photo_url"}
    for f in cfg["fields"]:
        if f["key"] in always:
            f["enabled"] = True
            f["required"] = f["key"] in required
    return cfg


def resolve_registration_form_config(event_data: dict[str, Any] | None) -> dict[str, Any]:
    if event_data is None:
        return default_registration_form_config()
    cfg = event_data.get("registration_form_config")
    if isinstance(cfg, dict) and cfg.get("fields"):
        return cfg
    return legacy_registration_form_config()
