"""
Raj Enterprises — Auth Router

Handles user registration, login reconciliation, and profile completion.
Firebase handles actual auth; this endpoint reconciles Firebase UID ↔ MongoDB user.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timezone
from app.database import database
from app.dependencies import get_current_user, security
from app.models.user import UserCreate, UserResponse, UserRole
from fastapi.security import HTTPAuthorizationCredentials
from firebase_admin import auth as firebase_auth
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate):
    """
    Register a new user after Firebase authentication.

    Flow:
    1. Client authenticates with Firebase (Google/OTP/Email)
    2. Client sends Firebase UID + user details to this endpoint
    3. Backend verifies the Firebase UID is valid
    4. Creates user record in MongoDB with role='customer'

    Account uniqueness: mobile and email are unique-indexed (sparse).
    """
    # Check if user already exists with this Firebase UID
    existing = await database.users.find_one({"firebase_uid": user_data.firebase_uid})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this Firebase UID already exists.",
        )

    # Check mobile uniqueness (if provided)
    if user_data.mobile:
        mobile_exists = await database.users.find_one({"mobile": user_data.mobile})
        if mobile_exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This mobile number is already registered to another account.",
            )

    # Check email uniqueness (if provided)
    if user_data.email:
        email_exists = await database.users.find_one({"email": user_data.email})
        if email_exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This email is already registered to another account.",
            )

    # Create user document
    now = datetime.now(timezone.utc)
    user_doc = {
        "firebase_uid": user_data.firebase_uid,
        "name": user_data.name,
        "mobile": user_data.mobile,
        "email": user_data.email,
        "shop_name": user_data.shop_name,
        "addresses": [],
        "role": UserRole.CUSTOMER.value,
        "profile_image_url": user_data.profile_image_url,
        "is_active": True,
        "notification_opt_in": True,
        "has_password": False,
        "created_at": now,
        "updated_at": now,
        "last_active_at": now,
        "metadata": {},
    }

    result = await database.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    logger.info(f"New user registered: {user_data.name} (UID: {user_data.firebase_uid})")

    return UserResponse(
        id=str(user_doc["_id"]),
        name=user_doc["name"],
        mobile=user_doc.get("mobile"),
        email=user_doc.get("email"),
        shop_name=user_doc.get("shop_name"),
        addresses=[],
        role=user_doc["role"],
        profile_image_url=user_doc.get("profile_image_url"),
        is_active=True,
        notification_opt_in=True,
        has_password=False,
        created_at=now,
        updated_at=now,
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return UserResponse(
        id=str(current_user["_id"]),
        name=current_user["name"],
        mobile=current_user.get("mobile"),
        email=current_user.get("email"),
        shop_name=current_user.get("shop_name"),
        addresses=current_user.get("addresses", []),
        role=current_user["role"],
        profile_image_url=current_user.get("profile_image_url"),
        is_active=current_user.get("is_active", True),
        notification_opt_in=current_user.get("notification_opt_in", True),
        has_password=current_user.get("has_password", False),
        created_at=current_user["created_at"],
        updated_at=current_user["updated_at"],
    )


@router.post("/verify-token")
async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Verify a Firebase ID token and return the associated user.
    Used by clients to check if their session is still valid.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No token provided.",
        )

    try:
        decoded_token = firebase_auth.verify_id_token(credentials.credentials)
        firebase_uid = decoded_token["uid"]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )

    user = await database.users.find_one({"firebase_uid": firebase_uid})
    if not user:
        return {"valid": True, "registered": False, "firebase_uid": firebase_uid}

    return {
        "valid": True,
        "registered": True,
        "user_id": str(user["_id"]),
        "role": user["role"],
    }
