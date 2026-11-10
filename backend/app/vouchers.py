"""Voucher-code logic for PowerAuction registration discounts.

STDLIB ONLY — no firebase / sqlalchemy imports — so this module is unit
testable without a database or Firebase credentials. All persistence lives
in ``server.py`` / ``app/data/pg_repo.py``; this module only decides:

* how codes are generated and what a valid custom code looks like,
* what a voucher is worth against a registration fee,
* whether a stored voucher row is currently usable.

Money is integer rupees throughout. Percent discounts use round-half-up
(``(fee * pct + 50) // 100``), matching the ``Math.round`` behaviour of the
public form's preview — Python's built-in ``round()`` is banker's rounding
and would disagree on exact halves (e.g. 50% of Rs. 501).
"""

from __future__ import annotations

import re
import secrets
from datetime import date, datetime, timezone
from typing import Any, Optional

# Crockford base32 without the ambiguous characters 0/O, 1/I and L.
CROCKFORD_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ"
GENERATED_CODE_LENGTH = 8

_CUSTOM_CODE_RE = re.compile(r"^[A-Z0-9][A-Z0-9-]{3,19}$")
# A code must contain at least one letter or digit (the regex already
# guarantees that: it starts with [A-Z0-9] and is 4-20 chars).

VOUCHER_TYPES = ("full", "percent", "fixed")

# Reasons returned by validate_voucher(). "valid" is the only success.
VALID = "valid"
REASON_NOT_FOUND = "not_found"
REASON_WRONG_EVENT = "wrong_event"
REASON_INACTIVE = "inactive"
REASON_EXPIRED = "expired"
REASON_FULLY_USED = "fully_used"


def normalize_code(code: Optional[str]) -> str:
    """Upper-case and trim a code as entered by a player or organizer."""
    return (code or "").strip().upper()


def generate_code(length: int = GENERATED_CODE_LENGTH) -> str:
    """Random code from the Crockford alphabet (no 0/O/1/I/L).

    Readable over the phone and safe to print on a poster. Uniqueness per
    event is enforced by the caller (unique constraint / pre-insert check),
    not here — generation alone cannot guarantee it.
    """
    return "".join(secrets.choice(CROCKFORD_ALPHABET) for _ in range(length))


def is_valid_custom_code(code: Optional[str]) -> bool:
    """Organizer-chosen codes: 4-20 chars, A-Z 0-9 and ``-`` only.

    Checked against the *normalized* code, so lower-case input is fine.
    """
    return bool(_CUSTOM_CODE_RE.match(normalize_code(code)))


def compute_amount_due(fee: int, voucher_type: str, value: Optional[int]) -> int:
    """Amount (integer rupees) still payable after applying a voucher.

    * ``full``    -> 0, whatever the fee.
    * ``percent`` -> fee minus round-half-up(fee * pct / 100), floored at 0.
    * ``fixed``   -> fee minus the fixed amount, floored at 0.
    """
    fee = int(fee or 0)
    if voucher_type == "full":
        return 0
    if voucher_type == "percent":
        pct = int(value or 0)
        discount = (fee * pct + 50) // 100
        return max(fee - discount, 0)
    if voucher_type == "fixed":
        return max(fee - int(value or 0), 0)
    raise ValueError(f"Unknown voucher type: {voucher_type!r}")


def discount_amount(fee: int, voucher_type: str, value: Optional[int]) -> int:
    """Rupees saved by the voucher (fee minus amount due)."""
    return int(fee or 0) - compute_amount_due(fee, voucher_type, value)


def _parse_expires_at(raw: Any) -> Optional[datetime]:
    """Accept a datetime, date, or ISO-8601 string; anything else is None
    (treated as 'no expiry' only when the raw value itself is None — an
    unparseable non-None value is treated as expired, fail-closed).

    A bare date (YYYY-MM-DD) means the END of that day (23:59:59.999999
    UTC): the frontend sends date-only expiries from a date input, and a
    voucher expiring 2026-12-01 must stay usable throughout 1 Dec. This
    mirrors the create/PATCH parsing in models._expires_at_end_of_day."""
    if raw is None:
        return None
    if isinstance(raw, datetime):
        return raw
    if isinstance(raw, date):
        return datetime(raw.year, raw.month, raw.day, 23, 59, 59, 999999, tzinfo=timezone.utc)
    if isinstance(raw, str):
        text = raw.strip()
        if not text:
            return None
        try:
            parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        except ValueError:
            return _EXPIRED_SENTINEL
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        if len(text) == 10:
            # Date-only string: end of that day, not midnight at its start.
            parsed = parsed.replace(hour=23, minute=59, second=59, microsecond=999999)
        return parsed
    return _EXPIRED_SENTINEL


# Sentinel: an unparseable expires_at is treated as already expired.
_EXPIRED_SENTINEL = datetime(1970, 1, 1, tzinfo=timezone.utc)


def validate_voucher(
    voucher: Optional[dict[str, Any]],
    event_id: str,
    now: Optional[datetime] = None,
) -> tuple[bool, str]:
    """Is this stored voucher row usable for this event right now?

    Returns ``(True, "valid")`` or ``(False, <reason>)`` where reason is one
    of ``not_found`` / ``wrong_event`` / ``inactive`` / ``expired`` /
    ``fully_used``. Callers must NOT surface the reason to the player on the
    public validate endpoint (code enumeration) — there it is always a
    generic "invalid code". The specific reasons exist so the server-side
    redemption paths can explain a failure to the organizer / logs.
    """
    if not voucher:
        return False, REASON_NOT_FOUND
    if voucher.get("event_id") != event_id:
        return False, REASON_WRONG_EVENT
    if voucher.get("active") is False:
        return False, REASON_INACTIVE
    expires_at = _parse_expires_at(voucher.get("expires_at"))
    if expires_at is not None:
        moment = now or datetime.now(timezone.utc)
        if moment.tzinfo is None:
            moment = moment.replace(tzinfo=timezone.utc)
        if moment >= expires_at:
            return False, REASON_EXPIRED
    max_uses = voucher.get("max_uses")
    if max_uses is not None:
        try:
            remaining = int(max_uses) - int(voucher.get("used_count") or 0)
        except (TypeError, ValueError):
            return False, REASON_FULLY_USED
        if remaining <= 0:
            return False, REASON_FULLY_USED
    return True, VALID


def can_consume(voucher: Optional[dict[str, Any]], event_id: str) -> bool:
    """Same checks as validate_voucher(), for the atomic-consume guard.

    The consume itself must still happen inside the transaction / row lock:
    this pre-check is only an early signal — two concurrent requests can
    both pass it, and the transaction is what enforces the cap.
    """
    valid, _reason = validate_voucher(voucher, event_id)
    return valid


def validate_voucher_definition(
    voucher_type: str, value: Optional[int], max_uses: Optional[int]
) -> Optional[str]:
    """Validate a voucher's type/value/max_uses at creation/update time.

    Returns an error message, or None when the definition is acceptable.
    ``full`` takes no value; ``percent`` is 1-99; ``fixed`` is >= 1 rupee.
    ``max_uses`` is null (unlimited) or >= 1.
    """
    if voucher_type not in VOUCHER_TYPES:
        return f"Voucher type must be one of: {', '.join(VOUCHER_TYPES)}"
    if voucher_type == "full":
        if value is not None:
            return "A full voucher has no value — leave value empty"
    elif voucher_type == "percent":
        if value is None or not 1 <= int(value) <= 99:
            return "Percent vouchers need a value between 1 and 99"
    elif voucher_type == "fixed":
        if value is None or int(value) < 1:
            return "Fixed-amount vouchers need a value of at least 1 rupee"
    if max_uses is not None and int(max_uses) < 1:
        return "max_uses must be at least 1, or empty for unlimited"
    return None
