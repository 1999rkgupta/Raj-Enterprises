"""
Raj Enterprises — Products Router (Customer-facing)

Public product browsing, search, filter, pagination.
Stock count is NOT exposed to customers — only availability/low-stock badges.
"""

from fastapi import APIRouter, Query, Depends
from typing import Optional
from bson import ObjectId
from app.database import database
from app.dependencies import get_current_user_optional
from app.models.product import ProductResponse, ProductListResponse, ProductStatus
from app.config import settings
import math
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


def _product_to_response(product: dict, category_name: str = None) -> ProductResponse:
    """Convert MongoDB product document to public response (no stock count)."""
    stock = product.get("stock_count", 0)
    threshold = product.get("low_stock_threshold", 5)

    return ProductResponse(
        id=str(product["_id"]),
        title=product["title"],
        description=product["description"],
        category_id=str(product.get("category_id", "")),
        category_name=category_name,
        images=[
            f"{settings.image_base_url}/{img}" if not img.startswith("http") else img
            for img in product.get("images", [])
        ],
        price=product["price"],
        status=product.get("status", "active"),
        is_low_stock=0 < stock <= threshold,
        in_stock=stock > 0,
        created_at=product["created_at"],
        updated_at=product["updated_at"],
    )


@router.get("", response_model=ProductListResponse)
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("created_at", regex="^(created_at|price|title)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
):
    """
    List active products with pagination, filtering, and search.
    Infinite scroll friendly — returns has_more flag.
    """
    query = {"status": ProductStatus.ACTIVE.value}

    if category:
        query["category_id"] = category

    if search:
        query["$text"] = {"$search": search}

    # Get total count
    total = await database.products.count_documents(query)

    # Sort direction
    sort_dir = 1 if sort_order == "asc" else -1
    sort_field = sort_by

    # Fetch products
    skip = (page - 1) * page_size
    cursor = database.products.find(query).sort(sort_field, sort_dir).skip(skip).limit(page_size)
    products = await cursor.to_list(length=page_size)

    # Resolve category names
    category_ids = set(str(p.get("category_id", "")) for p in products if p.get("category_id"))
    categories = {}
    if category_ids:
        cat_cursor = database.categories.find(
            {"_id": {"$in": [ObjectId(cid) for cid in category_ids if ObjectId.is_valid(cid)]}}
        )
        async for cat in cat_cursor:
            categories[str(cat["_id"])] = cat["name"]

    responses = [
        _product_to_response(p, categories.get(str(p.get("category_id", ""))))
        for p in products
    ]

    return ProductListResponse(
        products=responses,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str):
    """Get a single product by ID."""
    if not ObjectId.is_valid(product_id):
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product ID.")

    product = await database.products.find_one({
        "_id": ObjectId(product_id),
        "status": {"$ne": ProductStatus.INACTIVE.value},
    })

    if not product:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    # Get category name
    category_name = None
    if product.get("category_id") and ObjectId.is_valid(str(product["category_id"])):
        cat = await database.categories.find_one({"_id": ObjectId(str(product["category_id"]))})
        if cat:
            category_name = cat["name"]

    return _product_to_response(product, category_name)
