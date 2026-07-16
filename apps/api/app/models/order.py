"""
Raj Enterprises — Order Pydantic Models

Order lifecycle: placed → confirmed → packed → dispatched → delivered (or cancelled at any point).
Stock decrements at 'packed' status, not at placement.
Payment supports partial/multiple payments with auto-computed payment_status.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class OrderStatus(str, Enum):
    PLACED = "placed"
    CONFIRMED = "confirmed"
    PACKED = "packed"
    DISPATCHED = "dispatched"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class PaymentStatus(str, Enum):
    UNPAID = "unpaid"
    PARTIAL = "partial"
    PAID = "paid"


# Valid status transitions — enforced server-side
ORDER_STATUS_TRANSITIONS = {
    OrderStatus.PLACED: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    OrderStatus.CONFIRMED: [OrderStatus.PACKED, OrderStatus.CANCELLED],
    OrderStatus.PACKED: [OrderStatus.DISPATCHED, OrderStatus.CANCELLED],
    OrderStatus.DISPATCHED: [OrderStatus.DELIVERED],
    OrderStatus.DELIVERED: [],  # Terminal state
    OrderStatus.CANCELLED: [],  # Terminal state
}


class OrderItemSnapshot(BaseModel):
    """
    Snapshot of product at time of order.
    Prices are captured at order time to protect against future price changes.
    """
    product_id: str
    title_snapshot: str
    price_snapshot: float
    quantity: int
    subtotal: float = 0.0


class PaymentEntry(BaseModel):
    """Individual payment record against an order."""
    amount: float = Field(..., gt=0)
    date: datetime = Field(default_factory=lambda: datetime.now())
    collected_by: Optional[str] = None  # Admin user_id who recorded the payment
    note: str = ""


class StatusHistoryEntry(BaseModel):
    """Tracks order status changes for audit trail."""
    status: OrderStatus
    changed_by: str  # user_id of who made the change
    timestamp: datetime = Field(default_factory=lambda: datetime.now())
    note: str = ""


class DeliveryAddress(BaseModel):
    """Delivery address snapshot (copied from user's address at checkout time)."""
    full_name: str
    phone: str
    address_line_1: str
    address_line_2: Optional[str] = None
    city: str
    state: str
    pincode: str
    landmark: Optional[str] = None


class OrderCreate(BaseModel):
    """Schema for placing a new order (customer)."""
    address_index: int = Field(default=0, ge=0, description="Index of saved address to use")
    delivery_address: Optional[DeliveryAddress] = None  # Override with a new address
    note: str = ""


class OrderStatusUpdate(BaseModel):
    """Schema for admin updating order status."""
    status: OrderStatus
    note: str = ""


class PaymentRecordRequest(BaseModel):
    """Schema for admin recording a payment."""
    amount: float = Field(..., gt=0)
    note: str = ""


class OrderResponse(BaseModel):
    """Public order response."""
    id: str
    order_number: str
    items: List[OrderItemSnapshot]
    delivery_address: DeliveryAddress
    order_status: OrderStatus
    payment_status: PaymentStatus
    amount_total: float
    amount_received: float
    amount_due: float = 0.0
    expected_delivery_date: Optional[datetime] = None
    invoice_generated: bool = False
    invoice_url: Optional[str] = None
    created_at: datetime
    status_history: List[StatusHistoryEntry] = []


class OrderAdminResponse(OrderResponse):
    """Extended order response for admin views."""
    user_id: str
    user_name: Optional[str] = None
    user_mobile: Optional[str] = None
    payment_history: List[PaymentEntry] = []


class OrderListResponse(BaseModel):
    """Paginated order list."""
    orders: List[OrderResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class OrderAdminListResponse(BaseModel):
    """Paginated order list for admin."""
    orders: List[OrderAdminResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


# --- MongoDB Document Shape ---

class OrderDocument(BaseModel):
    """Internal representation of an order in MongoDB."""
    order_number: str
    user_id: str
    items: List[OrderItemSnapshot]
    delivery_address: DeliveryAddress
    order_status: OrderStatus = OrderStatus.PLACED
    payment_status: PaymentStatus = PaymentStatus.UNPAID
    amount_total: float
    amount_received: float = 0.0
    payment_history: List[PaymentEntry] = []
    expected_delivery_date: Optional[datetime] = None
    invoice_generated: bool = False
    invoice_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    status_history: List[dict] = []
    metadata: dict = {}
