"""
Raj Enterprises — Wishlist Router

Toggle-based wishlist for logged-in users.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId
from app.database import database
from app.dependencies import get_current_user
from app.models.wishlist import WishlistToggleRequest, WishlistResponse, WishlistItemResponse
from app.config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=WishlistResponse)
async def get_wishlist(current_user: dict = Depends(get_current_user)):
    """Get the current user's wishlist with product details."""
    wishlist = await database.wishlists.find_one({"user_id": current_user["_id"]})
    if not wishlist:
        return WishlistResponse(id="", items=[], total_items=0)

    items = []
    for pid in wishlist.get("product_ids", []):
        product = await database.products.find_one({"_id": ObjectId(pid) if isinstance(pid, str) else pid})
        if product:
            raw_img = product["images"][0] if product.get("images") else None
            if raw_img and (raw_img.startswith("http://") or raw_img.startswith("https://")):
                image_url = raw_img
            elif raw_img:
                image_url = f"{settings.image_base_url.rstrip('/')}/{raw_img.lstrip('/')}"
            else:
                image_url = None

            items.append(WishlistItemResponse(
                product_id=str(product["_id"]),
                product_title=product["title"],
                product_image=image_url,
                price=product["price"],
                in_stock=product.get("stock_count", 0) > 0,
                status=product.get("status", "active"),
            ))

    return WishlistResponse(
        id=str(wishlist["_id"]),
        items=items,
        total_items=len(items),
    )


@router.post("/toggle")
async def toggle_wishlist(
    request: WishlistToggleRequest,
    current_user: dict = Depends(get_current_user),
):
    """Add or remove a product from wishlist (toggle)."""
    if not ObjectId.is_valid(request.product_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product ID.")

    # Verify product exists
    product = await database.products.find_one({"_id": ObjectId(request.product_id)})
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    user_id = current_user["_id"]
    wishlist = await database.wishlists.find_one({"user_id": user_id})

    if not wishlist:
        # Create wishlist with this product
        await database.wishlists.insert_one({
            "user_id": user_id,
            "product_ids": [request.product_id],
        })
        return {"action": "added", "product_id": request.product_id}

    product_ids = [str(pid) for pid in wishlist.get("product_ids", [])]

    if request.product_id in product_ids:
        # Remove from wishlist
        product_ids.remove(request.product_id)
        action = "removed"
    else:
        # Add to wishlist
        product_ids.append(request.product_id)
        action = "added"

    await database.wishlists.update_one(
        {"_id": wishlist["_id"]},
        {"$set": {"product_ids": product_ids}},
    )

    return {"action": action, "product_id": request.product_id}
