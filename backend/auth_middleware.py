from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_config import firebase_auth
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
    role = current_user.get('role', '')
    if role != UserRole.SUPER_ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    return current_user

async def require_team_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Require team admin or super admin role"""
    role = current_user.get('role', '')
    if role not in [UserRole.TEAM_ADMIN.value, UserRole.SUPER_ADMIN.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Team admin access required"
        )
    return current_user
