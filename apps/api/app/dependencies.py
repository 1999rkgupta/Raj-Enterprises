"""
Raj Enterprises API — FastAPI Dependencies

Reusable dependencies for authentication and authorization.
Firebase token verification + role enforcement from MongoDB.
"""

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth as firebase_auth
from bson import ObjectId
from datetime import datetime, timezone
from app.database import database
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Bearer token extractor
security = HTTPBearer(auto_error=False)


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict | None:
    """
    Optionally resolve the current user from Firebase token.
    Returns None if no token is provided (guest access).
    """
    if credentials is None:
        return None
    token = credentials.credentials

    # Mock Auth Bypass in Development
    if settings.app_env != "production" and token.startswith("mock-"):
        firebase_uid = "SEED_SUPER_ADMIN_UID" if token == "mock-superadmin" else token
        user = await database.users.find_one({"firebase_uid": firebase_uid, "is_active": True})
        return user

    try:
        # Verify Firebase ID token server-side
        decoded_token = firebase_auth.verify_id_token(token)
        firebase_uid = decoded_token["uid"]
    except Exception as e:
        logger.warning(f"Invalid Firebase token: {e}")
        return None

    # Resolve user from MongoDB by Firebase UID
    user = await database.users.find_one({"firebase_uid": firebase_uid, "is_active": True})
    if not user:
        return None

    # Update last_active_at
    await database.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_active_at": datetime.now(timezone.utc)}},
    )

    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    """
    Require and resolve the current authenticated user.
    Verifies Firebase token and resolves role from MongoDB.
    Raises 401 if not authenticated, 403 if account deactivated.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Mock Auth Bypass in Development
    if settings.app_env != "production" and token.startswith("mock-"):
        role = "customer"
        firebase_uid = token
        name = "Mock User"
        email = f"{token}@example.com"

        if token == "mock-admin":
            role = "admin"
            name = "Mock Admin"
        elif token == "mock-superadmin":
            role = "super_admin"
            name = "Mock Super Admin"
            firebase_uid = "SEED_SUPER_ADMIN_UID"  # Match seeded super admin

        # Find or create mock user in database
        user = await database.users.find_one({"firebase_uid": firebase_uid})
        if not user:
            now = datetime.now(timezone.utc)
            user = {
                "firebase_uid": firebase_uid,
                "name": name,
                "email": email,
                "mobile": "+919999999901" if role == "customer" else None,
                "role": role,
                "is_active": True,
                "addresses": [],
                "notification_opt_in": True,
                "has_password": True,
                "created_at": now,
                "updated_at": now,
                "last_active_at": now,
                "metadata": {"mock": True},
            }
            res = await database.users.insert_one(user)
            user["_id"] = res.inserted_id

        # Update last active
        await database.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_active_at": datetime.now(timezone.utc)}},
        )
        return user

    try:
        # Verify Firebase ID token server-side — NEVER trust client-supplied claims
        decoded_token = firebase_auth.verify_id_token(token)
        firebase_uid = decoded_token["uid"]
    except firebase_auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except firebase_auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Firebase token verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Resolve user from MongoDB — role comes from DB, never from token
    user = await database.users.find_one({"firebase_uid": firebase_uid})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found. Please complete registration.",
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Contact support.",
        )

    # Check session inactivity timeout
    last_active = user.get("last_active_at")
    if last_active:
        if last_active.tzinfo is None:
            last_active = last_active.replace(tzinfo=timezone.utc)
        inactive_days = (datetime.now(timezone.utc) - last_active).days
        if inactive_days >= settings.session_inactivity_days:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Session expired due to {inactive_days} days of inactivity. Please sign in again.",
            )

    # Update last_active_at
    await database.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_active_at": datetime.now(timezone.utc)}},
    )

    return user


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Require admin or super_admin role.
    Role is verified from MongoDB, never from client state.
    """
    if current_user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user


async def require_super_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Require super_admin role.
    Only super_admin can manage other admin accounts.
    """
    if current_user.get("role") != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required.",
        )
    return current_user


def require_role(*roles: str):
    """
    Factory for creating role-specific dependencies.
    Usage: Depends(require_role("admin", "super_admin"))
    """
    async def _check_role(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role: {', '.join(roles)}",
            )
        return current_user
    return _check_role


async def audit_log(
    action: str,
    performed_by: ObjectId,
    target_type: str,
    target_id: ObjectId | str | None = None,
    details: dict | None = None,
):
    """
    Record an audit log entry for admin actions.
    Used for status changes, deletions, payment recording, etc.
    """
    log_entry = {
        "action": action,
        "performed_by": performed_by,
        "target_type": target_type,
        "target_id": target_id,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc),
    }
    await database.audit_logs.insert_one(log_entry)
    logger.info(f"Audit: {action} on {target_type}/{target_id} by {performed_by}")
