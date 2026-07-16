"""
Raj Enterprises — Category Pydantic Models

Supports hierarchical categories via parent_id.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CategoryCreate(BaseModel):
    """Schema for creating a category (admin only)."""
    name: str = Field(..., min_length=1, max_length=100)
    parent_id: Optional[str] = None  # For subcategories


class CategoryUpdate(BaseModel):
    """Schema for updating a category."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    parent_id: Optional[str] = None
    is_active: Optional[bool] = None


class CategoryResponse(BaseModel):
    """Public category response."""
    id: str
    name: str
    parent_id: Optional[str] = None
    is_active: bool = True
    subcategories: List["CategoryResponse"] = []


class CategoryListResponse(BaseModel):
    """List of categories (flat or tree)."""
    categories: List[CategoryResponse]
    total: int
