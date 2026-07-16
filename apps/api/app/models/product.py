"""
Raj Enterprises — Product Pydantic Models

Extensible product schema with metadata escape hatch.
Images stored as relative paths, resolved via IMAGE_BASE_URL.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum


class ProductStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    OUT_OF_STOCK = "out_of_stock"


class ProductCreate(BaseModel):
    """Schema for creating a product (admin only)."""
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=5000)
    category_id: str
    images: List[str] = Field(default=[], max_length=10)
    price: float = Field(..., gt=0)
    stock_count: int = Field(..., ge=0)
    sku: str = Field(..., min_length=1, max_length=50)
    low_stock_threshold: int = Field(default=5, ge=0)

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        return v.strip()

    @field_validator("sku")
    @classmethod
    def validate_sku(cls, v: str) -> str:
        return v.strip().upper()


class ProductUpdate(BaseModel):
    """Schema for updating a product (admin only)."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1, max_length=5000)
    category_id: Optional[str] = None
    images: Optional[List[str]] = None
    price: Optional[float] = Field(None, gt=0)
    stock_count: Optional[int] = Field(None, ge=0)
    sku: Optional[str] = Field(None, min_length=1, max_length=50)
    low_stock_threshold: Optional[int] = Field(None, ge=0)
    status: Optional[ProductStatus] = None


class ProductResponse(BaseModel):
    """Public product response — note: stock_count is NOT exposed to customers."""
    id: str
    title: str
    description: str
    category_id: str
    category_name: Optional[str] = None  # Populated via lookup
    images: List[str] = []
    price: float
    status: ProductStatus
    is_low_stock: bool = False  # Derived from stock_count vs threshold
    in_stock: bool = True  # Derived from stock_count > 0
    created_at: datetime
    updated_at: datetime


class ProductAdminResponse(ProductResponse):
    """Admin product response — includes stock_count and internal fields."""
    stock_count: int
    sku: str
    low_stock_threshold: int
    metadata: dict = {}


class ProductListResponse(BaseModel):
    """Paginated product list response."""
    products: List[ProductResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class ProductAdminListResponse(BaseModel):
    """Paginated product list for admin."""
    products: List[ProductAdminResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


# --- MongoDB Document Shape ---

class ProductDocument(BaseModel):
    """Internal representation of a product document in MongoDB."""
    title: str
    description: str
    category_id: str
    images: List[str] = []
    price: float
    stock_count: int
    sku: str
    status: ProductStatus = ProductStatus.ACTIVE
    low_stock_threshold: int = 5
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    updated_at: datetime = Field(default_factory=lambda: datetime.now())
    metadata: dict = {}
