"""
Raj Enterprises — Cart Router

Server-side cart for logged-in users.
Guest cart is managed client-side (IndexedDB) and merged on login.
Merge strategy: sum quantities, capped at available stock.
Max 20 distinct products per cart.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timezone
from bson import ObjectId
from app.database import database
from app.dependencies import get_current_user
from app.models.cart import (
    CartItemAdd, CartItemUpdate, CartMergeRequest,
    CartResponse, CartItemResponse,
)
from app.config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_CART_ITEMS = 20


async def _get_cart_response(user_id: ObjectId) -> CartResponse:
    """Build full cart response with product details populated."""
    cart = await database.carts.find_one({"user_id": user_id})
    if not cart:
        return CartResponse(
            id="",
            items=[],
            total_items=0,
            selected_items_count=0,
            subtotal=0.0,
            updated_at=datetime.now(timezone.utc),
        )

    items = []
    for item in cart.get("items", []):
        product = await database.products.find_one({"_id": ObjectId(item["product_id"])})
        if product:
            price = product["price"]
            stock = product.get("stock_count", 0)
            items.append(CartItemResponse(
                product_id=str(product["_id"]),
                product_title=product["title"],
                product_image=(
                    f"{settings.image_base_url}/{product['images'][0]}"
                    if product.get("images")
                    else None
                ),
                price=price,
                quantity=item["quantity"],
                selected=item.get("selected", True),
                in_stock=stock > 0,
                max_quantity=stock,
                subtotal=price * item["quantity"],
            ))

    selected_items = [i for i in items if i.selected]

    return CartResponse(
        id=str(cart["_id"]),
        items=items,
        total_items=len(items),
        selected_items_count=len(selected_items),
        subtotal=sum(i.subtotal for i in selected_items),
        updated_at=cart.get("updated_at", datetime.now(timezone.utc)),
    )


@router.get("", response_model=CartResponse)
async def get_cart(current_user: dict = Depends(get_current_user)):
    """Get the current user's cart."""
    return await _get_cart_response(current_user["_id"])


@router.post("/items", response_model=CartResponse)
async def add_to_cart(
    item: CartItemAdd,
    current_user: dict = Depends(get_current_user),
):
    """Add an item to cart or increment quantity if already present."""
    if not ObjectId.is_valid(item.product_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product ID.")

    # Verify product exists and is active
    product = await database.products.find_one({
        "_id": ObjectId(item.product_id),
        "status": "active",
    })
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found or inactive.")

    # Check stock
    if product.get("stock_count", 0) <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Product is out of stock.")

    user_id = current_user["_id"]
    cart = await database.carts.find_one({"user_id": user_id})

    if not cart:
        # Create new cart
        await database.carts.insert_one({
            "user_id": user_id,
            "items": [{"product_id": item.product_id, "quantity": item.quantity, "selected": True}],
            "updated_at": datetime.now(timezone.utc),
        })
    else:
        existing_items = cart.get("items", [])
        existing_idx = next(
            (i for i, x in enumerate(existing_items) if x["product_id"] == item.product_id),
            None,
        )

        if existing_idx is not None:
            # Increment quantity, cap at stock
            new_qty = min(
                existing_items[existing_idx]["quantity"] + item.quantity,
                product.get("stock_count", 0),
            )
            existing_items[existing_idx]["quantity"] = new_qty
        else:
            # Check cart limit
            if len(existing_items) >= MAX_CART_ITEMS:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cart cannot have more than {MAX_CART_ITEMS} distinct products.",
                )
            existing_items.append({
                "product_id": item.product_id,
                "quantity": min(item.quantity, product.get("stock_count", 0)),
                "selected": True,
            })

        await database.carts.update_one(
            {"_id": cart["_id"]},
            {"$set": {"items": existing_items, "updated_at": datetime.now(timezone.utc)}},
        )

    return await _get_cart_response(user_id)


@router.put("/items/{product_id}", response_model=CartResponse)
async def update_cart_item(
    product_id: str,
    update: CartItemUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update cart item quantity or selection. Quantity 0 removes the item."""
    cart = await database.carts.find_one({"user_id": current_user["_id"]})
    if not cart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart not found.")

    items = cart.get("items", [])
    item_idx = next((i for i, x in enumerate(items) if x["product_id"] == product_id), None)
    if item_idx is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not in cart.")

    if update.quantity is not None:
        if update.quantity == 0:
            items.pop(item_idx)
        else:
            items[item_idx]["quantity"] = update.quantity

    if update.selected is not None and item_idx < len(items):
        items[item_idx]["selected"] = update.selected

    await database.carts.update_one(
        {"_id": cart["_id"]},
        {"$set": {"items": items, "updated_at": datetime.now(timezone.utc)}},
    )

    return await _get_cart_response(current_user["_id"])


@router.delete("/items/{product_id}", response_model=CartResponse)
async def remove_from_cart(
    product_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Remove an item from cart."""
    cart = await database.carts.find_one({"user_id": current_user["_id"]})
    if not cart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart not found.")

    items = [i for i in cart.get("items", []) if i["product_id"] != product_id]

    await database.carts.update_one(
        {"_id": cart["_id"]},
        {"$set": {"items": items, "updated_at": datetime.now(timezone.utc)}},
    )

    return await _get_cart_response(current_user["_id"])


@router.post("/merge", response_model=CartResponse)
async def merge_guest_cart(
    merge_request: CartMergeRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Merge guest cart (from IndexedDB) into server-side cart on login.
    Strategy: sum quantities, capped at available stock.
    """
    user_id = current_user["_id"]
    cart = await database.carts.find_one({"user_id": user_id})

    existing_items = cart.get("items", []) if cart else []
    existing_map = {item["product_id"]: item for item in existing_items}

    for guest_item in merge_request.items:
        product = await database.products.find_one({
            "_id": ObjectId(guest_item.product_id),
            "status": "active",
        })
        if not product:
            continue  # Skip invalid/inactive products

        max_stock = product.get("stock_count", 0)
        if max_stock <= 0:
            continue

        if guest_item.product_id in existing_map:
            # Sum quantities, cap at stock
            current_qty = existing_map[guest_item.product_id]["quantity"]
            existing_map[guest_item.product_id]["quantity"] = min(
                current_qty + guest_item.quantity, max_stock
            )
        else:
            if len(existing_map) >= MAX_CART_ITEMS:
                break  # Cart full, skip remaining guest items
            existing_map[guest_item.product_id] = {
                "product_id": guest_item.product_id,
                "quantity": min(guest_item.quantity, max_stock),
                "selected": True,
            }

    merged_items = list(existing_map.values())

    if cart:
        await database.carts.update_one(
            {"_id": cart["_id"]},
            {"$set": {"items": merged_items, "updated_at": datetime.now(timezone.utc)}},
        )
    else:
        await database.carts.insert_one({
            "user_id": user_id,
            "items": merged_items,
            "updated_at": datetime.now(timezone.utc),
        })

    return await _get_cart_response(user_id)


@router.delete("", response_model=dict)
async def clear_cart(current_user: dict = Depends(get_current_user)):
    """Clear all items from cart."""
    await database.carts.update_one(
        {"user_id": current_user["_id"]},
        {"$set": {"items": [], "updated_at": datetime.now(timezone.utc)}},
    )
    return {"message": "Cart cleared"}
