"""
Raj Enterprises — Categories Router

Public category listing with hierarchy support.
"""

from fastapi import APIRouter, HTTPException, status
from bson import ObjectId
from app.database import database
from app.models.category import CategoryResponse, CategoryListResponse
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=CategoryListResponse)
async def list_categories():
    """List all active categories with subcategory hierarchy."""
    categories = await database.categories.find({"is_active": True}).to_list(length=200)

    # Build tree structure
    cat_map = {}
    roots = []

    for cat in categories:
        cat_resp = CategoryResponse(
            id=str(cat["_id"]),
            name=cat["name"],
            parent_id=str(cat["parent_id"]) if cat.get("parent_id") else None,
            is_active=cat.get("is_active", True),
            subcategories=[],
        )
        cat_map[str(cat["_id"])] = cat_resp

    # Link children to parents
    for cat_id, cat_resp in cat_map.items():
        if cat_resp.parent_id and cat_resp.parent_id in cat_map:
            cat_map[cat_resp.parent_id].subcategories.append(cat_resp)
        else:
            roots.append(cat_resp)

    return CategoryListResponse(categories=roots, total=len(categories))


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(category_id: str):
    """Get a single category by ID."""
    if not ObjectId.is_valid(category_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category ID.")

    cat = await database.categories.find_one({"_id": ObjectId(category_id), "is_active": True})
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

    # Get subcategories
    subcats = await database.categories.find(
        {"parent_id": ObjectId(category_id), "is_active": True}
    ).to_list(length=100)

    return CategoryResponse(
        id=str(cat["_id"]),
        name=cat["name"],
        parent_id=str(cat["parent_id"]) if cat.get("parent_id") else None,
        is_active=True,
        subcategories=[
            CategoryResponse(
                id=str(s["_id"]),
                name=s["name"],
                parent_id=str(s.get("parent_id")),
                is_active=True,
            )
            for s in subcats
        ],
    )
