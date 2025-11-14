from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_config import firebase_auth, db
from models import UserRole

security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify Firebase JWT token"""
    try:
        decoded_token = firebase_auth.verify_id_token(credentials.credentials)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}"
        )

async def get_current_user(token_data: dict = Depends(verify_token)) -> dict:
    """Get current user from token"""
    return token_data

async def require_super_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Require super admin role"""
    try:
        # Check role from Firestore instead of token
        if db:
            user_doc = db.collection('users').document(current_user['uid']).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                role = user_data.get('role', '')
                print(f"Checking super admin role for {current_user['uid']}: {role}")  # Debug log
                if role == UserRole.SUPER_ADMIN.value:
                    return current_user
        
        # Fallback to token role
        role = current_user.get('role', '')
        if role == UserRole.SUPER_ADMIN.value:
            return current_user
            
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Super admin access required. Current role: {role}"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in require_super_admin: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error checking user permissions"
        )

async def require_team_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Require team admin or super admin role"""
    try:
        # Check role from Firestore instead of token
        if db:
            user_doc = db.collection('users').document(current_user['uid']).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                role = user_data.get('role', '')
                if role in [UserRole.TEAM_ADMIN.value, UserRole.SUPER_ADMIN.value]:
                    return current_user
        
        # Fallback to token role
        role = current_user.get('role', '')
        if role in [UserRole.TEAM_ADMIN.value, UserRole.SUPER_ADMIN.value]:
            return current_user
            
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Team admin access required. Current role: {role}"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in require_team_admin: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error checking user permissions"
        )

async def require_event_organizer(current_user: dict = Depends(get_current_user)) -> dict:
    """Require event organizer or super admin role"""
    try:
        # Check role from Firestore instead of token
        if db:
            user_doc = db.collection('users').document(current_user['uid']).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                role = user_data.get('role', '')
                if role in [UserRole.EVENT_ORGANIZER.value, UserRole.SUPER_ADMIN.value]:
                    return current_user
        
        # Fallback to token role
        role = current_user.get('role', '')
        if role in [UserRole.EVENT_ORGANIZER.value, UserRole.SUPER_ADMIN.value]:
            return current_user
            
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Event organizer access required. Current role: {role}"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in require_event_organizer: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error checking user permissions"
        )
