from pydantic import BaseModel, Field, ConfigDict, BeforeValidator, field_validator
from typing import List, Optional, Dict, Any, Union, Annotated
from datetime import datetime, date
from enum import Enum

class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    EVENT_ORGANIZER = "event_organizer" 
    TEAM_ADMIN = "team_admin"
    AUCTIONEER = "auctioneer"
    VIEWER = "viewer"

class AuctionStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    COMPLETED = "completed"

class PlayerStatus(str, Enum):
    AVAILABLE = "available"
    SOLD = "sold"
    UNSOLD = "unsold"
    CURRENT = "current"
    # Skipped from the block without sale / unsold — can re-enter later
    ON_HOLD = "on_hold"

# User Models
class UserCreate(BaseModel):
    email: str
    password: str
    role: UserRole = UserRole.EVENT_ORGANIZER
    display_name: str
    mobile_number: Optional[str] = None
    team_id: Optional[str] = None

class UserResponse(BaseModel):
    uid: str
    email: str
    role: UserRole
    display_name: str
    mobile_number: Optional[str] = None
    team_id: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

# Event Models
class EventRules(BaseModel):
    min_squad_size: int = 11
    max_squad_size: int = 18
    min_bid_increment: int = 50000
    max_foreign_players: Optional[int] = None
    timer_duration: int = 60  # seconds per player
    rtm_cards_per_team: int = 2

class PaymentSettings(BaseModel):
    collect_payment: bool = False
    registration_fee: Optional[int] = None  # Amount to collect

class RegistrationFormFieldCondition(BaseModel):
    """One validation rule on a registration form field.

    kind:
      - "value": compare the field's numeric value (number fields, e.g. Age)
      - "date": compare the field's date value (date fields, e.g. Date of birth)
      - "age": compute age in years from the field's date value and compare
    op: lt | lte | gt | gte | eq
    value: number for "value"/"age" rules, "YYYY-MM-DD" string for "date" rules
    """

    kind: str = "value"
    op: str
    value: Union[float, str]
    message: Optional[str] = None  # custom error shown to the player


class RegistrationFormField(BaseModel):
    id: str
    key: str
    label: str
    type: str = "text"  # text, textarea, number, email, tel, date, select, image, file
    enabled: bool = False
    required: bool = False
    builtin: bool = False
    locked: bool = False
    placeholder: Optional[str] = None
    options: Optional[List[str]] = None  # for select / dropdown
    conditions: Optional[List[RegistrationFormFieldCondition]] = None


class RegistrationCategory(BaseModel):
    """One organizer-created registration category (issue #57).

    pricing_type: "flat" (one price), "member_tiered" (member price vs
    non-member price, decided by the player's mobile number) or
    "voucher" (base fee, voucher discount on top).
    """

    id: str
    name: str
    pricing_type: str = "flat"
    member_price: Optional[int] = None
    non_member_price: Optional[int] = None
    flat_price: Optional[int] = None


class RegistrationFormConfig(BaseModel):
    fields: List[RegistrationFormField] = []
    # Optional WhatsApp group invite link, set by the organizer in the
    # Registration form settings. Shown to confirmed players only, as a
    # "Join WhatsApp group" button on their registration ticket.
    whatsapp_group_link: Optional[str] = None
    # Organizer-created registration categories with per-category pricing
    # rules (issue #57). Empty = today's single base fee for everyone.
    categories: List[RegistrationCategory] = []

    @field_validator("whatsapp_group_link")
    @classmethod
    def _validate_whatsapp_group_link(cls, v):
        # Imported here (not at module top): app.registration_form is
        # stdlib-only, but keeping the import local avoids any import-order
        # coupling between the models module and the app package.
        from app.registration_form import (
            normalize_whatsapp_group_link,
            validate_whatsapp_group_link,
        )

        error = validate_whatsapp_group_link(v)
        if error is not None:
            raise ValueError(error)
        return normalize_whatsapp_group_link(v)

    @field_validator("categories", mode="before")
    @classmethod
    def _validate_categories(cls, v):
        # mode="before": normalise (including generating an id when one
        # is missing) before pydantic coerces each item into
        # RegistrationCategory.
        from app.registration_form import (
            normalize_registration_categories,
            validate_registration_categories,
        )

        error = validate_registration_categories(v)
        if error is not None:
            raise ValueError(error)
        return normalize_registration_categories(v)


class EventCreate(BaseModel):
    name: str
    date: str
    rules: EventRules
    description: Optional[str] = None
    logo_url: Optional[str] = None
    organizer_logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    payment_settings: Optional[PaymentSettings] = PaymentSettings()
    has_registration_limit: bool = False
    registration_limit: Optional[int] = None
    registration_form_config: Optional[RegistrationFormConfig] = None

class Event(BaseModel):
    id: str
    name: str
    date: str
    status: AuctionStatus = AuctionStatus.NOT_STARTED
    rules: EventRules
    description: Optional[str] = None
    logo_url: Optional[str] = None
    organizer_logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    created_at: str
    created_by: str
    organizer_name: Optional[str] = None
    organizer_mobile: Optional[str] = None
    payment_settings: Optional[PaymentSettings] = PaymentSettings()
    has_registration_limit: bool = False
    registration_limit: Optional[int] = None
    registration_form_config: Optional[Dict[str, Any]] = None

# Category Models
class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    event_id: str
    min_players: int
    max_players: int
    color: str
    base_price: int  # Base price for this category

class Category(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    event_id: str
    min_players: int
    max_players: int
    color: str
    base_price: int  # Base price for this category

# Bank Details Models
class BankDetailsCreate(BaseModel):
    bank_name: str
    account_holder_name: str
    account_number: str
    ifsc_code: Optional[str] = None
    swift_code: Optional[str] = None
    branch_name: Optional[str] = None
    upi_id: Optional[str] = None

class BankDetails(BaseModel):
    id: str
    user_id: str
    bank_name: str
    account_holder_name: str
    account_number: str
    ifsc_code: Optional[str] = None
    swift_code: Optional[str] = None
    branch_name: Optional[str] = None
    upi_id: Optional[str] = None
    created_at: str
    updated_at: str

# Super Admin Payment Gateway Settings
class PaymentGatewaySettingsCreate(BaseModel):
    cashfree_app_id: str
    cashfree_secret_key: str
    cashfree_mode: str = "sandbox"  # sandbox or production

class PaymentGatewaySettings(BaseModel):
    id: str
    cashfree_app_id: str
    cashfree_secret_key: str
    cashfree_mode: str
    created_at: str
    updated_at: str
    updated_by: str  # Super admin who updated

# Payment Models
class PaymentOrderCreate(BaseModel):
    event_id: str
    customer_name: str
    customer_email: str
    customer_phone: str
    amount: float
    # Full register-player payload, saved on the order so the server can
    # complete the registration even if the player never returns from the
    # payment gateway (see _complete_paid_registration in server.py).
    form_data: Optional[Dict[str, Any]] = None
    # Optional voucher code. The discount is always computed server-side
    # from the stored voucher + the event fee; the client-sent amount is
    # ignored (as it already was for the fee itself).
    voucher_code: Optional[str] = None


# Voucher Models
def _expires_at_end_of_day(value):
    """Normalize a voucher expiry before pydantic parses it.

    The frontend sends expires_at as a date-only string (YYYY-MM-DD, from
    a date input). A bare date means the END of that day: a voucher
    expiring 2026-12-01 is usable throughout 1 Dec, not just until
    midnight at its start. The end of day is 23:59:59.999999 UTC — the
    server compares expiries in UTC (see app/vouchers._parse_expires_at,
    which applies the same rule to stored date-only strings). Full ISO
    datetimes pass through unchanged; unparseable values are left for
    pydantic to reject with a 422.
    """
    if isinstance(value, str):
        text = value.strip()
        if len(text) == 10:
            try:
                day = date.fromisoformat(text)
            except ValueError:
                return value
            return datetime(day.year, day.month, day.day, 23, 59, 59, 999999)
    return value


# A voucher expiry: full ISO datetime, or a bare YYYY-MM-DD date (end of day).
ExpiresAt = Annotated[datetime, BeforeValidator(_expires_at_end_of_day)]


class VoucherCreate(BaseModel):
    """Organizer creates one voucher code for one event.

    type: "full" (free entry, value must be empty) | "percent" (value 1-99)
    | "fixed" (value >= 1 rupee off). code: optional organizer-chosen code
    (4-20 chars A-Z 0-9 + "-"); when omitted the server generates an
    8-char Crockford base32 code. max_uses: null = unlimited.
    expires_at: full ISO datetime, or a bare YYYY-MM-DD date (see
    _expires_at_end_of_day — a date means the end of that day, UTC).
    """

    type: str
    value: Optional[int] = None
    max_uses: Optional[int] = None
    expires_at: Optional[ExpiresAt] = None
    code: Optional[str] = None
    label: Optional[str] = None


class VoucherUpdate(BaseModel):
    """Organizer edits a voucher. type/value may only change while the
    voucher has never been used (used_count == 0) — the route enforces
    that; this model only carries the fields. expires_at follows the same
    date-only-means-end-of-day rule as VoucherCreate. Note: there is no
    way to clear an expiry via PATCH (null means 'not provided')."""

    active: Optional[bool] = None
    max_uses: Optional[int] = None
    expires_at: Optional[ExpiresAt] = None
    label: Optional[str] = None
    type: Optional[str] = None
    value: Optional[int] = None


class VoucherResponse(BaseModel):
    id: str
    event_id: str
    code: str
    type: str
    value: Optional[int] = None
    max_uses: Optional[int] = None
    used_count: int = 0
    active: bool = True
    expires_at: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[str] = None
    label: Optional[str] = None


class VoucherValidateRequest(BaseModel):
    code: str


class VoucherValidateResponse(BaseModel):
    valid: bool
    type: Optional[str] = None
    value: Optional[int] = None
    amount_due: int
    discount_amount: int = 0
    message: str


class FeeQuoteRequest(BaseModel):
    """Public fee quote (issue #57): what would this registration cost?

    category_id is the organizer-configured category the player picked
    (absent = base fee). phone is the mobile number to check for member
    status (absent = non-member price). voucher_code is optional and is
    validated the same way as the voucher preview — an invalid code is
    ignored, never an error.
    """

    category_id: Optional[str] = None
    phone: Optional[str] = None
    voucher_code: Optional[str] = None


class FeeQuoteResponse(BaseModel):
    fee: int  # category price before any voucher
    amount_due: int  # what the player actually pays
    discount_amount: int = 0
    is_member: bool = False
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    voucher_valid: bool = False
    voucher_type: Optional[str] = None
    voucher_value: Optional[int] = None
    message: str = ""

class PaymentOrderResponse(BaseModel):
    order_id: str
    payment_session_id: str
    order_amount: float
    order_currency: str
    # Set when the player already has a PAID order for this event: no new
    # charge was created; registration_id is set when it was completed.
    already_paid: bool = False
    registration_id: Optional[str] = None

class PaymentVerificationRequest(BaseModel):
    order_id: str
    event_id: str

class PaymentVerificationResponse(BaseModel):
    payment_status: str
    order_id: str
    order_amount: float
    transaction_id: Optional[str] = None
    # Registration completed server-side from the payload saved at order
    # creation (webhook path or this verify call). False when paid but no
    # saved payload exists (orders created before this fix) — those need
    # organizer follow-up, not another payment.
    registration_completed: bool = False
    registration_id: Optional[str] = None
    # Saved registration payload from order creation (already stored on the
    # payment order). Returned so the public success screen can render the
    # registration ticket after a gateway return, when the browser holds no
    # form state. None for orders created before the payload was saved.
    form_data: Optional[Dict[str, Any]] = None
    # Server-truth category name + member flag for the ticket (issue #57).
    # The category id in form_data is the player's pick; these are what
    # the server charged for.
    registration_category: Optional[str] = None
    is_member: Optional[bool] = None
    # Voucher code recorded on the payment order, if a voucher was used.
    # Returned for the same reason — the ticket labels voucher payments.
    voucher_code: Optional[str] = None

# Team Models
class TeamCreate(BaseModel):
    name: str
    event_id: str
    budget: int
    max_squad_size: int
    logo_url: Optional[str] = None
    color: Optional[str] = None
    admin_email: Optional[str] = None

class Team(BaseModel):
    id: str
    name: str
    event_id: str
    budget: int
    spent: int = 0
    remaining: int
    max_squad_size: int
    logo_url: Optional[str] = None
    color: Optional[str] = None
    admin_uid: Optional[str] = None
    admin_email: Optional[str] = None
    players_count: int = 0

# Player Models
class PlayerStats(BaseModel):
    matches: Optional[int] = None
    runs: Optional[int] = None
    wickets: Optional[int] = None
    goals: Optional[int] = None
    assists: Optional[int] = None
    custom: Optional[Dict[str, Any]] = None

class PlayerCreate(BaseModel):
    name: str
    category_id: str
    base_price: int
    photo_url: Optional[str] = None
    age: Optional[int] = None
    position: Optional[str] = None
    specialty: Optional[str] = None
    stats: Optional[PlayerStats] = None
    previous_team: Optional[str] = None
    cricheroes_link: Optional[str] = None
    contact_number: Optional[str] = None
    district: Optional[str] = None
    identity_proof_url: Optional[str] = None
    is_priority: bool = False
    # Custom + non-column form fields (email, DOB, state, organizer-defined)
    extra_fields: Optional[Dict[str, Any]] = None

class Player(BaseModel):
    id: str
    name: str
    category_id: str
    base_price: int
    current_price: Optional[int] = None
    photo_url: Optional[str] = None
    age: Optional[int] = None
    position: Optional[str] = None
    specialty: Optional[str] = None
    stats: Optional[PlayerStats] = None
    status: PlayerStatus = PlayerStatus.AVAILABLE
    sold_to_team_id: Optional[str] = None
    sold_price: Optional[int] = None
    previous_team: Optional[str] = None
    cricheroes_link: Optional[str] = None
    contact_number: Optional[str] = None
    district: Optional[str] = None
    identity_proof_url: Optional[str] = None
    is_priority: bool = False
    extra_fields: Optional[Dict[str, Any]] = None

# Public Player Registration Model
class PublicPlayerRegistration(BaseModel):
    name: str
    age: Optional[int] = None
    position: Optional[str] = None
    specialty: Optional[str] = None
    previous_team: Optional[str] = None
    cricheroes_link: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None
    photo_url: Optional[str] = None
    district: Optional[str] = None
    identity_proof_url: Optional[str] = None
    stats: Optional[PlayerStats] = None
    payment_order_id: Optional[str] = None  # For paid registrations
    # Optional voucher code. Full vouchers (amount due 0) register directly
    # through this endpoint; partial vouchers go through create-order and
    # arrive here with payment_order_id instead.
    voucher_code: Optional[str] = None
    # Registration category id picked by the player (issue #57). The
    # server validates it against the event's configured categories; the
    # category NAME is stored on the registration/payment as the display
    # value. Server-set from the payment order / category pricing at
    # registration time.
    registration_category: Optional[str] = None
    is_member: Optional[bool] = None
    amount_paid: Optional[int] = None
    discount_amount: Optional[int] = None
    original_amount: Optional[int] = None
    # Custom + non-column fields (date_of_birth, state, organizer-defined fields)
    extra_fields: Optional[Dict[str, Any]] = None

# Approval Request Model
class ApprovalRequest(BaseModel):
    category_id: str
    base_price: int

# Bid Models
class BidCreate(BaseModel):
    player_id: str
    event_id: str
    amount: int

class Bid(BaseModel):
    id: str
    player_id: str
    event_id: str
    team_id: str
    team_name: str
    amount: int
    timestamp: str

# Auction State
class AuctionState(BaseModel):
    id: str
    event_id: str
    current_player_id: Optional[str] = None
    current_bid: Optional[int] = None
    current_team_id: Optional[str] = None
    current_team_name: Optional[str] = None
    timer_started_at: Optional[str] = None
    timer_duration: int = 60
    status: AuctionStatus = AuctionStatus.NOT_STARTED
    bid_history: List[Dict[str, Any]] = []
    # Ephemeral broadcast UI (stored in raw_firestore / firestore doc)
    last_result: Optional[Dict[str, Any]] = None
    spin: Optional[Dict[str, Any]] = None
    # Admin countdown control: {running, remaining, duration, updated_at}
    timer: Optional[Dict[str, Any]] = None

# Sponsor Models
class SponsorCreate(BaseModel):
    name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    sponsorship_amount: Optional[int] = None
    tier: Optional[str] = 'bronze'  # platinum, gold, silver, bronze
    is_active: bool = True
    event_id: str

class Sponsor(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    sponsorship_amount: Optional[int] = None
    tier: Optional[str] = 'bronze'
    is_active: bool = True
    event_id: str
    created_at: Optional[str] = None

# Analytics Models
class TeamAnalytics(BaseModel):
    team_id: str
    team_name: str
    total_spent: int
    players_acquired: int
    remaining_budget: int
    category_distribution: Dict[str, int]

class AuctionAnalytics(BaseModel):
    event_id: str
    total_players: int
    sold_players: int
    unsold_players: int
    total_amount_spent: int
    highest_bid: int
    average_price: float
    teams: List[TeamAnalytics]
