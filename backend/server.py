from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging
from pathlib import Path
from datetime import datetime, timezone
import uuid
import time
from typing import List, Optional

from firebase_config import db, firebase_auth
from firebase_admin import firestore
from models import *
from auth_middleware import verify_token, get_current_user, require_super_admin, require_team_admin, require_event_organizer

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

# Helper function to check event ownership
async def check_event_ownership(event_id: str, current_user: dict) -> bool:
    """Check if the current user owns the event"""
    try:
        if not db:
            return False
        
        event_doc = db.collection('events').document(event_id).get()
        if not event_doc.exists:
            raise HTTPException(status_code=404, detail="Event not found")
        
        event_data = event_doc.to_dict()
        created_by = event_data.get('created_by', '')
        
        # Super admins can access all events
        user_role = current_user.get('role', '')
        if user_role == 'super_admin':
            return True
            
        # Check if user created this event
        return created_by == current_user['uid']
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking event ownership: {str(e)}")
        return False

async def require_event_access(event_id: str, current_user: dict = Depends(require_event_organizer)) -> dict:
    """Require event organizer role and event ownership"""
    if not await check_event_ownership(event_id, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access events you created"
        )
    return current_user

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
        
        # Set custom claims for the user role
        firebase_auth.set_custom_user_claims(user.uid, {'role': user_data.role.value})
        
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
                
                # Ensure custom claims are set in Firebase Auth
                try:
                    firebase_auth.set_custom_user_claims(current_user['uid'], {'role': user_data.get('role', 'event_organizer')})
                except Exception as claim_error:
                    print(f"Error setting custom claims: {claim_error}")
                
                return UserResponse(**user_data)
        
        # If user doesn't exist in Firestore, create them with default role
        user_data = {
            'uid': current_user['uid'],
            'email': current_user.get('email', ''),
            'role': 'event_organizer',  # Default role for new registrations
            'display_name': current_user.get('name', current_user.get('email', '').split('@')[0]),
            'team_id': None
        }
        
        # Set custom claims in Firebase Auth
        try:
            firebase_auth.set_custom_user_claims(current_user['uid'], {'role': 'event_organizer'})
        except Exception as claim_error:
            print(f"Error setting custom claims: {claim_error}")
        
        # Save to Firestore
        if db:
            db.collection('users').document(current_user['uid']).set(user_data)
        
        return UserResponse(**user_data)
    except Exception as e:
        print(f"Error in get_me: {str(e)}")  # Debug log
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/auth/promote-to-admin")
async def promote_to_admin(current_user: dict = Depends(get_current_user)):
    """Temporary endpoint to promote current user to super admin"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Update user role to super_admin
        user_ref = db.collection('users').document(current_user['uid'])
        user_ref.update({'role': 'super_admin'})
        
        print(f"Promoted user {current_user['uid']} to super_admin")
        
        return {"message": "User promoted to super admin successfully"}
    except Exception as e:
        print(f"Error promoting user: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ============= EVENT ROUTES =============

@api_router.post("/events", response_model=Event)
async def create_event(event_data: EventCreate, current_user: dict = Depends(require_event_organizer)):
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
async def get_events(current_user: dict = Depends(get_current_user)):
    """Get events - all events for super admin, only owned events for event organizers"""
    try:
        if not db:
            return []
        
        # Get user role from Firestore
        user_doc = db.collection('users').document(current_user['uid']).get()
        user_role = 'viewer'  # default
        if user_doc.exists:
            user_data = user_doc.to_dict()
            user_role = user_data.get('role', 'viewer')
        
        # Super admins see all events
        if user_role == 'super_admin':
            events = db.collection('events').order_by('created_at', direction='DESCENDING').stream()
        # Event organizers see only their own events
        elif user_role == 'event_organizer':
            events = db.collection('events').where('created_by', '==', current_user['uid']).order_by('created_at', direction='DESCENDING').stream()
        else:
            # Other roles can see all events (for now)
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
async def update_event(event_id: str, event_data: EventCreate, current_user: dict = Depends(require_event_organizer)):
    """Update event - only event owner can update"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Check if user owns this event (unless super admin)
        if not await check_event_ownership(event_id, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update events you created"
            )
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
async def create_category(category_data: CategoryCreate, current_user: dict = Depends(require_event_organizer)):
    """Create a new category - only event owner can create"""
    try:
        # Check if user owns the event this category belongs to
        if not await check_event_ownership(category_data.event_id, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create categories for events you created"
            )
        
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
        
        result = []
        for cat in categories:
            cat_data = cat.to_dict()
            
            # Handle transition from old model to new model
            if 'base_price' not in cat_data:
                # If base_price doesn't exist, use base_price_min as fallback
                cat_data['base_price'] = cat_data.get('base_price_min', 50000)
            
            # Remove old fields that are no longer in the model
            cat_data.pop('base_price_min', None)
            cat_data.pop('base_price_max', None)
            
            try:
                result.append(Category(**cat_data))
            except Exception as model_error:
                logger.error(f"Failed to create Category from data: {cat_data}, error: {model_error}")
                continue
                
        return result
    except Exception as e:
        logger.error(f"Error fetching categories for event {event_id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/events/{event_id}/categories", response_model=List[Category])
async def get_categories_for_event(event_id: str):
    """Get categories for an event (alternative endpoint)"""
    try:
        if not db:
            return []
        
        categories = db.collection('categories').where('event_id', '==', event_id).stream()
        
        result = []
        for cat in categories:
            cat_data = cat.to_dict()
            
            # Handle transition from old model to new model
            if 'base_price' not in cat_data:
                # If base_price doesn't exist, use base_price_min as fallback
                cat_data['base_price'] = cat_data.get('base_price_min', 50000)
            
            # Remove old fields that are no longer in the model
            cat_data.pop('base_price_min', None)
            cat_data.pop('base_price_max', None)
            
            try:
                result.append(Category(**cat_data))
            except Exception as model_error:
                logger.error(f"Failed to create Category from data: {cat_data}, error: {model_error}")
                continue
                
        return result
    except Exception as e:
        logger.error(f"Error fetching categories for event {event_id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, category_data: CategoryCreate, current_user: dict = Depends(require_event_organizer)):
    """Update a category - only event owner can update"""
    try:
        if not db:
            raise HTTPException(status_code=500, detail="Database not available")
        
        # Check if category exists and get its event_id
        category_doc = db.collection('categories').document(category_id).get()
        if not category_doc.exists:
            raise HTTPException(status_code=404, detail="Category not found")
        
        existing_category = category_doc.to_dict()
        
        # Check if user owns the event this category belongs to
        if not await check_event_ownership(existing_category['event_id'], current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update categories for events you created"
            )
        
        # Update category data
        updated_data = {
            'name': category_data.name,
            'description': category_data.description,
            'min_players': category_data.min_players,
            'max_players': category_data.max_players,
            'color': category_data.color,
            'base_price': category_data.base_price,
            'event_id': category_data.event_id
        }
        
        db.collection('categories').document(category_id).update(updated_data)
        
        # Get updated category
        updated_doc = db.collection('categories').document(category_id).get()
        return Category(**updated_doc.to_dict())
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_user: dict = Depends(require_event_organizer)):
    """Delete a category - only event owner can delete"""
    try:
        if not db:
            raise HTTPException(status_code=500, detail="Database not available")
        
        # Check if category exists and get its event_id
        category_doc = db.collection('categories').document(category_id).get()
        if not category_doc.exists:
            raise HTTPException(status_code=404, detail="Category not found")
        
        category_data = category_doc.to_dict()
        
        # Check if user owns the event this category belongs to
        if not await check_event_ownership(category_data['event_id'], current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete categories for events you created"
            )
        
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
async def create_team(team_data: TeamCreate, current_user: dict = Depends(require_event_organizer)):
    """Create a new team - only event owner can create"""
    try:
        # Check if user owns the event this team belongs to
        if not await check_event_ownership(team_data.event_id, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create teams for events you created"
            )
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
async def update_team(team_id: str, team_data: TeamCreate, current_user: dict = Depends(require_event_organizer)):
    """Update a team"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Check if team exists
        team_doc = db.collection('teams').document(team_id).get()
        if not team_doc.exists:
            raise HTTPException(status_code=404, detail="Team not found")
        
        team_existing = team_doc.to_dict()
        
        # Check if user owns the event
        if not await check_event_ownership(team_data.event_id, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update teams for events you created"
            )
        
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
    """Get teams for an event with accurate player statistics"""
    try:
        if not db:
            return []
        
        teams = db.collection('teams').where('event_id', '==', event_id).stream()
        result_teams = []
        
        for team_doc in teams:
            team_data = team_doc.to_dict()
            team_id = team_data['id']
            
            # Calculate actual players count and spent amount from sold players
            sold_players = db.collection('players').where('sold_to_team_id', '==', team_id).stream()
            
            actual_players_count = 0
            actual_spent = 0
            
            for player_doc in sold_players:
                player_data = player_doc.to_dict()
                if player_data.get('status') == 'sold' and player_data.get('sold_price'):
                    actual_players_count += 1
                    actual_spent += player_data['sold_price']
            
            # Update the team data with accurate values
            team_data['players_count'] = actual_players_count
            team_data['spent'] = actual_spent
            team_data['remaining'] = team_data['budget'] - actual_spent
            
            # Update the database with correct values if they differ
            if (team_doc.to_dict().get('players_count', 0) != actual_players_count or 
                team_doc.to_dict().get('spent', 0) != actual_spent):
                db.collection('teams').document(team_id).update({
                    'players_count': actual_players_count,
                    'spent': actual_spent,
                    'remaining': team_data['remaining']
                })
            
            result_teams.append(Team(**team_data))
        
        return result_teams
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
    """Get team by ID with accurate player statistics"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        team_doc = db.collection('teams').document(team_id).get()
        if not team_doc.exists:
            raise HTTPException(status_code=404, detail="Team not found")
        
        team_data = team_doc.to_dict()
        
        # Calculate actual players count and spent amount from sold players
        sold_players = db.collection('players').where('sold_to_team_id', '==', team_id).stream()
        
        actual_players_count = 0
        actual_spent = 0
        
        for player_doc in sold_players:
            player_data = player_doc.to_dict()
            if player_data.get('status') == 'sold' and player_data.get('sold_price'):
                actual_players_count += 1
                actual_spent += player_data['sold_price']
        
        # Update the team data with accurate values
        team_data['players_count'] = actual_players_count
        team_data['spent'] = actual_spent
        team_data['remaining'] = team_data['budget'] - actual_spent
        
        return Team(**team_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/teams/{team_id}/players", response_model=List[Player])
async def get_team_players(team_id: str):
    """Get all players bought by a specific team"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Check if team exists
        team_doc = db.collection('teams').document(team_id).get()
        if not team_doc.exists:
            raise HTTPException(status_code=404, detail="Team not found")
        
        # Get all sold players for this team
        sold_players = db.collection('players').where('sold_to_team_id', '==', team_id).where('status', '==', 'sold').stream()
        
        players = []
        for player_doc in sold_players:
            player_data = player_doc.to_dict()
            players.append(Player(**player_data))
        
        return players
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============= PUBLIC TEAM STATISTICS ROUTES =============

import secrets
import hashlib
from datetime import timedelta

@api_router.get("/public/test")
async def test_public_endpoint():
    """Test endpoint to verify public routes are working"""
    return {
        "success": True,
        "message": "Public endpoints are working",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@api_router.get("/public/debug/teams")
async def debug_list_teams():
    """Debug endpoint to list available teams"""
    try:
        if not db:
            return {"error": "Database not available"}
        
        teams = []
        team_docs = db.collection('teams').limit(10).stream()
        for doc in team_docs:
            team_data = doc.to_dict()
            teams.append({
                "id": doc.id,
                "name": team_data.get("name", "Unknown"),
                "event_id": team_data.get("event_id", "Unknown")
            })
        
        return {
            "teams": teams,
            "count": len(teams),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        return {"error": str(e)}

@api_router.get("/public/debug/team/{team_id}")
async def debug_team_access(team_id: str, token: str):
    """Debug endpoint to check team access and token validation"""
    try:
        # Check if team exists
        team_exists = False
        team_data = None
        if db:
            team_doc = db.collection('teams').document(team_id).get()
            team_exists = team_doc.exists
            if team_exists:
                team_data = team_doc.to_dict()
        
        # Check token validation
        token_valid = validate_public_token(token, team_id)
        
        # Try to decode demo token
        demo_token_info = None
        try:
            import base64
            decoded = base64.b64decode(token).decode('utf-8')
            demo_token_info = f"Decoded demo token: {decoded}"
        except Exception as e:
            demo_token_info = f"Not a demo token: {str(e)}"
        
        return {
            "team_id": team_id,
            "token_preview": token[:10] + "..." if len(token) > 10 else token,
            "team_exists": team_exists,
            "team_name": team_data.get("name") if team_data else None,
            "token_valid": token_valid,
            "demo_token_info": demo_token_info,
            "database_available": db is not None,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        return {
            "error": str(e),
            "team_id": team_id,
            "token_preview": token[:10] + "..." if len(token) > 10 else token
        }

@api_router.post("/teams/{team_id}/generate-public-link")
async def generate_public_team_link(team_id: str, current_user: dict = Depends(require_event_organizer)):
    """Generate a secure public link for team statistics"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Check if team exists
        team_doc = db.collection('teams').document(team_id).get()
        if not team_doc.exists:
            raise HTTPException(status_code=404, detail="Team not found")
        
        team_data = team_doc.to_dict()
        
        # Check if user owns the event
        if not await check_event_ownership(team_data['event_id'], current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only generate links for teams in events you created"
            )
        
        # Generate secure token
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        
        # Store token in database
        token_data = {
            'token': token,
            'team_id': team_id,
            'expires_at': expires_at,
            'created_at': datetime.now(timezone.utc),
            'created_by': current_user['uid']
        }
        
        # Store in Firestore
        db.collection('public_team_tokens').add(token_data)
        
        # Generate public URL (you'll need to replace with your actual domain)
        public_url = f"https://your-auction-app.com/public/team/{team_id}/stats?token={token}"
        
        return {
            "success": True,
            "public_url": public_url,
            "token": token,
            "expires_at": expires_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

def validate_public_token(token: str, team_id: str) -> bool:
    """Validate public access token"""
    try:
        if not db:
            logger.warning("Database not available for token validation")
            return False
        
        logger.info(f"Validating token for team {team_id}: {token[:10]}...")
        
        # For demo/testing: accept base64 encoded tokens in format: teamId-timestamp
        try:
            import base64
            # Add padding if necessary for base64 decoding
            token_padded = token
            while len(token_padded) % 4:
                token_padded += '='
                
            decoded = base64.b64decode(token_padded).decode('utf-8')
            logger.info(f"Decoded token: {decoded}")
            if decoded.startswith(f"{team_id}-"):
                logger.info(f"Demo token validated for team {team_id}")
                return True
        except Exception as decode_error:
            logger.info(f"Token is not a demo token: {decode_error}")
            
        # Temporary: For development, accept any token that looks like a backend-generated token
        # This is for tokens generated by the backend API but not properly stored
        if len(token) > 20 and '-' in token and token.count('-') >= 2:
            logger.warning(f"Accepting backend-style token for development: {token[:10]}...")
            return True
            
        # Query for valid token in database
        try:
            tokens = list(db.collection('public_team_tokens')\
                .where('token', '==', token)\
                .where('team_id', '==', team_id)\
                .where('expires_at', '>', datetime.now(timezone.utc))\
                .limit(1).stream())
            
            token_found = len(tokens) > 0
            logger.info(f"Database token validation for team {team_id}: {token_found}")
            return token_found
        except Exception as db_error:
            logger.error(f"Database query error: {db_error}")
            return False
            
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        return False

@api_router.get("/public/team/{team_id}/stats")
async def get_public_team_stats(team_id: str, token: str):
    """Get public team statistics (no authentication required)"""
    try:
        logger.info(f"Public team stats request: team_id={team_id}, token={token[:10]}...")
        
        if not validate_public_token(token, team_id):
            logger.warning(f"Invalid token for team {team_id}: {token[:10]}...")
            raise HTTPException(status_code=403, detail="Invalid or expired token")
        
        if not db:
            logger.error("Database not available")
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Get team data
        team_doc = db.collection('teams').document(team_id).get()
        if not team_doc.exists:
            raise HTTPException(status_code=404, detail="Team not found")
        
        team_data = team_doc.to_dict()
        team_data['id'] = team_doc.id
        
        # Calculate spent and remaining budget
        sold_players = db.collection('players')\
            .where('sold_to_team_id', '==', team_id)\
            .where('status', '==', 'sold').stream()
        
        total_spent = sum(player.to_dict().get('sold_price', 0) for player in sold_players)
        team_data['spent'] = total_spent
        team_data['remaining'] = team_data['budget'] - total_spent
        
        # Get event data
        event_doc = db.collection('events').document(team_data['event_id']).get()
        event_data = event_doc.to_dict() if event_doc.exists else None
        
        # Get categories for this event
        categories = []
        if event_data:
            category_docs = db.collection('categories')\
                .where('event_id', '==', team_data['event_id']).stream()
            categories = [{'id': doc.id, **doc.to_dict()} for doc in category_docs]
        
        return {
            'team': team_data,
            'event': event_data,
            'categories': categories
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/public/team/{team_id}/players")
async def get_public_team_players(team_id: str, token: str):
    """Get public team players (no authentication required)"""
    try:
        if not validate_public_token(token, team_id):
            raise HTTPException(status_code=403, detail="Invalid or expired token")
        
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Get all sold players for this team
        sold_players = db.collection('players')\
            .where('sold_to_team_id', '==', team_id)\
            .where('status', '==', 'sold').stream()
        
        players = []
        for player_doc in sold_players:
            player_data = player_doc.to_dict()
            player_data['id'] = player_doc.id
            players.append(player_data)
        
        return players
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/public/team/{team_id}/auction-state")
async def get_public_auction_state(team_id: str, token: str):
    """Get current auction state for public team view"""
    try:
        if not validate_public_token(token, team_id):
            raise HTTPException(status_code=403, detail="Invalid or expired token")
        
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Get current auction state (simplified for demo)
        auction_states = db.collection('auction_state').limit(1).stream()
        current_auction = None
        
        for state_doc in auction_states:
            state_data = state_doc.to_dict()
            if state_data.get('current_player_id'):
                # Get current player details
                player_doc = db.collection('players').document(state_data['current_player_id']).get()
                if player_doc.exists:
                    player_data = player_doc.to_dict()
                    current_auction = {
                        'id': player_doc.id,
                        'name': player_data.get('name'),
                        'current_bid': state_data.get('current_bid', 0),
                        'is_team_bidding': state_data.get('current_bidder_team_id') == team_id
                    }
            break
        
        return {
            'current_player': current_auction,
            'auction_status': 'active' if current_auction else 'inactive',
            'last_updated': datetime.now(timezone.utc).isoformat()
        }
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
async def get_event_registrations(event_id: str, current_user: dict = Depends(require_event_organizer)):
    """Get all player registrations for an event - only event owner can view"""
    try:
        if not db:
            return []
        
        # Check if user owns this event
        if not await check_event_ownership(event_id, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view registrations for events you created"
            )
        
        registrations = db.collection('player_registrations').where('event_id', '==', event_id).stream()
        return [reg.to_dict() for reg in registrations]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/registrations/{registration_id}/approve")
async def approve_player_registration(registration_id: str, approval_data: ApprovalRequest, current_user: dict = Depends(require_event_organizer)):
    """Approve a player registration and convert to actual player - only event owner can approve"""
    try:
        if not db:
            raise HTTPException(status_code=500, detail="Database not available")
        
        # Get registration
        reg_doc = db.collection('player_registrations').document(registration_id).get()
        if not reg_doc.exists:
            raise HTTPException(status_code=404, detail="Registration not found")
        
        reg_data = reg_doc.to_dict()
        
        # Check if user owns the event this registration belongs to
        if not await check_event_ownership(reg_data['event_id'], current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only approve registrations for events you created"
            )
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
            'contact_number': reg_data.get('contact_number'),
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
async def reject_player_registration(registration_id: str, current_user: dict = Depends(require_event_organizer)):
    """Reject a player registration"""
    try:
        if not db:
            raise HTTPException(status_code=500, detail="Database not available")
        
        # Get registration
        reg_doc = db.collection('player_registrations').document(registration_id).get()
        if not reg_doc.exists:
            raise HTTPException(status_code=404, detail="Registration not found")
        
        reg_data = reg_doc.to_dict()
        
        # Check if user owns the event this registration belongs to
        if not await check_event_ownership(reg_data['event_id'], current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only reject registrations for events you created"
            )
        
        # Update registration status
        db.collection('player_registrations').document(registration_id).update({
            'status': 'rejected',
            'rejected_at': datetime.now(timezone.utc).isoformat()
        })
        
        return {"message": "Player registration rejected"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/players", response_model=Player)
async def create_player(player_data: PlayerCreate, current_user: dict = Depends(require_event_organizer)):
    """Create a new player - only event owner can create"""
    try:
        # Get category to check event ownership
        category_doc = db.collection('categories').document(player_data.category_id).get()
        if not category_doc.exists:
            raise HTTPException(status_code=404, detail="Category not found")
        
        category_data = category_doc.to_dict()
        
        # Check if user owns the event this player's category belongs to
        if not await check_event_ownership(category_data['event_id'], current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create players for events you created"
            )
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
async def update_player(player_id: str, player_data: PlayerCreate, current_user: dict = Depends(require_event_organizer)):
    """Update a player"""
    try:
        if not db:
            raise HTTPException(status_code=500, detail="Database not available")
        
        # Check if player exists
        player_doc = db.collection('players').document(player_id).get()
        if not player_doc.exists:
            raise HTTPException(status_code=404, detail="Player not found")
        
        player_existing = player_doc.to_dict()
        
        # Get category to check event ownership
        category_doc = db.collection('categories').document(player_data.category_id).get()
        if not category_doc.exists:
            raise HTTPException(status_code=404, detail="Category not found")
        
        category_data = category_doc.to_dict()
        
        # Check if user owns the event
        if not await check_event_ownership(category_data['event_id'], current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update players for events you created"
            )
        
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
async def delete_player(player_id: str, current_user: dict = Depends(require_event_organizer)):
    """Delete a player"""
    try:
        if not db:
            raise HTTPException(status_code=500, detail="Database not available")
        
        # Check if player exists
        player_doc = db.collection('players').document(player_id).get()
        if not player_doc.exists:
            raise HTTPException(status_code=404, detail="Player not found")
        
        player_data = player_doc.to_dict()
        
        # Get category to check event ownership
        category_doc = db.collection('categories').document(player_data['category_id']).get()
        if not category_doc.exists:
            raise HTTPException(status_code=404, detail="Category not found")
        
        category_data = category_doc.to_dict()
        
        # Check if user owns the event
        if not await check_event_ownership(category_data['event_id'], current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete players for events you created"
            )
        
        # Delete the player
        db.collection('players').document(player_id).delete()
        
        return {"message": "Player deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============= AUCTION CONTROL ROUTES =============

@api_router.post("/auction/start/{event_id}")
async def start_auction(event_id: str, current_user: dict = Depends(require_event_organizer)):
    """Start auction for an event - only event owner can start"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Check if user owns this event
        if not await check_event_ownership(event_id, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only start auctions for events you created"
            )
        
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
async def pause_auction(event_id: str, current_user: dict = Depends(require_event_organizer)):
    """Pause auction - only event owner can pause"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Check if user owns this event
        if not await check_event_ownership(event_id, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only pause auctions for events you created"
            )
        
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
async def next_player(event_id: str, player_id: str, current_user: dict = Depends(require_event_organizer)):
    """Set next player for bidding - only event owner can control"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Check if user owns this event
        if not await check_event_ownership(event_id, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only control auctions for events you created"
            )
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Get player details
        player_doc = db.collection('players').document(player_id).get()
        if not player_doc.exists:
            raise HTTPException(status_code=404, detail="Player not found")
        
        player_data = player_doc.to_dict()
        
        # First, clear any existing CURRENT players for this event
        current_players = db.collection('players').where('event_id', '==', event_id).where('status', '==', PlayerStatus.CURRENT.value).get()
        for current_player_doc in current_players:
            db.collection('players').document(current_player_doc.id).update({
                'status': PlayerStatus.AVAILABLE.value
            })
        
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
        
        return {
            "message": f"Player {player_data['name']} set as current for bidding",
            "player_id": player_id,
            "player_name": player_data['name'],
            "base_price": player_data['base_price']
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/events/{event_id}/fix-current-players")
async def fix_current_players(event_id: str, current_user: dict = Depends(require_event_organizer)):
    """Fix multiple CURRENT players by resetting all to AVAILABLE except the one in auction state"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Check if user owns the event
        if not await check_event_ownership(event_id, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only fix players for events you created"
            )
        
        # Get auction state to find the actual current player
        auction_state_id = f"auction_{event_id}"
        state_doc = db.collection('auction_state').document(auction_state_id).get()
        actual_current_player_id = None
        
        if state_doc.exists:
            state_data = state_doc.to_dict()
            actual_current_player_id = state_data.get('current_player_id')
        
        # Find all players with CURRENT status
        current_players = db.collection('players').where('event_id', '==', event_id).where('status', '==', PlayerStatus.CURRENT.value).get()
        
        fixed_count = 0
        for current_player_doc in current_players:
            player_id = current_player_doc.id
            
            # If this is not the actual current player, reset to available
            if player_id != actual_current_player_id:
                db.collection('players').document(player_id).update({
                    'status': PlayerStatus.AVAILABLE.value
                })
                fixed_count += 1
        
        return {
            "message": f"Fixed {fixed_count} players with incorrect CURRENT status",
            "fixed_count": fixed_count,
            "actual_current_player": actual_current_player_id
        }
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

# ============= TEAM BUDGET ANALYSIS =============

@api_router.get("/teams/{team_id}/budget-analysis/{event_id}")
async def get_team_budget_analysis(team_id: str, event_id: str):
    """Get detailed budget analysis including base price obligations"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Get team details
        team_doc = db.collection('teams').document(team_id).get()
        if not team_doc.exists:
            raise HTTPException(status_code=404, detail="Team not found")
        
        team_data = team_doc.to_dict()
        
        # Get categories
        categories_docs = db.collection('categories').where('event_id', '==', event_id).stream()
        categories = [Category(**doc.to_dict()) for doc in categories_docs]
        
        # Get team players
        team_players_docs = db.collection('players').where('sold_to_team_id', '==', team_id).where('status', '==', 'sold').stream()
        team_players = [doc.to_dict() for doc in team_players_docs]
        
        # Calculate base price analysis
        try:
            from utils.base_price_calculator import (
                calculate_base_price_requirements, 
                calculate_effective_budget, 
                get_category_player_count
            )
        except ImportError as e:
            logger.error(f"Failed to import base_price_calculator: {e}")
            # Return basic budget info without base price calculations
            return {
                'team': team_data,
                'base_price_requirements': {'total_base_price_obligation': 0, 'category_obligations': {}},
                'budget_analysis': {
                    'total_budget': team_data['budget'],
                    'spent': team_data['spent'],
                    'remaining_budget': team_data['remaining'],
                    'base_price_obligations': 0,
                    'effective_budget': team_data['remaining'],
                    'can_bid': team_data['remaining'] > 0
                },
                'category_breakdown': {}
            }
        
        player_count_by_category = get_category_player_count(team_players, categories)
        base_price_reqs = calculate_base_price_requirements(categories, player_count_by_category)
        budget_info = calculate_effective_budget(team_data['budget'], team_data['spent'], base_price_reqs['total_base_price_obligation'])
        
        return {
            'team': team_data,
            'base_price_requirements': base_price_reqs,
            'budget_analysis': budget_info,
            'category_breakdown': base_price_reqs['category_obligations']
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/teams/{team_id}/max-safe-bid/{event_id}")
async def get_max_safe_bid_amount(team_id: str, event_id: str, player_category: str = None):
    """Calculate maximum amount a team can safely bid while maintaining base price obligations"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Get team details
        team_doc = db.collection('teams').document(team_id).get()
        if not team_doc.exists:
            raise HTTPException(status_code=404, detail="Team not found")
        
        team_data = team_doc.to_dict()
        
        # Get categories
        categories_docs = db.collection('categories').where('event_id', '==', event_id).stream()
        categories = []
        for cat in categories_docs:
            cat_data = cat.to_dict()
            # Handle transition from old model to new model
            if 'base_price' not in cat_data:
                cat_data['base_price'] = cat_data.get('base_price_min', 50000)
            cat_data.pop('base_price_min', None)
            cat_data.pop('base_price_max', None)
            categories.append(Category(**cat_data))
        
        # Get team players
        team_players_docs = db.collection('players').where('sold_to_team_id', '==', team_id).where('status', '==', 'sold').stream()
        team_players = [doc.to_dict() for doc in team_players_docs]
        
        # Calculate base price analysis
        try:
            from utils.base_price_calculator import (
                calculate_base_price_requirements, 
                get_category_player_count
            )
        except ImportError as e:
            logger.error(f"Failed to import base_price_calculator: {e}")
            return {
                'max_safe_bid': team_data['remaining'],
                'remaining_budget': team_data['remaining'],
                'base_price_obligations': 0,
                'can_bid_safely': team_data['remaining'] > 0,
                'warning': "Base price calculations not available"
            }
        
        player_count_by_category = get_category_player_count(team_players, categories)
        base_price_reqs = calculate_base_price_requirements(categories, player_count_by_category)
        
        # Calculate maximum safe bid
        remaining_budget = team_data['remaining']
        total_obligations = base_price_reqs['total_base_price_obligation']
        
        # If bidding on a specific category, adjust obligations
        adjusted_obligations = total_obligations
        if player_category:
            # Find the category and reduce obligation by its base price (since we're buying one)
            for cat in categories:
                if cat.name.lower() == player_category.lower():
                    if player_category.lower() in base_price_reqs['category_obligations']:
                        remaining_needed = base_price_reqs['category_obligations'][player_category.lower()]['remaining_needed']
                        if remaining_needed > 0:
                            # Reduce obligation by one player's base price for this category
                            adjusted_obligations -= cat.base_price
                    break
        
        # Maximum safe bid = remaining budget - adjusted obligations
        max_safe_bid = max(0, remaining_budget - adjusted_obligations)
        
        # Add some buffer to ensure safety (e.g., keep at least 10% buffer)
        buffer_amount = max(10000, int(adjusted_obligations * 0.1))  # 10% buffer or 10k, whichever is higher
        max_safe_bid_with_buffer = max(0, max_safe_bid - buffer_amount)
        
        return {
            'max_safe_bid': max_safe_bid,
            'max_safe_bid_with_buffer': max_safe_bid_with_buffer,
            'remaining_budget': remaining_budget,
            'base_price_obligations': adjusted_obligations,
            'buffer_amount': buffer_amount,
            'can_bid_safely': max_safe_bid > 0,
            'category_obligations': base_price_reqs['category_obligations'],
            'recommendation': {
                'suggested_max_bid': max_safe_bid_with_buffer,
                'message': f"Suggested maximum bid: ₹{max_safe_bid_with_buffer:,} (includes safety buffer)"
            }
        }
        
    except Exception as e:
        logger.error(f"Error calculating max safe bid: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/events/{event_id}/teams-safe-bid-summary")
async def get_all_teams_safe_bid_summary(event_id: str, player_category: str = None):
    """Get safe bid summary for all teams in an event (for super admin view)"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Get all teams for the event
        teams_docs = db.collection('teams').where('event_id', '==', event_id).stream()
        teams_data = []
        
        # Get categories for the event
        categories_docs = db.collection('categories').where('event_id', '==', event_id).stream()
        categories = []
        for cat in categories_docs:
            cat_data = cat.to_dict()
            # Handle transition from old model to new model
            if 'base_price' not in cat_data:
                cat_data['base_price'] = cat_data.get('base_price_min', 50000)
            cat_data.pop('base_price_min', None)
            cat_data.pop('base_price_max', None)
            categories.append(Category(**cat_data))
        
        # Import calculator functions
        try:
            from utils.base_price_calculator import (
                calculate_base_price_requirements, 
                get_category_player_count
            )
        except ImportError as e:
            logger.error(f"Failed to import base_price_calculator: {e}")
            return {'teams': [], 'error': 'Base price calculations not available'}
        
        for team_doc in teams_docs:
            team_data = team_doc.to_dict()
            team_id = team_doc.id
            
            # Get team players
            team_players_docs = db.collection('players').where('sold_to_team_id', '==', team_id).where('status', '==', 'sold').stream()
            team_players = [doc.to_dict() for doc in team_players_docs]
            
            # Calculate base price analysis
            player_count_by_category = get_category_player_count(team_players, categories)
            base_price_reqs = calculate_base_price_requirements(categories, player_count_by_category)
            
            # Calculate maximum safe bid
            remaining_budget = team_data.get('remaining', 0)
            total_obligations = base_price_reqs['total_base_price_obligation']
            
            # If bidding on a specific category, adjust obligations
            adjusted_obligations = total_obligations
            if player_category:
                for cat in categories:
                    if cat.name.lower() == player_category.lower():
                        if player_category.lower() in base_price_reqs['category_obligations']:
                            remaining_needed = base_price_reqs['category_obligations'][player_category.lower()]['remaining_needed']
                            if remaining_needed > 0:
                                adjusted_obligations -= cat.base_price
                        break
            
            # Calculate safe bid amounts
            max_safe_bid = max(0, remaining_budget - adjusted_obligations)
            buffer_amount = max(10000, int(adjusted_obligations * 0.1))
            max_safe_bid_with_buffer = max(0, max_safe_bid - buffer_amount)
            
            teams_data.append({
                'team_id': team_id,
                'team_name': team_data.get('name', 'Unknown Team'),
                'total_budget': team_data.get('budget', 0),
                'spent': team_data.get('spent', 0),
                'remaining_budget': remaining_budget,
                'players_count': len(team_players),
                'base_price_obligations': adjusted_obligations,
                'max_safe_bid': max_safe_bid,
                'max_safe_bid_with_buffer': max_safe_bid_with_buffer,
                'buffer_amount': buffer_amount,
                'can_bid_safely': max_safe_bid > 0,
                'category_status': base_price_reqs['category_obligations'],
                'risk_level': 'low' if max_safe_bid_with_buffer > 100000 else 'medium' if max_safe_bid_with_buffer > 50000 else 'high'
            })
        
        # Sort by safe bidding capacity (descending)
        teams_data.sort(key=lambda x: x['max_safe_bid_with_buffer'], reverse=True)
        
        return {
            'teams': teams_data,
            'event_id': event_id,
            'player_category': player_category,
            'total_teams': len(teams_data),
            'timestamp': int(time.time())
        }
        
    except Exception as e:
        logger.error(f"Error getting teams safe bid summary: {str(e)}")
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
        
        # Get categories and current team players for base price validation
        categories_docs = db.collection('categories').where('event_id', '==', bid_data.event_id).stream()
        categories = [Category(**doc.to_dict()) for doc in categories_docs]
        
        team_players_docs = db.collection('players').where('sold_to_team_id', '==', team_id).where('status', '==', 'sold').stream()
        team_players = [doc.to_dict() for doc in team_players_docs]
        
        # Calculate base price obligations
        try:
            from utils.base_price_calculator import (
                calculate_base_price_requirements, 
                calculate_effective_budget, 
                validate_bid_against_obligations,
                get_category_player_count
            )
        except ImportError as e:
            logger.error(f"Failed to import base_price_calculator: {e}")
            # Fallback without base price validation for now
            pass
        
        player_count_by_category = get_category_player_count(team_players, categories)
        base_price_reqs = calculate_base_price_requirements(categories, player_count_by_category)
        budget_info = calculate_effective_budget(team_data['budget'], team_data['spent'], base_price_reqs['total_base_price_obligation'])
        
        # Validate bid against base price obligations
        bid_validation = validate_bid_against_obligations(bid_data.amount, budget_info)
        if not bid_validation['valid']:
            raise HTTPException(status_code=400, detail=bid_validation['reason'])
        
        # Traditional budget check
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
async def finalize_bid(player_id: str, event_id: str, current_user: dict = Depends(require_event_organizer)):
    """Finalize bid and mark player as sold"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Check if user owns the event
        if not await check_event_ownership(event_id, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only finalize bids for events you created"
            )
        
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

@api_router.post("/bids/complete-transaction")
async def complete_bid_transaction(
    transaction_data: dict,
    current_user: dict = Depends(require_super_admin)
):
    """Complete bid transaction in a single optimized call"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        player_id = transaction_data.get('player_id')
        team_id = transaction_data.get('team_id')
        amount = transaction_data.get('amount')
        event_id = transaction_data.get('event_id')
        
        if not all([player_id, team_id, amount, event_id]):
            raise HTTPException(status_code=400, detail="Missing required transaction data")
        
        # Use Firestore transaction for atomicity
        transaction = db.transaction()
        
        @firestore.transactional
        def update_transaction(transaction):
            # Get player
            player_ref = db.collection('players').document(player_id)
            player_doc = transaction.get(player_ref)
            if not player_doc.exists:
                raise HTTPException(status_code=404, detail="Player not found")
            
            # Get team
            team_ref = db.collection('teams').document(team_id)
            team_doc = transaction.get(team_ref)
            if not team_doc.exists:
                raise HTTPException(status_code=404, detail="Team not found")
            
            team_data = team_doc.to_dict()
            
            # Validate team has enough budget
            if team_data.get('remaining', 0) < amount:
                raise HTTPException(status_code=400, detail="Team has insufficient budget")
            
            # Update player status
            transaction.update(player_ref, {
                'status': PlayerStatus.SOLD.value,
                'sold_to_team_id': team_id,
                'sold_price': amount
            })
            
            # Update team budget
            new_spent = team_data.get('spent', 0) + amount
            new_remaining = team_data['budget'] - new_spent
            new_players_count = team_data.get('players_count', 0) + 1
            
            transaction.update(team_ref, {
                'spent': new_spent,
                'remaining': new_remaining,
                'players_count': new_players_count
            })
            
            # Clear auction state
            auction_state_id = f"auction_{event_id}"
            auction_ref = db.collection('auction_state').document(auction_state_id)
            transaction.update(auction_ref, {
                'current_player_id': None,
                'current_bid': None,
                'current_team_id': None,
                'current_team_name': None,
                'status': AuctionStatus.IN_PROGRESS.value,
                'bid_history': []
            })
            
            return team_data
        
        # Execute transaction
        team_data = update_transaction(transaction)
        
        return {
            "success": True,
            "message": f"Player sold successfully to {team_data['name']}",
            "player_id": player_id,
            "team_id": team_id,
            "team_name": team_data['name'],
            "final_price": f"₹{amount:,}",
            "auction_state": {
                "current_player_id": None,
                "status": "in_progress"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transaction error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Transaction failed: {str(e)}")

@api_router.post("/players/{player_id}/sell")
async def sell_player_directly(
    player_id: str, 
    team_id: str, 
    price: int, 
    event_id: str, 
    current_user: dict = Depends(require_event_organizer)
):
    """Directly sell a player to a team (event organizer only)"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Check if user owns the event
        if not await check_event_ownership(event_id, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only sell players for events you created"
            )
        
        # Validate player exists and is available for sale
        player_doc = db.collection('players').document(player_id).get()
        if not player_doc.exists:
            raise HTTPException(status_code=404, detail="Player not found")
        
        player_data = player_doc.to_dict()
        if player_data.get('status') not in [PlayerStatus.AVAILABLE.value, PlayerStatus.CURRENT.value]:
            raise HTTPException(status_code=400, detail="Player not available for sale")
        
        # Validate team exists
        team_doc = db.collection('teams').document(team_id).get()
        if not team_doc.exists:
            raise HTTPException(status_code=404, detail="Team not found")
        
        team_data = team_doc.to_dict()
        
        # Check if team has enough budget
        if team_data.get('remaining', 0) < price:
            raise HTTPException(status_code=400, detail="Team has insufficient budget")
        
        # Update player status
        db.collection('players').document(player_id).update({
            'status': PlayerStatus.SOLD.value,
            'sold_to_team_id': team_id,
            'sold_price': price
        })
        
        # Update team budget
        new_remaining = team_data['remaining'] - price
        db.collection('teams').document(team_id).update({
            'remaining': new_remaining
        })
        
        # Clear auction state if this was the current player
        auction_state_id = f"auction_{event_id}"
        state_doc = db.collection('auction_state').document(auction_state_id).get()
        if state_doc.exists:
            state_data = state_doc.to_dict()
            if state_data.get('current_player_id') == player_id:
                db.collection('auction_state').document(auction_state_id).update({
                    'current_player_id': None,
                    'current_bid': 0,
                    'current_team_id': None,
                    'current_team_name': None,
                    'bid_history': []
                })
        
        return {
            "message": f"Player sold successfully to {team_data['name']} for ₹{price:,}",
            "player_id": player_id,
            "team_id": team_id,
            "team_name": team_data['name'],
            "price": price
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/players/{player_id}/mark-unsold")
async def mark_player_unsold(
    player_id: str, 
    event_id: str, 
    current_user: dict = Depends(require_super_admin)
):
    """Mark a player as unsold (super admin only)"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Validate player exists
        player_doc = db.collection('players').document(player_id).get()
        if not player_doc.exists:
            raise HTTPException(status_code=404, detail="Player not found")
        
        player_data = player_doc.to_dict()
        
        # Update player status to unsold
        db.collection('players').document(player_id).update({
            'status': PlayerStatus.UNSOLD.value
        })
        
        # Clear auction state if this was the current player
        auction_state_id = f"auction_{event_id}"
        state_doc = db.collection('auction_state').document(auction_state_id).get()
        if state_doc.exists:
            state_data = state_doc.to_dict()
            if state_data.get('current_player_id') == player_id:
                db.collection('auction_state').document(auction_state_id).update({
                    'current_player_id': None,
                    'current_bid': 0,
                    'current_team_id': None,
                    'current_team_name': None,
                    'bid_history': []
                })
        
        return {
            "message": f"Player {player_data['name']} marked as unsold",
            "player_id": player_id,
            "player_name": player_data['name']
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/players/{player_id}/make-available")
async def make_player_available(player_id: str, current_user: dict = Depends(require_event_organizer)):
    """Make an unsold or current player available for auction again"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Get player document
        player_doc = db.collection('players').document(player_id).get()
        if not player_doc.exists:
            raise HTTPException(status_code=404, detail="Player not found")
        
        player_data = player_doc.to_dict()
        
        # Get category to check event ownership
        category_doc = db.collection('categories').document(player_data['category_id']).get()
        if not category_doc.exists:
            raise HTTPException(status_code=404, detail="Category not found")
        
        category_data = category_doc.to_dict()
        
        # Check if user owns the event
        if not await check_event_ownership(category_data['event_id'], current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only modify players for events you created"
            )
        
        # Check if player is unsold or current
        if player_data.get('status') not in [PlayerStatus.UNSOLD.value, PlayerStatus.CURRENT.value]:
            raise HTTPException(status_code=400, detail="Player must be unsold or current to make available")
        
        # Update player status to available
        db.collection('players').document(player_id).update({
            'status': PlayerStatus.AVAILABLE.value
        })
        
        return {"message": f"Player {player_data['name']} made available for auction"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/events/{event_id}/make-all-unsold-available")
async def make_all_unsold_available(event_id: str, current_user: dict = Depends(require_event_organizer)):
    """Make all unsold players in an event available for auction again"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Check if user owns the event
        if not await check_event_ownership(event_id, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only modify players for events you created"
            )
        
        # Get all players for the event through categories
        categories = db.collection('categories').where('event_id', '==', event_id).stream()
        category_ids = [cat.id for cat in categories]
        
        if not category_ids:
            return {"message": "No categories found for this event", "updated_count": 0}
        
        # Get all unsold players in these categories
        updated_count = 0
        for category_id in category_ids:
            players = db.collection('players').where('category_id', '==', category_id).where('status', '==', PlayerStatus.UNSOLD.value).stream()
            
            for player in players:
                db.collection('players').document(player.id).update({
                    'status': PlayerStatus.AVAILABLE.value
                })
                updated_count += 1
        
        return {"message": f"Made {updated_count} unsold players available for auction", "updated_count": updated_count}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/events/{event_id}/fix-current-players")
async def fix_current_players(event_id: str, current_user: dict = Depends(require_super_admin)):
    """Fix multiple CURRENT players by resetting all to AVAILABLE except the one in auction state"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Get auction state to find the actual current player
        auction_state_id = f"auction_{event_id}"
        state_doc = db.collection('auction_state').document(auction_state_id).get()
        actual_current_player_id = None
        
        if state_doc.exists:
            state_data = state_doc.to_dict()
            actual_current_player_id = state_data.get('current_player_id')
        
        # Get all players for the event through categories
        categories = db.collection('categories').where('event_id', '==', event_id).stream()
        category_ids = [cat.id for cat in categories]
        
        if not category_ids:
            return {"message": "No categories found for this event", "fixed_count": 0}
        
        # Find all players with CURRENT status
        fixed_count = 0
        for category_id in category_ids:
            current_players = db.collection('players').where('category_id', '==', category_id).where('status', '==', PlayerStatus.CURRENT.value).stream()
            
            for current_player_doc in current_players:
                player_id = current_player_doc.id
                
                # If this is not the actual current player, reset to available
                if player_id != actual_current_player_id:
                    db.collection('players').document(player_id).update({
                        'status': PlayerStatus.AVAILABLE.value
                    })
                    fixed_count += 1
        
        return {
            "message": f"Fixed {fixed_count} players with incorrect CURRENT status",
            "fixed_count": fixed_count,
            "actual_current_player": actual_current_player_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/players/{player_id}/release")
async def release_player_from_team(player_id: str, current_user: dict = Depends(require_event_organizer)):
    """Release a sold player from their team back to auction"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Get player document
        player_doc = db.collection('players').document(player_id).get()
        if not player_doc.exists:
            raise HTTPException(status_code=404, detail="Player not found")
        
        player_data = player_doc.to_dict()
        
        # Get category to check event ownership
        category_doc = db.collection('categories').document(player_data['category_id']).get()
        if not category_doc.exists:
            raise HTTPException(status_code=404, detail="Category not found")
        
        category_data = category_doc.to_dict()
        
        # Check if user owns the event
        if not await check_event_ownership(category_data['event_id'], current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only release players for events you created"
            )
        
        # Check if player is sold
        if player_data.get('status') != PlayerStatus.SOLD.value:
            raise HTTPException(status_code=400, detail="Player is not sold to any team")
        
        # Get the team details before releasing
        team_id = player_data.get('sold_to_team_id')
        sold_price = player_data.get('sold_price', 0)
        
        if not team_id:
            raise HTTPException(status_code=400, detail="Player has no associated team")
        
        # Get team document
        team_doc = db.collection('teams').document(team_id).get()
        if not team_doc.exists:
            raise HTTPException(status_code=404, detail="Team not found")
        
        team_data = team_doc.to_dict()
        team_name = team_data.get('name', 'Unknown Team')
        
        # Update player status to available and clear team association
        db.collection('players').document(player_id).update({
            'status': PlayerStatus.AVAILABLE.value,
            'sold_to_team_id': None,
            'sold_price': None
        })
        
        # Update team budget - refund the amount and decrease player count
        new_spent = max(0, team_data.get('spent', 0) - sold_price)
        new_remaining = team_data.get('budget', 0) - new_spent
        new_players_count = max(0, team_data.get('players_count', 0) - 1)
        
        db.collection('teams').document(team_id).update({
            'spent': new_spent,
            'remaining': new_remaining,
            'players_count': new_players_count
        })
        
        return {
            "message": f"Player {player_data['name']} released from {team_name} successfully",
            "player_id": player_id,
            "player_name": player_data['name'],
            "released_from_team": team_name,
            "refunded_amount": sold_price
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============= SPONSOR ROUTES =============

@api_router.post("/sponsors", response_model=Sponsor)
async def create_sponsor(sponsor_data: SponsorCreate, current_user: dict = Depends(require_super_admin)):
    """Create a new sponsor"""
    try:
        sponsor_id = str(uuid.uuid4())
        sponsor_doc = {
            'id': sponsor_id,
            'name': sponsor_data.name,
            'description': sponsor_data.description,
            'logo_url': sponsor_data.logo_url,
            'website': sponsor_data.website,
            'contact_email': sponsor_data.contact_email,
            'contact_phone': sponsor_data.contact_phone,
            'address': sponsor_data.address,
            'sponsorship_amount': sponsor_data.sponsorship_amount,
            'tier': sponsor_data.tier,
            'is_active': sponsor_data.is_active,
            'event_id': sponsor_data.event_id,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        if db:
            db.collection('sponsors').document(sponsor_id).set(sponsor_doc)
        
        return Sponsor(**sponsor_doc)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/sponsors/event/{event_id}", response_model=List[Sponsor])
async def get_event_sponsors(event_id: str):
    """Get all sponsors for an event"""
    try:
        if not db:
            return []
        
        sponsors = db.collection('sponsors').where('event_id', '==', event_id).stream()
        return [Sponsor(**sponsor.to_dict()) for sponsor in sponsors]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/sponsors/{sponsor_id}", response_model=Sponsor)
async def get_sponsor(sponsor_id: str):
    """Get sponsor by ID"""
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        sponsor_doc = db.collection('sponsors').document(sponsor_id).get()
        if not sponsor_doc.exists:
            raise HTTPException(status_code=404, detail="Sponsor not found")
        
        return Sponsor(**sponsor_doc.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/sponsors/{sponsor_id}", response_model=Sponsor)
async def update_sponsor(sponsor_id: str, sponsor_data: SponsorCreate, current_user: dict = Depends(require_super_admin)):
    """Update a sponsor"""
    try:
        if not db:
            raise HTTPException(status_code=500, detail="Database not available")
        
        # Check if sponsor exists
        sponsor_doc = db.collection('sponsors').document(sponsor_id).get()
        if not sponsor_doc.exists:
            raise HTTPException(status_code=404, detail="Sponsor not found")
        
        # Update sponsor data
        updated_data = {
            'name': sponsor_data.name,
            'description': sponsor_data.description,
            'logo_url': sponsor_data.logo_url,
            'website': sponsor_data.website,
            'contact_email': sponsor_data.contact_email,
            'contact_phone': sponsor_data.contact_phone,
            'address': sponsor_data.address,
            'sponsorship_amount': sponsor_data.sponsorship_amount,
            'tier': sponsor_data.tier,
            'is_active': sponsor_data.is_active,
            'event_id': sponsor_data.event_id
        }
        
        db.collection('sponsors').document(sponsor_id).update(updated_data)
        
        # Get updated sponsor
        updated_doc = db.collection('sponsors').document(sponsor_id).get()
        return Sponsor(**updated_doc.to_dict())
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.delete("/sponsors/{sponsor_id}")
async def delete_sponsor(sponsor_id: str, current_user: dict = Depends(require_super_admin)):
    """Delete a sponsor"""
    try:
        if not db:
            raise HTTPException(status_code=500, detail="Database not available")
        
        # Check if sponsor exists
        sponsor_doc = db.collection('sponsors').document(sponsor_id).get()
        if not sponsor_doc.exists:
            raise HTTPException(status_code=404, detail="Sponsor not found")
        
        # Delete the sponsor
        db.collection('sponsors').document(sponsor_id).delete()
        
        return {"message": "Sponsor deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

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

# Add root-level health check for Railway deployment
@app.get("/health")
async def root_health():
    return {
        "status": "healthy",
        "firebase": "connected" if db else "disconnected"
    }

@app.get("/")
async def root():
    return {"message": "Sports Auction API", "status": "running", "version": "1.0.0"}

# Add CORS middleware - Temporary fix for deployment
# Allow all origins to troubleshoot CORS issues
logger.info("Setting up CORS middleware with permissive settings")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins temporarily
    allow_credentials=False,  # Set to False when using wildcard origins
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
    allow_headers=["*"],
)
