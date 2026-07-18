"""
Raj Enterprises — Users Router

User profile management endpoints.
"""

from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from datetime import datetime, timezone
import uuid
import os
from bson import ObjectId
from app.database import database
from app.dependencies import get_current_user
from app.models.user import UserUpdate, UserResponse, AddressUpdate
from app.config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    update_data: UserUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update the current user's profile."""
    update_fields = {}

    if update_data.name is not None:
        update_fields["name"] = update_data.name

    if update_data.shop_name is not None:
        update_fields["shop_name"] = update_data.shop_name

    if update_data.notification_opt_in is not None:
        update_fields["notification_opt_in"] = update_data.notification_opt_in

    if update_data.profile_image_url is not None:
        update_fields["profile_image_url"] = update_data.profile_image_url

    # Email uniqueness check before updating
    if update_data.email is not None and update_data.email != current_user.get("email"):
        existing = await database.users.find_one(
            {"email": update_data.email, "_id": {"$ne": current_user["_id"]}}
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This email is already tied to another account.",
            )
        update_fields["email"] = update_data.email

    # Mobile uniqueness check before updating
    if update_data.mobile is not None and update_data.mobile != current_user.get("mobile"):
        existing = await database.users.find_one(
            {"mobile": update_data.mobile, "_id": {"$ne": current_user["_id"]}}
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This mobile number is already tied to another account.",
            )
        update_fields["mobile"] = update_data.mobile

    if not update_fields:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update.")

    update_fields["updated_at"] = datetime.now(timezone.utc)

    await database.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": update_fields},
    )

    updated_user = await database.users.find_one({"_id": current_user["_id"]})

    return UserResponse(
        id=str(updated_user["_id"]),
        name=updated_user["name"],
        mobile=updated_user.get("mobile"),
        email=updated_user.get("email"),
        shop_name=updated_user.get("shop_name"),
        addresses=updated_user.get("addresses", []),
        role=updated_user["role"],
        profile_image_url=updated_user.get("profile_image_url"),
        is_active=updated_user.get("is_active", True),
        notification_opt_in=updated_user.get("notification_opt_in", True),
        has_password=updated_user.get("has_password", False),
        created_at=updated_user["created_at"],
        updated_at=updated_user["updated_at"],
    )


@router.post("/addresses")
async def add_address(
    address: AddressUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Add a new address to the user's address list."""
    addresses = current_user.get("addresses", [])

    # If new address is default, un-default all others
    if address.is_default:
        for addr in addresses:
            addr["is_default"] = False

    addresses.append(address.model_dump())

    await database.users.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {
                "addresses": addresses,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return {"message": "Address added successfully", "total_addresses": len(addresses)}


@router.put("/addresses/{index}")
async def update_address(
    index: int,
    address: AddressUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update an existing address by index."""
    addresses = current_user.get("addresses", [])
    if index < 0 or index >= len(addresses):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found.")

    if address.is_default:
        for addr in addresses:
            addr["is_default"] = False

    addresses[index] = address.model_dump()

    await database.users.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {
                "addresses": addresses,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return {"message": "Address updated successfully"}


@router.delete("/addresses/{index}")
async def delete_address(
    index: int,
    current_user: dict = Depends(get_current_user),
):
    """Delete an address by index."""
    addresses = current_user.get("addresses", [])
    if index < 0 or index >= len(addresses):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found.")

    addresses.pop(index)

    await database.users.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {
                "addresses": addresses,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return {"message": "Address deleted successfully"}


@router.post("/profile-image")
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload a profile image. Returns secure URL."""
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}",
        )

    contents = await file.read()

    # Cloudinary Integration
    if settings.cloudinary_cloud_name and settings.cloudinary_api_key and settings.cloudinary_api_secret:
        try:
            import cloudinary
            import cloudinary.uploader
            
            cloudinary.config(
                cloud_name=settings.cloudinary_cloud_name,
                api_key=settings.cloudinary_api_key,
                api_secret=settings.cloudinary_api_secret,
                secure=True
            )
            upload_result = cloudinary.uploader.upload(contents)
            secure_url = upload_result.get("secure_url")
            if secure_url:
                # Update user profile image url in MongoDB directly
                await database.users.update_one(
                    {"_id": current_user["_id"]},
                    {"$set": {"profile_image_url": secure_url}}
                )
                return {"profile_image_url": secure_url}
        except Exception as ex:
            logger.error(f"Cloudinary upload error, falling back to local storage: {ex}")

    # Local fallback
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"profile_{current_user['_id']}_{uuid.uuid4().hex[:6]}.{ext}"
    filepath = os.path.join(settings.image_upload_dir, "profiles", filename)

    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    with open(filepath, "wb") as f:
        f.write(contents)

    full_url = f"{settings.image_base_url}/profiles/{filename}"
    await database.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"profile_image_url": full_url}}
    )
    return {"profile_image_url": full_url}
