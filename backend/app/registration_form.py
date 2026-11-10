"""Default registration form configs for auctions."""

from __future__ import annotations

from datetime import date
from typing import Any

# Field keys stored on the registration root (not extra_fields), mirroring
# COLUMN_KEYS in frontend/src/lib/registrationFormConfig.js.
COLUMN_KEYS = {
    "name",
    "age",
    "position",
    "specialty",
    "previous_team",
    "cricheroes_link",
    "contact_number",
    "email",
    "photo_url",
    "district",
    "identity_proof_url",
}

# Field keys nested under payload["stats"], mirroring STATS_KEYS.
STATS_KEYS = {"matches", "runs", "wickets", "goals", "assists"}


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
        "whatsapp_group_link": None,
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


# ---------------------------------------------------------------------------
# WhatsApp group link (optional, organizer-set).
#
# Shown to confirmed players only, as a "Join WhatsApp group" button on
# their registration ticket. It is a setting on the form config, not a
# field players fill in — so it lives beside "fields", not inside it.
# ---------------------------------------------------------------------------

WHATSAPP_GROUP_LINK_PREFIX = "https://chat.whatsapp.com/"

WHATSAPP_GROUP_LINK_ERROR = (
    "Enter a WhatsApp group invite link, e.g. https://chat.whatsapp.com/…"
)


def validate_whatsapp_group_link(value: Any) -> str | None:
    """Validate an organizer-set WhatsApp group invite link.

    Returns an error message, or None when the value is acceptable.
    Empty / missing is fine — the link is optional.
    """
    if value is None:
        return None
    if not isinstance(value, str):
        return WHATSAPP_GROUP_LINK_ERROR
    link = value.strip()
    if not link:
        return None
    if not link.startswith(WHATSAPP_GROUP_LINK_PREFIX):
        return WHATSAPP_GROUP_LINK_ERROR
    if len(link) <= len(WHATSAPP_GROUP_LINK_PREFIX):
        return WHATSAPP_GROUP_LINK_ERROR
    return None


def normalize_whatsapp_group_link(value: Any) -> str | None:
    """Trim the link; empty becomes None so a cleared link is removed."""
    if value is None or not isinstance(value, str):
        return None
    link = value.strip()
    return link or None


# ---------------------------------------------------------------------------
# Server-side enforcement of the registration form config.
#
# The public form enforces required fields and conditions client-side
# (frontend/src/lib/registrationFormConfig.js: validateRegistrationValues /
# validateFieldConditions), but the API never checked them — a direct API
# call could register with required fields missing. These helpers mirror
# the frontend logic so register-player and create-order can enforce the
# same rules server-side.
# ---------------------------------------------------------------------------


def _is_empty(raw: Any) -> bool:
    return raw is None or (isinstance(raw, str) and raw.strip() == "")


def _payload_value(payload: dict[str, Any], key: str) -> Any:
    """Where a field's value lives in a registration payload: stats keys
    under payload["stats"], column keys on the root, everything else
    (date_of_birth, state, custom fields) under payload["extra_fields"]
    — with a root fallback, matching the frontend payload builder."""
    if not isinstance(payload, dict):
        return None
    if key in STATS_KEYS:
        stats = payload.get("stats")
        return stats.get(key) if isinstance(stats, dict) else None
    if key in COLUMN_KEYS:
        return payload.get(key)
    extra = payload.get("extra_fields")
    if isinstance(extra, dict) and key in extra:
        return extra.get(key)
    return payload.get(key)


def _age_in_years(date_str: str, as_of: date | None = None) -> int | None:
    """Whole years between a YYYY-MM-DD date and today (standard age calc,
    mirroring the frontend ageInYears helper). None if unparseable."""
    try:
        birth = date.fromisoformat(str(date_str).strip()[:10])
    except ValueError:
        return None
    today = as_of or date.today()
    years = today.year - birth.year
    if (today.month, today.day) < (birth.month, birth.day):
        years -= 1
    return years


def _compare(actual: Any, op: str, target: Any) -> bool:
    if op == "lt":
        return actual < target
    if op == "lte":
        return actual <= target
    if op == "gt":
        return actual > target
    if op == "gte":
        return actual >= target
    if op == "eq":
        return actual == target
    return True  # unknown op: do not block (mirrors the frontend)


_OP_LABELS = {
    "lt": "less than",
    "lte": "at most",
    "gt": "more than",
    "gte": "at least",
    "eq": "exactly",
}


def _describe_condition(field: dict[str, Any], cond: dict[str, Any]) -> str:
    label = field.get("label") or field.get("key") or "This field"
    kind = cond.get("kind") or "value"
    op = cond.get("op")
    value = cond.get("value")
    if kind == "age":
        return f"Age must be {_OP_LABELS.get(op, op)} {value} years"
    if kind == "date":
        return f"{label} must be {_OP_LABELS.get(op, op)} {value}"
    return f"{label} must be {_OP_LABELS.get(op, op)} {value}"


def _check_conditions(field: dict[str, Any], raw: Any) -> str | None:
    """One field's conditions against its raw value. Returns an error
    string or None. Empty values skip conditions (required-ness is checked
    separately) — same as the frontend."""
    conditions = field.get("conditions")
    if not isinstance(conditions, list) or not conditions:
        return None
    if _is_empty(raw):
        return None
    label = field.get("label") or field.get("key") or "This field"
    for cond in conditions:
        if not isinstance(cond, dict) or not cond.get("op"):
            continue
        if cond.get("value") in (None, ""):
            continue
        message = (cond.get("message") or "").strip() or None
        kind = cond.get("kind") or "value"
        op = cond.get("op")
        if kind == "age":
            years = _age_in_years(str(raw))
            if years is None:
                return f"{label} must be a valid date"
            if not _compare(years, op, float(cond["value"])):
                return message or _describe_condition(field, cond)
        elif kind == "date" or field.get("type") == "date":
            try:
                actual = date.fromisoformat(str(raw).strip()[:10])
            except ValueError:
                return f"{label} must be a valid date"
            try:
                target = date.fromisoformat(str(cond["value"]).strip()[:10])
            except ValueError:
                continue  # unparseable rule target: ignore the rule
            if not _compare(actual, op, target):
                return message or _describe_condition(field, cond)
        else:
            try:
                actual = float(raw)
            except (TypeError, ValueError):
                return f"{label} must be a number"
            if not _compare(actual, op, float(cond["value"])):
                return message or _describe_condition(field, cond)
    return None


def validate_registration_payload(
    event_data: dict[str, Any] | None, payload: dict[str, Any] | None
) -> list[str]:
    """Validate a registration payload against the event's resolved form
    config. Returns a list of error messages (empty = valid).

    Rules, mirroring the frontend:
    * only *enabled* fields are checked — disabled fields are never
      required and their conditions never apply;
    * an enabled + required field must be present and non-empty;
    * conditions (value/date/computed-age comparisons lt/lte/gt/gte/eq,
      with the organizer's custom message when set) must hold.

    ``payload`` is the PublicPlayerRegistration-shaped dict: root column
    fields, ``stats`` for matches/runs/wickets/goals/assists, and
    ``extra_fields`` for date_of_birth, state and custom fields.
    """
    cfg = resolve_registration_form_config(event_data)
    payload = payload or {}
    errors: list[str] = []
    for field in cfg.get("fields") or []:
        if not isinstance(field, dict) or not field.get("enabled"):
            continue
        key = field.get("key") or field.get("id")
        if not key:
            continue
        raw = _payload_value(payload, key)
        label = field.get("label") or key
        if field.get("required") and _is_empty(raw):
            errors.append(f"{label} is required")
            continue
        error = _check_conditions(field, raw)
        if error:
            errors.append(error)
    return errors
