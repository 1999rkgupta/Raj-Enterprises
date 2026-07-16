"""
Raj Enterprises — Cart Pydantic Models

Server-side cart for logged-in users.
Guest cart handled client-side via IndexedDB.
Merge strategy: sum quantities, capped at available stock.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class CartItem(BaseModel):
    """Single item in the cart."""
    product_id: str
    quantity: int = Field(..., ge=1)
    selected: bool = True  # For partial checkout


class CartItemAdd(BaseModel):
    """Schema for adding item to cart."""
    product_id: str
    quantity: int = Field(default=1, ge=1)


class CartItemUpdate(BaseModel):
    """Schema for updating cart item quantity or selection."""
    quantity: Optional[int] = Field(None, ge=0)  # 0 = remove item
    selected: Optional[bool] = None


class CartMergeRequest(BaseModel):
    """
    Schema for merging guest cart into server cart on login.
    DECISION: Sum quantities, capped at available stock.
    """
    items: List[CartItem]


class CartItemResponse(BaseModel):
    """Cart item with product details populated."""
    product_id: str
    product_title: str
    product_image: Optional[str] = None
    price: float
    quantity: int
    selected: bool
    in_stock: bool = True
    max_quantity: int = 0  # Available stock (for capping)
    subtotal: float = 0.0


class CartResponse(BaseModel):
    """Full cart response with computed totals."""
    id: str
    items: List[CartItemResponse] = []
    total_items: int = 0
    selected_items_count: int = 0
    subtotal: float = 0.0  # Sum of selected items
    updated_at: datetime
