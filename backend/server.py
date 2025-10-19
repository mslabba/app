from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging
from pathlib import Path
from datetime import datetime, timezone
import uuid
from typing import List, Optional

from firebase_config import db, firebase_auth
from models import *
from auth_middleware import verify_token, get_current_user, require_super_admin, require_team_admin

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create the main app
app = FastAPI(title="Sports Auction API")

# Create a router with /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============= AUTHENTICATION ROUTES =============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    """Register a new user with email/password"""
    try:
        # Create user in Firebase Auth
        user = firebase_auth.create_user(
            email=user_data.email,
            password=user_data.password,
            display_name=user_data.display_name
        )
        
        # Store additional user data in Firestore
        user_doc = {
            'uid': user.uid,
            'email': user_data.email,
            'role': user_data.role.value,
            'display_name': user_data.display_name,
            'team_id': user_data.team_id,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        if db:
            db.collection('users').document(user.uid).set(user_doc)
        
        # Generate custom token
        custom_token = firebase_auth.create_custom_token(user.uid, {'role': user_data.role.value})
        
        return TokenResponse(
            token=custom_token.decode('utf-8'),
            user=UserResponse(**user_doc)
        )
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/auth/set-role")
async def set_user_role(uid: str, role: UserRole, current_user: dict = Depends(require_super_admin)):
    """Set user role (Super Admin only)"""
    try:
        # Update custom claims
        firebase_auth.set_custom_user_claims(uid, {'role': role.value})
        
        # Update Firestore
        if db:
            db.collection('users').document(uid).update({'role': role.value})
        
        return {"message": "Role updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    try:
        if db:
            user_doc = db.collection('users').document(current_user['uid']).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                print(f"User data from Firestore: {user_data}")  # Debug log
                return UserResponse(**user_data)
        
        # If user doesn't exist in Firestore, create them with default role
        user_data = {
            'uid': current_user['uid'],
            'email': current_user.get('email', ''),
            'role': 'team_admin',  # Default role
            'display_name': current_user.get('name', current_user.get('email', '').split('@')[0]),
            'team_id': None
        }
        
        # Save to Firestore
        if db:
            db.collection('users').document(current_user['uid']).set(user_data)
        
        return UserResponse(**user_data)
    except Exception as e:
        print(f"Error in get_me: {str(e)}")  # Debug log
        raise HTTPException(status_code=400, detail=str(e))

# ============= EVENT ROUTES =============

@api_router.post("/events", response_model=Event)
async def create_event(event_data: EventCreate, current_user: dict = Depends(require_super_admin)):
    """Create a new auction event"""
    try:
        event_id = str(uuid.uuid4())
        event_doc = {
            'id': event_id,
            'name': event_data.name,
            'date': event_data.date,
            'status': AuctionStatus.NOT_STARTED.value,
            'rules': event_data.rules.model_dump(),
            'description': event_data.description,
            'logo_url': event_data.logo_url,
            'banner_url': event_data.banner_url,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'created_by': current_user['uid']
        }
        
        if db:
            db.collection('events').document(event_id).set(event_doc)
        
        return Event(**event_doc)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/events", response_model=List[Event])
async def get_events():
    """Get all events"""
    try:
        if not db:
            return []
        
        events = db.collection('events').order_by('created_at', direction='DESCENDING').stream()
        return [Event(**{**event.to_dict(), 'rules': EventRules(**event.to_dict()['rules'])}) for event in events]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str):
    """Get event by ID"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        event_doc = db.collection('events').document(event_id).get()
        if not event_doc.exists:
            raise HTTPException(status_code=404, detail="Event not found")
        
        event_data = event_doc.to_dict()
        event_data['rules'] = EventRules(**event_data['rules'])
        return Event(**event_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/events/{event_id}")
async def update_event(event_id: str, event_data: EventCreate, current_user: dict = Depends(require_super_admin)):
    """Update event"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        db.collection('events').document(event_id).update({
            'name': event_data.name,
            'date': event_data.date,
            'rules': event_data.rules.model_dump(),
            'description': event_data.description,
            'logo_url': event_data.logo_url,
            'banner_url': event_data.banner_url
        })
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============= CATEGORY ROUTES =============

@api_router.post("/categories", response_model=Category)
async def create_category(category_data: CategoryCreate):
    """Create a new category"""
    try:
        category_id = str(uuid.uuid4())
        category_doc = {
            'id': category_id,
            **category_data.model_dump()
        }
        
        if db:
            db.collection('categories').document(category_id).set(category_doc)
        
        return Category(**category_doc)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/categories/event/{event_id}", response_model=List[Category])
async def get_event_categories(event_id: str):
    """Get categories for an event"""
    try:
        if not db:
            return []
        
        categories = db.collection('categories').where('event_id', '==', event_id).stream()
        return [Category(**cat.to_dict()) for cat in categories]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/events/{event_id}/categories", response_model=List[Category])
async def get_categories_for_event(event_id: str):
    """Get categories for an event (alternative endpoint)"""
    try:
        if not db:
            return []
        
        categories = db.collection('categories').where('event_id', '==', event_id).stream()
        return [Category(**cat.to_dict()) for cat in categories]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, category_data: CategoryCreate, current_user: dict = Depends(require_super_admin)):
    """Update a category"""
    try:
        if not db:
            raise HTTPException(status_code=500, detail="Database not available")
        
        # Check if category exists
        category_doc = db.collection('categories').document(category_id).get()
        if not category_doc.exists:
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Update category data
        updated_data = {
            'name': category_data.name,
            'description': category_data.description,
            'min_players': category_data.min_players,
            'max_players': category_data.max_players,
            'color': category_data.color,
            'base_price_min': category_data.base_price_min,
            'base_price_max': category_data.base_price_max,
            'event_id': category_data.event_id
        }
        
        db.collection('categories').document(category_id).update(updated_data)
        
        # Get updated category
        updated_doc = db.collection('categories').document(category_id).get()
        return Category(**updated_doc.to_dict())
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_user: dict = Depends(require_super_admin)):
    """Delete a category"""
    try:
        if not db:
            raise HTTPException(status_code=500, detail="Database not available")
        
        # Check if category exists
        category_doc = db.collection('categories').document(category_id).get()
        if not category_doc.exists:
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Delete all players in this category first
        players = db.collection('players').where('category_id', '==', category_id).stream()
        for player in players:
            db.collection('players').document(player.id).delete()
        
        # Delete the category
        db.collection('categories').document(category_id).delete()
        
        return {"message": "Category and associated players deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============= TEAM ROUTES =============

@api_router.post("/teams", response_model=Team)
async def create_team(team_data: TeamCreate, current_user: dict = Depends(require_super_admin)):
    """Create a new team"""
    try:
        team_id = str(uuid.uuid4())
        admin_uid = None
        
        # If admin_email is provided, find the user and get their UID
        if team_data.admin_email and db:
            users = db.collection('users').where('email', '==', team_data.admin_email).limit(1).stream()
            user_list = list(users)
            if user_list:
                admin_uid = user_list[0].to_dict().get('uid')
                # Update user's team_id
                db.collection('users').document(admin_uid).update({'team_id': team_id})
            else:
                raise HTTPException(status_code=404, detail=f"User with email {team_data.admin_email} not found")
        
        team_doc = {
            'id': team_id,
            'name': team_data.name,
            'event_id': team_data.event_id,
            'budget': team_data.budget,
            'spent': 0,
            'remaining': team_data.budget,
            'max_squad_size': team_data.max_squad_size,
            'logo_url': team_data.logo_url,
            'color': team_data.color,
            'admin_uid': admin_uid,
            'admin_email': team_data.admin_email,
            'players_count': 0
        }
        
        if db:
            db.collection('teams').document(team_id).set(team_doc)
        
        return Team(**team_doc)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/teams/{team_id}", response_model=Team)
async def update_team(team_id: str, team_data: TeamCreate, current_user: dict = Depends(require_super_admin)):
    """Update a team"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Check if team exists
        team_doc = db.collection('teams').document(team_id).get()
        if not team_doc.exists:
            raise HTTPException(status_code=404, detail="Team not found")
        
        admin_uid = None
        old_team_data = team_doc.to_dict()
        
        # Handle admin assignment changes
        if team_data.admin_email:
            if team_data.admin_email != old_team_data.get('admin_email'):
                # New admin assignment
                users = db.collection('users').where('email', '==', team_data.admin_email).limit(1).stream()
                user_list = list(users)
                if user_list:
                    admin_uid = user_list[0].to_dict().get('uid')
                    # Update new admin's team_id
                    db.collection('users').document(admin_uid).update({'team_id': team_id})
                    
                    # Clear old admin's team_id if exists
                    if old_team_data.get('admin_uid'):
                        db.collection('users').document(old_team_data['admin_uid']).update({'team_id': None})
                else:
                    raise HTTPException(status_code=404, detail=f"User with email {team_data.admin_email} not found")
            else:
                admin_uid = old_team_data.get('admin_uid')
        else:
            # Clear admin assignment
            if old_team_data.get('admin_uid'):
                db.collection('users').document(old_team_data['admin_uid']).update({'team_id': None})
        
        # Update team document
        update_data = {
            'name': team_data.name,
            'budget': team_data.budget,
            'remaining': team_data.budget - old_team_data.get('spent', 0),
            'max_squad_size': team_data.max_squad_size,
            'logo_url': team_data.logo_url,
            'color': team_data.color,
            'admin_uid': admin_uid,
            'admin_email': team_data.admin_email
        }
        
        db.collection('teams').document(team_id).update(update_data)
        
        # Return updated team
        updated_team_doc = db.collection('teams').document(team_id).get()
        return Team(**updated_team_doc.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/teams/event/{event_id}", response_model=List[Team])
async def get_event_teams(event_id: str):
    """Get teams for an event"""
    try:
        if not db:
            return []
        
        teams = db.collection('teams').where('event_id', '==', event_id).stream()
        return [Team(**team.to_dict()) for team in teams]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/users/available-admins", response_model=List[UserResponse])
async def get_available_team_admins(current_user: dict = Depends(require_super_admin)):
    """Get users who can be assigned as team admins"""
    try:
        if not db:
            return []
        
        # Get users with role 'team_admin' who don't have a team assigned
        users = db.collection('users').where('role', '==', 'team_admin').stream()
        available_users = []
        
        for user in users:
            user_data = user.to_dict()
            if not user_data.get('team_id'):  # User not assigned to any team
                available_users.append(UserResponse(**user_data))
        
        return available_users
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/teams/{team_id}", response_model=Team)
async def get_team(team_id: str):
    """Get team by ID"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        team_doc = db.collection('teams').document(team_id).get()
        if not team_doc.exists:
            raise HTTPException(status_code=404, detail="Team not found")
        
        return Team(**team_doc.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============= PLAYER ROUTES =============

@api_router.post("/events/{event_id}/register-player")
async def register_player_public(event_id: str, player_data: PublicPlayerRegistration):
    """Public endpoint for players to register for an event"""
    try:
        if not db:
            raise HTTPException(status_code=500, detail="Database not available")
        
        # Check if event exists
        event_doc = db.collection('events').document(event_id).get()
        if not event_doc.exists:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Create player registration document
        registration_id = str(uuid.uuid4())
        registration_doc = {
            'id': registration_id,
            'event_id': event_id,
            'status': 'pending_approval',
            'registered_at': datetime.now(timezone.utc).isoformat(),
            **player_data.model_dump()
        }
        
        # Store in a separate collection for pending registrations
        db.collection('player_registrations').document(registration_id).set(registration_doc)
        
        return {
            "message": "Registration submitted successfully! The organizer will review and approve your registration.",
            "registration_id": registration_id
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/events/{event_id}/registrations")
async def get_event_registrations(event_id: str, current_user: dict = Depends(require_super_admin)):
    """Get all player registrations for an event (admin only)"""
    try:
        if not db:
            return []
        
        registrations = db.collection('player_registrations').where('event_id', '==', event_id).stream()
        return [reg.to_dict() for reg in registrations]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/registrations/{registration_id}/approve")
async def approve_player_registration(registration_id: str, approval_data: ApprovalRequest, current_user: dict = Depends(require_super_admin)):
    """Approve a player registration and convert to actual player"""
    try:
        if not db:
            raise HTTPException(status_code=500, detail="Database not available")
        
        # Get registration
        reg_doc = db.collection('player_registrations').document(registration_id).get()
        if not reg_doc.exists:
            raise HTTPException(status_code=404, detail="Registration not found")
        
        reg_data = reg_doc.to_dict()
        
        # Create actual player
        player_id = str(uuid.uuid4())
        player_doc = {
            'id': player_id,
            'name': reg_data['name'],
            'category_id': approval_data.category_id,
            'base_price': approval_data.base_price,
            'age': reg_data.get('age'),
            'position': reg_data.get('position'),
            'specialty': reg_data.get('specialty'),
            'previous_team': reg_data.get('previous_team'),
            'cricheroes_link': reg_data.get('cricheroes_link'),
            'stats': reg_data.get('stats'),
            'status': PlayerStatus.AVAILABLE.value,
            'photo_url': reg_data.get('photo_url'),
            'current_price': None,
            'sold_to_team_id': None,
            'sold_price': None
        }
        
        # Add player to players collection
        db.collection('players').document(player_id).set(player_doc)
        
        # Update registration status
        db.collection('player_registrations').document(registration_id).update({
            'status': 'approved',
            'approved_at': datetime.now(timezone.utc).isoformat(),
            'player_id': player_id
        })
        
        return {"message": "Player registration approved successfully", "player_id": player_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/registrations/{registration_id}/reject")
async def reject_player_registration(registration_id: str, current_user: dict = Depends(require_super_admin)):
    """Reject a player registration"""
    try:
        if not db:
            raise HTTPException(status_code=500, detail="Database not available")
        
        # Get registration
        reg_doc = db.collection('player_registrations').document(registration_id).get()
        if not reg_doc.exists:
            raise HTTPException(status_code=404, detail="Registration not found")
        
        # Update registration status
        db.collection('player_registrations').document(registration_id).update({
            'status': 'rejected',
            'rejected_at': datetime.now(timezone.utc).isoformat()
        })
        
        return {"message": "Player registration rejected"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/players", response_model=Player)
async def create_player(player_data: PlayerCreate, current_user: dict = Depends(require_super_admin)):
    """Create a new player"""
    try:
        player_id = str(uuid.uuid4())
        player_doc = {
            'id': player_id,
            'name': player_data.name,
            'category_id': player_data.category_id,
            'base_price': player_data.base_price,
            'current_price': None,
            'photo_url': player_data.photo_url,
            'age': player_data.age,
            'position': player_data.position,
            'specialty': player_data.specialty,
            'stats': player_data.stats.model_dump() if player_data.stats else None,
            'status': PlayerStatus.AVAILABLE.value,
            'sold_to_team_id': None,
            'sold_price': None,
            'previous_team': player_data.previous_team
        }
        
        if db:
            db.collection('players').document(player_id).set(player_doc)
        
        return Player(**player_doc)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/players/category/{category_id}", response_model=List[Player])
async def get_category_players(category_id: str):
    """Get players by category"""
    try:
        if not db:
            return []
        
        players = db.collection('players').where('category_id', '==', category_id).stream()
        result = []
        for player in players:
            player_data = player.to_dict()
            if player_data.get('stats'):
                player_data['stats'] = PlayerStats(**player_data['stats'])
            
            # Normalize status to lowercase for compatibility
            if player_data.get('status'):
                player_data['status'] = player_data['status'].lower()
            
            result.append(Player(**player_data))
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/players/{player_id}", response_model=Player)
async def get_player(player_id: str):
    """Get player by ID"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        player_doc = db.collection('players').document(player_id).get()
        if not player_doc.exists:
            raise HTTPException(status_code=404, detail="Player not found")
        
        player_data = player_doc.to_dict()
        if player_data.get('stats'):
            player_data['stats'] = PlayerStats(**player_data['stats'])
        
        # Normalize status to lowercase for compatibility
        if player_data.get('status'):
            player_data['status'] = player_data['status'].lower()
        
        return Player(**player_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/events/{event_id}/players", response_model=List[Player])
async def get_event_players(event_id: str):
    """Get all players for an event"""
    try:
        if not db:
            return []
        
        # Get all categories for this event
        categories = db.collection('categories').where('event_id', '==', event_id).stream()
        category_ids = [cat.id for cat in categories]
        
        if not category_ids:
            return []
        
        # Get all players for these categories
        result = []
        for category_id in category_ids:
            players = db.collection('players').where('category_id', '==', category_id).stream()
            for player in players:
                player_data = player.to_dict()
                if player_data.get('stats'):
                    player_data['stats'] = PlayerStats(**player_data['stats'])
                
                # Normalize status to lowercase for compatibility
                if player_data.get('status'):
                    player_data['status'] = player_data['status'].lower()
                
                result.append(Player(**player_data))
        
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/players/{player_id}", response_model=Player)
async def update_player(player_id: str, player_data: PlayerCreate, current_user: dict = Depends(require_super_admin)):
    """Update a player"""
    try:
        if not db:
            raise HTTPException(status_code=500, detail="Database not available")
        
        # Check if player exists
        player_doc = db.collection('players').document(player_id).get()
        if not player_doc.exists:
            raise HTTPException(status_code=404, detail="Player not found")
        
        # Update player data
        updated_data = {
            'name': player_data.name,
            'category_id': player_data.category_id,
            'base_price': player_data.base_price,
            'photo_url': player_data.photo_url,
            'age': player_data.age,
            'position': player_data.position,
            'specialty': player_data.specialty,
            'stats': player_data.stats.model_dump() if player_data.stats else None,
            'previous_team': player_data.previous_team
        }
        
        db.collection('players').document(player_id).update(updated_data)
        
        # Get updated player
        updated_doc = db.collection('players').document(player_id).get()
        player_data_updated = updated_doc.to_dict()
        if player_data_updated.get('stats'):
            player_data_updated['stats'] = PlayerStats(**player_data_updated['stats'])
        
        # Normalize status to lowercase for compatibility
        if player_data_updated.get('status'):
            player_data_updated['status'] = player_data_updated['status'].lower()
        
        return Player(**player_data_updated)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.delete("/players/{player_id}")
async def delete_player(player_id: str, current_user: dict = Depends(require_super_admin)):
    """Delete a player"""
    try:
        if not db:
            raise HTTPException(status_code=500, detail="Database not available")
        
        # Check if player exists
        player_doc = db.collection('players').document(player_id).get()
        if not player_doc.exists:
            raise HTTPException(status_code=404, detail="Player not found")
        
        # Delete the player
        db.collection('players').document(player_id).delete()
        
        return {"message": "Player deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============= AUCTION CONTROL ROUTES =============

@api_router.post("/auction/start/{event_id}")
async def start_auction(event_id: str, current_user: dict = Depends(require_super_admin)):
    """Start auction for an event"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Update event status
        db.collection('events').document(event_id).update({
            'status': AuctionStatus.IN_PROGRESS.value
        })
        
        # Create or update auction state
        auction_state_id = f"auction_{event_id}"
        auction_state = {
            'id': auction_state_id,
            'event_id': event_id,
            'current_player_id': None,
            'current_bid': None,
            'current_team_id': None,
            'current_team_name': None,
            'timer_started_at': None,
            'timer_duration': 60,
            'status': AuctionStatus.IN_PROGRESS.value,
            'bid_history': []
        }
        
        db.collection('auction_state').document(auction_state_id).set(auction_state)
        
        return {"message": "Auction started successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/auction/pause/{event_id}")
async def pause_auction(event_id: str, current_user: dict = Depends(require_super_admin)):
    """Pause auction"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        db.collection('events').document(event_id).update({
            'status': AuctionStatus.PAUSED.value
        })
        
        auction_state_id = f"auction_{event_id}"
        db.collection('auction_state').document(auction_state_id).update({
            'status': AuctionStatus.PAUSED.value
        })
        
        return {"message": "Auction paused"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/auction/next-player/{event_id}")
async def next_player(event_id: str, player_id: str, current_user: dict = Depends(require_super_admin)):
    """Set next player for bidding"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Get player details
        player_doc = db.collection('players').document(player_id).get()
        if not player_doc.exists:
            raise HTTPException(status_code=404, detail="Player not found")
        
        player_data = player_doc.to_dict()
        
        # Update auction state
        auction_state_id = f"auction_{event_id}"
        db.collection('auction_state').document(auction_state_id).update({
            'current_player_id': player_id,
            'current_bid': player_data['base_price'],
            'current_team_id': None,
            'current_team_name': None,
            'timer_started_at': datetime.now(timezone.utc).isoformat(),
            'bid_history': []
        })
        
        # Update player status
        db.collection('players').document(player_id).update({
            'status': PlayerStatus.CURRENT.value
        })
        
        return {"message": "Next player set", "player_id": player_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/auction/state/{event_id}", response_model=AuctionState)
async def get_auction_state(event_id: str):
    """Get current auction state"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        auction_state_id = f"auction_{event_id}"
        state_doc = db.collection('auction_state').document(auction_state_id).get()
        
        if not state_doc.exists:
            # Return default state
            return AuctionState(
                id=auction_state_id,
                event_id=event_id,
                status=AuctionStatus.NOT_STARTED
            )
        
        return AuctionState(**state_doc.to_dict())
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============= BIDDING ROUTES =============

@api_router.post("/bids/place")
async def place_bid(bid_data: BidCreate, current_user: dict = Depends(require_team_admin)):
    """Place a bid on a player"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Get current user's team
        user_doc = db.collection('users').document(current_user['uid']).get()
        if not user_doc.exists or not user_doc.to_dict().get('team_id'):
            raise HTTPException(status_code=400, detail="User not associated with a team")
        
        team_id = user_doc.to_dict()['team_id']
        
        # Get team details
        team_doc = db.collection('teams').document(team_id).get()
        if not team_doc.exists:
            raise HTTPException(status_code=404, detail="Team not found")
        
        team_data = team_doc.to_dict()
        
        # Check if team has enough budget
        if team_data['remaining'] < bid_data.amount:
            raise HTTPException(status_code=400, detail="Insufficient budget")
        
        # Get current auction state
        auction_state_id = f"auction_{bid_data.event_id}"
        state_doc = db.collection('auction_state').document(auction_state_id).get()
        
        if not state_doc.exists:
            raise HTTPException(status_code=400, detail="Auction not started")
        
        current_state = state_doc.to_dict()
        
        # Validate bid amount
        if bid_data.amount <= current_state.get('current_bid', 0):
            raise HTTPException(status_code=400, detail="Bid amount must be higher than current bid")
        
        # Create bid record
        bid_id = str(uuid.uuid4())
        bid_doc = {
            'id': bid_id,
            'player_id': bid_data.player_id,
            'event_id': bid_data.event_id,
            'team_id': team_id,
            'team_name': team_data['name'],
            'amount': bid_data.amount,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        db.collection('bids').document(bid_id).set(bid_doc)
        
        # Update auction state
        bid_history = current_state.get('bid_history', [])
        bid_history.append(bid_doc)
        
        db.collection('auction_state').document(auction_state_id).update({
            'current_bid': bid_data.amount,
            'current_team_id': team_id,
            'current_team_name': team_data['name'],
            'timer_started_at': datetime.now(timezone.utc).isoformat(),
            'bid_history': bid_history[-10:]  # Keep last 10 bids
        })
        
        return Bid(**bid_doc)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bid placement error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/bids/finalize/{player_id}")
async def finalize_bid(player_id: str, event_id: str, current_user: dict = Depends(require_super_admin)):
    """Finalize bid and mark player as sold"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Get auction state
        auction_state_id = f"auction_{event_id}"
        state_doc = db.collection('auction_state').document(auction_state_id).get()
        
        if not state_doc.exists:
            raise HTTPException(status_code=400, detail="Auction state not found")
        
        state_data = state_doc.to_dict()
        
        if not state_data.get('current_team_id'):
            # Mark as unsold
            db.collection('players').document(player_id).update({
                'status': PlayerStatus.UNSOLD.value
            })
            return {"message": "Player marked as unsold"}
        
        # Update player
        db.collection('players').document(player_id).update({
            'status': PlayerStatus.SOLD.value,
            'sold_to_team_id': state_data['current_team_id'],
            'sold_price': state_data['current_bid']
        })
        
        # Update team
        team_doc = db.collection('teams').document(state_data['current_team_id']).get()
        if team_doc.exists:
            team_data = team_doc.to_dict()
            new_spent = team_data['spent'] + state_data['current_bid']
            new_remaining = team_data['budget'] - new_spent
            new_players_count = team_data['players_count'] + 1
            
            db.collection('teams').document(state_data['current_team_id']).update({
                'spent': new_spent,
                'remaining': new_remaining,
                'players_count': new_players_count
            })
        
        # Clear current player from auction state
        db.collection('auction_state').document(auction_state_id).update({
            'current_player_id': None,
            'current_bid': None,
            'current_team_id': None,
            'current_team_name': None,
            'bid_history': []
        })
        
        return {"message": "Bid finalized successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============= SPONSOR ROUTES =============

@api_router.post("/sponsors", response_model=Sponsor)
async def create_sponsor(sponsor_data: SponsorCreate, current_user: dict = Depends(require_super_admin)):
    """Create a sponsor"""
    try:
        sponsor_id = str(uuid.uuid4())
        sponsor_doc = {
            'id': sponsor_id,
            **sponsor_data.model_dump()
        }
        
        if db:
            db.collection('sponsors').document(sponsor_id).set(sponsor_doc)
        
        return Sponsor(**sponsor_doc)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/sponsors/event/{event_id}", response_model=List[Sponsor])
async def get_event_sponsors(event_id: str):
    """Get sponsors for an event"""
    try:
        if not db:
            return []
        
        sponsors = db.collection('sponsors').where('event_id', '==', event_id).order_by('priority').stream()
        return [Sponsor(**sponsor.to_dict()) for sponsor in sponsors]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============= ANALYTICS ROUTES =============

@api_router.get("/analytics/event/{event_id}", response_model=AuctionAnalytics)
async def get_event_analytics(event_id: str):
    """Get analytics for an event"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Get all teams for the event
        teams = db.collection('teams').where('event_id', '==', event_id).stream()
        team_analytics = []
        
        for team in teams:
            team_data = team.to_dict()
            
            # Get players for this team
            players = db.collection('players').where('sold_to_team_id', '==', team_data['id']).stream()
            category_dist = {}
            
            for player in players:
                player_data = player.to_dict()
                cat_id = player_data['category_id']
                category_dist[cat_id] = category_dist.get(cat_id, 0) + 1
            
            team_analytics.append(TeamAnalytics(
                team_id=team_data['id'],
                team_name=team_data['name'],
                total_spent=team_data['spent'],
                players_acquired=team_data['players_count'],
                remaining_budget=team_data['remaining'],
                category_distribution=category_dist
            ))
        
        # Get player statistics
        all_players = db.collection('players').stream()
        total_players = 0
        sold_players = 0
        unsold_players = 0
        total_amount = 0
        highest_bid = 0
        
        for player in all_players:
            total_players += 1
            player_data = player.to_dict()
            
            if player_data['status'] == PlayerStatus.SOLD.value:
                sold_players += 1
                sold_price = player_data.get('sold_price', 0)
                total_amount += sold_price
                highest_bid = max(highest_bid, sold_price)
            elif player_data['status'] == PlayerStatus.UNSOLD.value:
                unsold_players += 1
        
        avg_price = total_amount / sold_players if sold_players > 0 else 0
        
        return AuctionAnalytics(
            event_id=event_id,
            total_players=total_players,
            sold_players=sold_players,
            unsold_players=unsold_players,
            total_amount_spent=total_amount,
            highest_bid=highest_bid,
            average_price=avg_price,
            teams=team_analytics
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============= ROOT ROUTE =============

@api_router.get("/")
async def root():
    return {"message": "Sports Auction API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {
        "status": "healthy",
        "firebase": "connected" if db else "disconnected"
    }

# Include router in main app
app.include_router(api_router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
