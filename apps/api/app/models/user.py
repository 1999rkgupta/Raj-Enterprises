"""
Raj Enterprises — User Pydantic Models

Supports extensible schema design with optional fields and metadata dict.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    CUSTOMER = "customer"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


class Address(BaseModel):
    """Reusable address sub-document. Supports multiple saved addresses."""
    label: str = Field(default="Home", description="Address label (Home, Office, etc.)")
    full_name: str
    phone: str
    address_line_1: str
    address_line_2: Optional[str] = None
    city: str
    state: str
    pincode: str
    landmark: Optional[str] = None
    is_default: bool = False


class UserCreate(BaseModel):
    """Schema for user registration."""
    firebase_uid: str
    name: str = Field(..., min_length=1, max_length=100)
    mobile: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{6,14}$")
    email: Optional[str] = None
    shop_name: Optional[str] = None
    profile_image_url: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        return v.strip()


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[str] = None
    mobile: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{6,14}$")
    shop_name: Optional[str] = None
    profile_image_url: Optional[str] = None
    notification_opt_in: Optional[bool] = None


class AddressUpdate(BaseModel):
    """Schema for adding/updating an address."""
    label: str = "Home"
    full_name: str
    phone: str
    address_line_1: str
    address_line_2: Optional[str] = None
    city: str
    state: str
    pincode: str
    landmark: Optional[str] = None
    is_default: bool = False


class UserResponse(BaseModel):
    """Schema for user response (public-facing)."""
    id: str
    name: str
    mobile: Optional[str] = None
    email: Optional[str] = None
    shop_name: Optional[str] = None
    addresses: List[Address] = []
    role: UserRole
    profile_image_url: Optional[str] = None
    is_active: bool
    notification_opt_in: bool = True
    has_password: bool = False
    created_at: datetime
    updated_at: datetime

    @field_validator("mobile", mode="before")
    @classmethod
    def coerce_mobile_to_string(cls, v):
        if v is not None and not isinstance(v, str):
            return str(v)
        return v


class UserAdminResponse(UserResponse):
    """Extended user response for admin views."""
    firebase_uid: str
    last_active_at: Optional[datetime] = None
    metadata: dict = {}


class AdminCreateRequest(BaseModel):
    """Schema for creating an admin user (super_admin only)."""
    firebase_uid: str
    name: str
    email: Optional[str] = None
    mobile: Optional[str] = None


# --- MongoDB Document Shape ---
# This represents the full document stored in MongoDB.
# Used internally, not exposed via API directly.

class UserDocument(BaseModel):
    """Internal representation of a user document in MongoDB."""
    firebase_uid: str
    name: str
    mobile: Optional[str] = None
    email: Optional[str] = None
    shop_name: Optional[str] = None
    addresses: List[Address] = []
    role: UserRole = UserRole.CUSTOMER
    profile_image_url: Optional[str] = None
    is_active: bool = True
    notification_opt_in: bool = True
    has_password: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    updated_at: datetime = Field(default_factory=lambda: datetime.now())
    last_active_at: datetime = Field(default_factory=lambda: datetime.now())
    metadata: dict = {}
