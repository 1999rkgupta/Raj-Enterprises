"""
Raj Enterprises — Wishlist Pydantic Models
"""

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class WishlistToggleRequest(BaseModel):
    """Schema for adding/removing a product from wishlist."""
    product_id: str


class WishlistItemResponse(BaseModel):
    """Wishlist item with product details."""
    product_id: str
    product_title: str
    product_image: Optional[str] = None
    price: float
    in_stock: bool = True
    status: str = "active"


class WishlistResponse(BaseModel):
    """Full wishlist response."""
    id: str
    items: List[WishlistItemResponse] = []
    total_items: int = 0
