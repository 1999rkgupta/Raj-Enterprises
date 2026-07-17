"""
Raj Enterprises — Admin Product Management Router

Full CRUD for products. Soft delete via status change.
Multi-image upload support.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query, UploadFile, File
from datetime import datetime, timezone
from typing import Optional, List
from bson import ObjectId
from app.database import database
from app.dependencies import require_admin, audit_log
from app.models.product import (
    ProductCreate, ProductUpdate, ProductAdminResponse,
    ProductAdminListResponse, ProductStatus,
)
from app.models.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.config import settings
import os
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=ProductAdminListResponse)
async def list_products_admin(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    product_status: Optional[str] = None,
    admin: dict = Depends(require_admin),
):
    """List all products (including inactive) for admin management."""
    query = {}
    if product_status:
        query["status"] = product_status
    if category:
        query["category_id"] = category
    if search:
        query["$text"] = {"$search": search}

    total = await database.products.count_documents(query)
    skip = (page - 1) * page_size
    products = await database.products.find(query).sort("created_at", -1).skip(skip).limit(page_size).to_list(length=page_size)

    responses = []
    for p in products:
        stock = p.get("stock_count", 0)
        threshold = p.get("low_stock_threshold", 5)
        cat_name = None
        if p.get("category_id") and ObjectId.is_valid(str(p["category_id"])):
            cat = await database.categories.find_one({"_id": ObjectId(str(p["category_id"]))})
            if cat:
                cat_name = cat["name"]

        responses.append(ProductAdminResponse(
            id=str(p["_id"]),
            title=p["title"],
            description=p["description"],
            category_id=str(p.get("category_id", "")),
            category_name=cat_name,
            images=[
                f"{settings.image_base_url}/{img}" if not img.startswith("http") else img
                for img in p.get("images", [])
            ],
            price=p["price"],
            status=p.get("status", "active"),
            is_low_stock=0 < stock <= threshold,
            in_stock=stock > 0,
            stock_count=stock,
            sku=p.get("sku", ""),
            low_stock_threshold=threshold,
            created_at=p["created_at"],
            updated_at=p["updated_at"],
            metadata=p.get("metadata", {}),
        ))

    return ProductAdminListResponse(
        products=responses,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_product(
    product: ProductCreate,
    admin: dict = Depends(require_admin),
):
    """Create a new product."""
    # Check SKU uniqueness
    existing = await database.products.find_one({"sku": product.sku})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A product with SKU '{product.sku}' already exists.",
        )

    # Verify category exists
    if not ObjectId.is_valid(product.category_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category ID.")

    category = await database.categories.find_one({"_id": ObjectId(product.category_id)})
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

    now = datetime.now(timezone.utc)
    doc = {
        "title": product.title,
        "description": product.description,
        "category_id": product.category_id,
        "images": product.images,
        "price": product.price,
        "stock_count": product.stock_count,
        "sku": product.sku,
        "status": ProductStatus.ACTIVE.value,
        "low_stock_threshold": product.low_stock_threshold,
        "created_at": now,
        "updated_at": now,
        "metadata": {},
    }

    result = await database.products.insert_one(doc)

    await audit_log(
        action="create_product",
        performed_by=admin["_id"],
        target_type="product",
        target_id=result.inserted_id,
        details={"title": product.title, "sku": product.sku},
    )

    return {"message": "Product created", "product_id": str(result.inserted_id)}


@router.put("/{product_id}")
async def update_product(
    product_id: str,
    update: ProductUpdate,
    admin: dict = Depends(require_admin),
):
    """Update an existing product."""
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product ID.")

    product = await database.products.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    update_fields = {k: v for k, v in update.model_dump(exclude_unset=True).items() if v is not None}
    if not update_fields:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update.")

    # SKU uniqueness check if SKU is being updated
    if "sku" in update_fields:
        existing = await database.products.find_one({
            "sku": update_fields["sku"],
            "_id": {"$ne": ObjectId(product_id)},
        })
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"SKU '{update_fields['sku']}' is already in use.",
            )

    update_fields["updated_at"] = datetime.now(timezone.utc)

    await database.products.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": update_fields},
    )

    await audit_log(
        action="update_product",
        performed_by=admin["_id"],
        target_type="product",
        target_id=ObjectId(product_id),
        details={"updated_fields": list(update_fields.keys())},
    )

    return {"message": "Product updated"}


@router.put("/{product_id}/mark-inactive")
async def mark_product_inactive(
    product_id: str,
    admin: dict = Depends(require_admin),
):
    """Mark a product as inactive (soft delete)."""
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product ID.")

    await database.products.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": {"status": "inactive", "updated_at": datetime.now(timezone.utc)}},
    )

    await audit_log(
        action="mark_product_inactive",
        performed_by=admin["_id"],
        target_type="product",
        target_id=ObjectId(product_id),
    )

    return {"message": "Product marked as inactive"}


@router.put("/{product_id}/mark-out-of-stock")
async def mark_product_out_of_stock(
    product_id: str,
    admin: dict = Depends(require_admin),
):
    """Mark a product as out of stock."""
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product ID.")

    await database.products.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": {
            "status": "out_of_stock",
            "stock_count": 0,
            "updated_at": datetime.now(timezone.utc),
        }},
    )

    await audit_log(
        action="mark_product_out_of_stock",
        performed_by=admin["_id"],
        target_type="product",
        target_id=ObjectId(product_id),
    )

    return {"message": "Product marked as out of stock"}


@router.post("/upload-image")
async def upload_product_image(
    file: UploadFile = File(...),
    admin: dict = Depends(require_admin),
):
    """Upload a product image. Returns the path or secure Cloudinary CDN URL."""
    # Validate file type
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
                return {
                    "filename": file.filename or "uploaded_file",
                    "relative_path": secure_url,
                    "full_url": secure_url,
                }
        except Exception as ex:
            logger.error(f"Cloudinary upload error, falling back to local storage: {ex}")

    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(settings.image_upload_dir, "products", filename)

    # Ensure directory exists
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    # Save file locally
    with open(filepath, "wb") as f:
        f.write(contents)

    relative_path = f"products/{filename}"

    return {
        "filename": filename,
        "relative_path": relative_path,
        "full_url": f"{settings.image_base_url}/{relative_path}",
    }


# --- Category management (also admin-only) ---

@router.post("/categories", status_code=status.HTTP_201_CREATED)
async def create_category(
    category: CategoryCreate,
    admin: dict = Depends(require_admin),
):
    """Create a new product category."""
    existing = await database.categories.find_one({"name": category.name})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Category '{category.name}' already exists.",
        )

    doc = {
        "name": category.name,
        "parent_id": ObjectId(category.parent_id) if category.parent_id else None,
        "is_active": True,
    }

    result = await database.categories.insert_one(doc)

    await audit_log(
        action="create_category",
        performed_by=admin["_id"],
        target_type="category",
        target_id=result.inserted_id,
        details={"name": category.name},
    )

    return {"message": "Category created", "category_id": str(result.inserted_id)}


@router.put("/categories/{category_id}")
async def update_category(
    category_id: str,
    update: CategoryUpdate,
    admin: dict = Depends(require_admin),
):
    """Update a category."""
    if not ObjectId.is_valid(category_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category ID.")

    update_fields = {k: v for k, v in update.model_dump(exclude_unset=True).items() if v is not None}
    if not update_fields:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update.")

    await database.categories.update_one(
        {"_id": ObjectId(category_id)},
        {"$set": update_fields},
    )

    return {"message": "Category updated"}
