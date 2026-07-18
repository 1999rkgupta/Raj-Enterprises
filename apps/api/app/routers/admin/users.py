"""
Raj Enterprises — Admin User Management Router

List customers/admins, deactivate users, create admin accounts.
Only super_admin can create/remove admins. Max 5 admin accounts enforced.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from app.database import database
from app.dependencies import require_admin, require_super_admin, audit_log
from app.models.user import UserAdminResponse, AdminCreateRequest, UserRole
from app.config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/customers")
async def list_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    admin: dict = Depends(require_admin),
):
    """List all customers with pagination and search."""
    query = {"role": "customer"}
    if is_active is not None:
        query["is_active"] = is_active
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"mobile": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"shop_name": {"$regex": search, "$options": "i"}},
        ]

    total = await database.users.count_documents(query)
    skip = (page - 1) * page_size
    users = await database.users.find(query).sort("created_at", -1).skip(skip).limit(page_size).to_list(length=page_size)

    return {
        "users": [
            {
                "id": str(u["_id"]),
                "name": u["name"],
                "mobile": u.get("mobile"),
                "email": u.get("email"),
                "shop_name": u.get("shop_name"),
                "role": u["role"],
                "is_active": u.get("is_active", True),
                "created_at": u["created_at"].isoformat(),
                "last_active_at": u.get("last_active_at", u["created_at"]).isoformat(),
            }
            for u in users
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": (page * page_size) < total,
    }


@router.get("/admins")
async def list_admins(admin: dict = Depends(require_admin)):
    """List all admin and super_admin accounts."""
    admins = await database.users.find(
        {"role": {"$in": ["admin", "super_admin"]}}
    ).to_list(length=20)

    return {
        "admins": [
            {
                "id": str(u["_id"]),
                "name": u["name"],
                "mobile": u.get("mobile"),
                "email": u.get("email"),
                "role": u["role"],
                "is_active": u.get("is_active", True),
                "created_at": u["created_at"].isoformat(),
            }
            for u in admins
        ],
        "total": len(admins),
    }


@router.post("/create-admin", status_code=status.HTTP_201_CREATED)
async def create_admin(
    request: AdminCreateRequest,
    super_admin: dict = Depends(require_super_admin),
):
    """
    Create a new admin account. Super admin only.
    Enforces maximum 5 admin accounts (excluding super_admin).
    """
    # Count current admins (excluding super_admin)
    admin_count = await database.users.count_documents({"role": "admin"})
    if admin_count >= settings.max_admin_accounts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {settings.max_admin_accounts} admin accounts allowed. "
                   f"Current count: {admin_count}.",
        )

    # Check if Firebase UID already registered
    existing = await database.users.find_one({"firebase_uid": request.firebase_uid})
    if existing:
        if existing["role"] in ("admin", "super_admin"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This user is already an admin.",
            )
        # Promote existing customer to admin
        await database.users.update_one(
            {"_id": existing["_id"]},
            {"$set": {"role": "admin", "updated_at": datetime.now(timezone.utc)}},
        )
        await audit_log(
            action="promote_to_admin",
            performed_by=super_admin["_id"],
            target_type="user",
            target_id=existing["_id"],
            details={"previous_role": existing["role"]},
        )
        return {"message": "User promoted to admin", "user_id": str(existing["_id"])}

    # Create new admin user
    now = datetime.now(timezone.utc)
    user_doc = {
        "firebase_uid": request.firebase_uid,
        "name": request.name,
        "mobile": request.mobile,
        "email": request.email,
        "shop_name": None,
        "addresses": [],
        "role": UserRole.ADMIN.value,
        "profile_image_url": None,
        "is_active": True,
        "notification_opt_in": True,
        "has_password": False,
        "created_at": now,
        "updated_at": now,
        "last_active_at": now,
        "metadata": {},
    }

    result = await database.users.insert_one(user_doc)

    await audit_log(
        action="create_admin",
        performed_by=super_admin["_id"],
        target_type="user",
        target_id=result.inserted_id,
    )

    return {"message": "Admin account created", "user_id": str(result.inserted_id)}


@router.put("/{user_id}/deactivate")
async def deactivate_user(
    user_id: str,
    admin: dict = Depends(require_admin),
):
    """Deactivate a user account (soft delete)."""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID.")

    user = await database.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    # Prevent deactivating super_admin
    if user["role"] == "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot deactivate super admin.",
        )

    # Only super_admin can deactivate other admins
    if user["role"] == "admin" and admin["role"] != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admin can deactivate admin accounts.",
        )

    await database.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}},
    )

    await audit_log(
        action="deactivate_user",
        performed_by=admin["_id"],
        target_type="user",
        target_id=ObjectId(user_id),
    )

    return {"message": "User deactivated successfully"}


@router.put("/{user_id}/activate")
async def activate_user(
    user_id: str,
    admin: dict = Depends(require_admin),
):
    """Reactivate a deactivated user account."""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID.")

    await database.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": True, "updated_at": datetime.now(timezone.utc)}},
    )

    await audit_log(
        action="activate_user",
        performed_by=admin["_id"],
        target_type="user",
        target_id=ObjectId(user_id),
    )

    return {"message": "User activated successfully"}


@router.get("/{user_id}/orders")
async def get_user_orders(
    user_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    admin: dict = Depends(require_admin),
):
    """View a specific user's order/payment history (admin view)."""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID.")

    query = {"user_id": ObjectId(user_id)}
    total = await database.orders.count_documents(query)
    skip = (page - 1) * page_size
    orders = await database.orders.find(query).sort("created_at", -1).skip(skip).limit(page_size).to_list(length=page_size)

    return {
        "orders": [
            {
                "id": str(o["_id"]),
                "order_number": o["order_number"],
                "amount_total": o["amount_total"],
                "amount_received": o.get("amount_received", 0),
                "amount_due": max(0, o["amount_total"] - o.get("amount_received", 0)),
                "order_status": o["order_status"],
                "payment_status": o["payment_status"],
                "created_at": o["created_at"].isoformat(),
            }
            for o in orders
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": (page * page_size) < total,
    }


@router.put("/{user_id}/profile")
async def update_user_profile_admin(
    user_id: str,
    data: dict,
    admin: dict = Depends(require_super_admin),
):
    """Allow super admin to edit the profile/role of another user (e.g. admin)."""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID.")

    update_fields = {}
    if "name" in data:
        update_fields["name"] = data["name"]
    if "email" in data:
        update_fields["email"] = data["email"]
    if "mobile" in data:
        update_fields["mobile"] = data["mobile"]
    if "role" in data:
        update_fields["role"] = data["role"]
    if "shop_name" in data:
        update_fields["shop_name"] = data["shop_name"]

    if not update_fields:
        return {"message": "No changes made"}

    update_fields["updated_at"] = datetime.now(timezone.utc)

    await database.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_fields}
    )

    await audit_log(
        action="update_user_profile_admin",
        performed_by=admin["_id"],
        target_type="user",
        target_id=ObjectId(user_id),
    )

    return {"message": "User profile updated successfully"}
