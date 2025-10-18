from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
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

# User Models
class UserCreate(BaseModel):
    email: str
    password: str
    role: UserRole = UserRole.TEAM_ADMIN
    display_name: str
    team_id: Optional[str] = None

class UserResponse(BaseModel):
    uid: str
    email: str
    role: UserRole
    display_name: str
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

class EventCreate(BaseModel):
    name: str
    date: str
    rules: EventRules
    description: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None

class Event(BaseModel):
    id: str
    name: str
    date: str
    status: AuctionStatus = AuctionStatus.NOT_STARTED
    rules: EventRules
    description: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    created_at: str
    created_by: str

# Category Models
class CategoryCreate(BaseModel):
    name: str
    event_id: str
    min_players: int
    max_players: int
    color: str
    base_price_min: int
    base_price_max: int

class Category(BaseModel):
    id: str
    name: str
    event_id: str
    min_players: int
    max_players: int
    color: str
    base_price_min: int
    base_price_max: int

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

# Sponsor Models
class SponsorCreate(BaseModel):
    name: str
    event_id: str
    logo_url: str
    display_duration: int = 5
    priority: int = 1

class Sponsor(BaseModel):
    id: str
    name: str
    event_id: str
    logo_url: str
    display_duration: int
    priority: int

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
