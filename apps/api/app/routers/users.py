"""
Raj Enterprises — Users Router

User profile management endpoints.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timezone
from bson import ObjectId
from app.database import database
from app.dependencies import get_current_user
from app.models.user import UserUpdate, UserResponse, AddressUpdate
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
