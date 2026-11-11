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
        "categories": [],
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
# Member / category pricing (issue #57).
#
# The event's registration_fee is the base price, common to all. The
# organizer can create registration categories (name + pricing rule) in
# the form customization; the price then changes with the category:
#   * "flat" — one price set by the organizer (e.g. Textile owner);
#   * "member_tiered" — member price vs non-member price (e.g. Gentswear
#     retailer ₹5,000 / ₹6,000), decided by the player's mobile number;
#   * "voucher" — the base price, with a voucher discount on top
#     (e.g. Sponsor; a 100% voucher makes it ₹0, no voucher pays base).
#
# A player is a member when their mobile number matches EITHER source:
#   (a) the organizer's uploaded member list (per organizer, shared
#       across all their events), or
#   (b) a prior registration in any of THIS organizer's events.
# Phone matching is by number only — a typed name that differs from the
# sheet never blocks member status.
#
# Pure functions only (stdlib): the DB lookups live in server.py /
# app/data/pg_repo.py; this module only decides prices from inputs.
# ---------------------------------------------------------------------------

PRICING_TYPE_FLAT = "flat"
PRICING_TYPE_MEMBER_TIERED = "member_tiered"
PRICING_TYPE_VOUCHER = "voucher"
PRICING_TYPES = (PRICING_TYPE_FLAT, PRICING_TYPE_MEMBER_TIERED, PRICING_TYPE_VOUCHER)

MAX_REGISTRATION_CATEGORIES = 20


def normalize_phone_number(raw: Any) -> str:
    """10-digit Indian mobile from any typed, pasted or sheet form.

    Strips spaces, dashes, parentheses and a leading country code
    (+91 / 91 / leading 0), so "+91 98765 43210" matches "9876543210".
    Returns "" when the digits do not form a 10-digit number. Never
    raises — callers treat "" as "not a usable phone number". Mirrors
    server._normalize_in_phone's digit logic without its HTTP error.
    """
    digits = "".join(ch for ch in str(raw or "") if ch.isdigit())
    if len(digits) == 11 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) > 10:
        digits = digits[-10:]
    return digits if len(digits) == 10 else ""


def _category_price_value(raw: Any) -> int | None:
    """A price as a non-negative int, or None when missing/invalid."""
    if raw is None or raw == "":
        return None
    if isinstance(raw, bool):
        return None
    if isinstance(raw, float) and not raw.is_integer():
        return None
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return None
    if value < 0:
        return None
    return value


def normalize_registration_categories(categories: Any) -> list[dict[str, Any]]:
    """Clean an organizer-set categories list into the stored shape.

    Drops entries with no name and unknown pricing types (which fall back
    to "flat"); missing ids get a generated one. Prices are normalised to
    ints-or-None per rule; completeness is checked by
    validate_registration_categories, not here.
    """
    import uuid

    if not isinstance(categories, list):
        return []
    cleaned: list[dict[str, Any]] = []
    for raw in categories:
        if not isinstance(raw, dict):
            continue
        name = (raw.get("name") or "").strip()
        if not name:
            continue
        pricing_type = raw.get("pricing_type") or PRICING_TYPE_FLAT
        if pricing_type not in PRICING_TYPES:
            pricing_type = PRICING_TYPE_FLAT
        cid = (raw.get("id") or "").strip() or f"cat_{uuid.uuid4().hex[:8]}"
        cleaned.append(
            {
                "id": cid,
                "name": name,
                "pricing_type": pricing_type,
                "member_price": _category_price_value(raw.get("member_price")),
                "non_member_price": _category_price_value(raw.get("non_member_price")),
                "flat_price": _category_price_value(raw.get("flat_price")),
            }
        )
    return cleaned


def validate_registration_categories(categories: Any) -> str | None:
    """Validate an organizer-set categories list. Error message or None.

    Rules: at most MAX_REGISTRATION_CATEGORIES; every category needs a
    name (no case-insensitive duplicates); "flat" needs a flat price;
    "member_tiered" needs both a member and a non-member price; prices
    are non-negative integer rupees (0 = free for that category).
    """
    if categories is None:
        return None
    if not isinstance(categories, list):
        return "Registration categories must be a list"
    if len(categories) > MAX_REGISTRATION_CATEGORIES:
        return f"At most {MAX_REGISTRATION_CATEGORIES} registration categories"
    seen_names: set[str] = set()
    for raw in categories:
        if not isinstance(raw, dict):
            return "Each registration category must have a name and a pricing rule"
        name = (raw.get("name") or "").strip()
        if not name:
            return "Each registration category needs a name"
        if name.lower() in seen_names:
            return f"Duplicate registration category name: {name}"
        seen_names.add(name.lower())
        pricing_type = raw.get("pricing_type") or PRICING_TYPE_FLAT
        if pricing_type not in PRICING_TYPES:
            return f"Unknown pricing rule for category {name}"
        if pricing_type == PRICING_TYPE_FLAT:
            if _category_price_value(raw.get("flat_price")) is None:
                return f"Category {name} needs a price"
        elif pricing_type == PRICING_TYPE_MEMBER_TIERED:
            if _category_price_value(raw.get("member_price")) is None:
                return f"Category {name} needs a member price"
            if _category_price_value(raw.get("non_member_price")) is None:
                return f"Category {name} needs a non-member price"
    return None


def resolve_registration_category(
    categories: Any, category_id: Any
) -> dict[str, Any] | None:
    """The category with this id, or None (also None when no id given)."""
    if not category_id:
        return None
    for cat in normalize_registration_categories(categories):
        if cat["id"] == category_id:
            return cat
    return None


def category_price(
    base_fee: Any,
    categories: Any,
    category_id: Any,
    is_member: bool,
) -> int:
    """Fee BEFORE any voucher for this category + member status.

    No categories configured, no category picked, or an unknown category
    id → the base fee. "flat" replaces the base fee; "member_tiered"
    picks the member or non-member price; "voucher" keeps the base fee
    (the voucher is applied on top by the caller).
    """
    fee = int(base_fee or 0)
    cat = resolve_registration_category(categories, category_id)
    if cat is None:
        return fee
    if cat["pricing_type"] == PRICING_TYPE_FLAT:
        return int(cat["flat_price"] or 0)
    if cat["pricing_type"] == PRICING_TYPE_MEMBER_TIERED:
        price = cat["member_price"] if is_member else cat["non_member_price"]
        return int(price or 0)
    return fee


def is_member_phone(*, listed: bool, existing_player: bool) -> bool:
    """Member = in the organizer's uploaded list OR a prior registration
    in one of this organizer's events. Either source counts."""
    return bool(listed or existing_player)


_MEMBER_PHONE_KEYS = ("phone", "mobile", "mobile number", "phone number", "contact_number", "contact number")
_MEMBER_NAME_KEYS = ("name", "full name", "member name")


def _member_row_key(headers: list[str], wanted: tuple[str, ...]) -> str | None:
    """First header matching one of the wanted keys (case-insensitive)."""
    lowered = {h.strip().lower(): h for h in headers if isinstance(h, str)}
    for key in wanted:
        if key in lowered:
            return lowered[key]
    return None


def _clean_cell(value: Any) -> Any:
    """One Excel cell into a plain value: NaN → None (blank), an
    integral float → int (pandas reads a 10-digit phone column as
    9876543210.0 when any cell is empty — without this the ".0" would
    corrupt the number)."""
    if isinstance(value, float):
        if value != value:  # NaN
            return None
        if value.is_integer():
            return int(value)
    return value


def parse_member_rows(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[str]]:
    """Turn parsed Excel rows into member records + per-row errors.

    ``rows`` is a list of dicts keyed by the sheet's header row. A row
    needs a usable phone number; the name is optional (matching is by
    phone only). Every other column is kept as ``details``. Fully-empty
    rows are skipped silently; rows with an unusable phone are reported
    (``Row N: ...``) instead of failing the whole upload. A phone that
    appears twice keeps the LAST row's data.
    """
    members: list[dict[str, Any]] = []
    errors: list[str] = []
    by_phone: dict[str, dict[str, Any]] = {}
    for index, row in enumerate(rows, start=2):  # header is row 1
        if not isinstance(row, dict):
            continue
        row = {k: _clean_cell(v) for k, v in row.items()}
        if all(v is None or (isinstance(v, str) and not v.strip()) for v in row.values()):
            continue
        headers = list(row.keys())
        phone_key = _member_row_key(headers, _MEMBER_PHONE_KEYS)
        name_key = _member_row_key(headers, _MEMBER_NAME_KEYS)
        phone = normalize_phone_number(row.get(phone_key) if phone_key else None)
        if not phone:
            errors.append(f"Row {index}: no usable phone number")
            continue
        name = ""
        if name_key:
            name = str(row.get(name_key) or "").strip()
        details: dict[str, Any] = {}
        for key, value in row.items():
            if key in (phone_key, name_key):
                continue
            if value is None or (isinstance(value, str) and not value.strip()):
                continue
            details[str(key).strip()] = value
        by_phone[phone] = {"phone": phone, "name": name, "details": details}
    members = list(by_phone.values())
    return members, errors


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
