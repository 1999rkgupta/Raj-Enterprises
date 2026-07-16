"""
Raj Enterprises — Admin Order Management Router

Order lifecycle management, payment recording, invoice generation.
CRITICAL: Stock decrements at 'packed' status, not at placement.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from app.database import database
from app.dependencies import require_admin, audit_log
from app.models.order import (
    OrderStatusUpdate, PaymentRecordRequest,
    OrderStatus, PaymentStatus, ORDER_STATUS_TRANSITIONS,
)
from app.config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


def _compute_payment_status(amount_total: float, amount_received: float) -> str:
    """Auto-compute payment status from amounts."""
    if amount_received <= 0:
        return PaymentStatus.UNPAID.value
    elif amount_received >= amount_total:
        return PaymentStatus.PAID.value
    else:
        return PaymentStatus.PARTIAL.value


@router.get("")
async def list_orders_admin(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    order_status: Optional[str] = None,
    payment_status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    admin: dict = Depends(require_admin),
):
    """List all orders with filters (admin view)."""
    query = {}

    if order_status:
        query["order_status"] = order_status
    if payment_status:
        query["payment_status"] = payment_status

    if date_from or date_to:
        date_query = {}
        if date_from:
            date_query["$gte"] = datetime.fromisoformat(date_from)
        if date_to:
            date_query["$lte"] = datetime.fromisoformat(date_to)
        if date_query:
            query["created_at"] = date_query

    total = await database.orders.count_documents(query)
    skip = (page - 1) * page_size
    orders = await database.orders.find(query).sort("created_at", -1).skip(skip).limit(page_size).to_list(length=page_size)

    results = []
    for order in orders:
        # Resolve user info
        user = await database.users.find_one({"_id": order["user_id"]}) if isinstance(order["user_id"], ObjectId) else None

        # Search filter on customer name
        if search and user:
            if search.lower() not in user["name"].lower() and search.lower() not in order.get("order_number", "").lower():
                continue

        total_amt = order.get("amount_total", 0)
        received = order.get("amount_received", 0)

        results.append({
            "id": str(order["_id"]),
            "order_number": order["order_number"],
            "user_id": str(order["user_id"]),
            "user_name": user["name"] if user else "Unknown",
            "user_mobile": user.get("mobile") if user else None,
            "items": order.get("items", []),
            "delivery_address": order.get("delivery_address", {}),
            "order_status": order["order_status"],
            "payment_status": order["payment_status"],
            "amount_total": total_amt,
            "amount_received": received,
            "amount_due": max(0, total_amt - received),
            "payment_history": order.get("payment_history", []),
            "expected_delivery_date": order.get("expected_delivery_date", "").isoformat() if order.get("expected_delivery_date") else None,
            "invoice_generated": order.get("invoice_generated", False),
            "created_at": order["created_at"].isoformat(),
            "status_history": order.get("status_history", []),
        })

    return {
        "orders": results,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": (page * page_size) < total,
    }


@router.put("/{order_id}/status")
async def update_order_status(
    order_id: str,
    update: OrderStatusUpdate,
    admin: dict = Depends(require_admin),
):
    """
    Update order status through the pipeline.
    CRITICAL: Stock decrements when status changes to 'packed'.
    """
    if not ObjectId.is_valid(order_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid order ID.")

    order = await database.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    current_status = OrderStatus(order["order_status"])
    new_status = update.status

    # Validate status transition
    valid_transitions = ORDER_STATUS_TRANSITIONS.get(current_status, [])
    if new_status not in valid_transitions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from '{current_status.value}' to '{new_status.value}'. "
                   f"Valid transitions: {[s.value for s in valid_transitions]}",
        )

    now = datetime.now(timezone.utc)
    update_fields = {
        "order_status": new_status.value,
    }

    # CRITICAL: Decrement stock when packing
    if new_status == OrderStatus.PACKED:
        for item in order.get("items", []):
            product = await database.products.find_one({"_id": ObjectId(item["product_id"])})
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product '{item['title_snapshot']}' not found.",
                )
            if product.get("stock_count", 0) < item["quantity"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for '{item['title_snapshot']}'. "
                           f"Available: {product.get('stock_count', 0)}, "
                           f"Required: {item['quantity']}",
                )

        # Decrement stock for all items
        for item in order.get("items", []):
            await database.products.update_one(
                {"_id": ObjectId(item["product_id"])},
                {"$inc": {"stock_count": -item["quantity"]}},
            )

            # Auto-update product status if stock reaches 0
            updated_product = await database.products.find_one({"_id": ObjectId(item["product_id"])})
            if updated_product and updated_product.get("stock_count", 0) <= 0:
                await database.products.update_one(
                    {"_id": ObjectId(item["product_id"])},
                    {"$set": {"status": "out_of_stock"}},
                )

    # Restore stock on cancellation if order was already packed
    if new_status == OrderStatus.CANCELLED and current_status in (OrderStatus.PACKED, OrderStatus.DISPATCHED):
        for item in order.get("items", []):
            await database.products.update_one(
                {"_id": ObjectId(item["product_id"])},
                {"$inc": {"stock_count": item["quantity"]}},
            )
            # Restore active status if was out_of_stock
            product = await database.products.find_one({"_id": ObjectId(item["product_id"])})
            if product and product.get("status") == "out_of_stock" and product.get("stock_count", 0) > 0:
                await database.products.update_one(
                    {"_id": ObjectId(item["product_id"])},
                    {"$set": {"status": "active"}},
                )

    # Add to status history
    status_entry = {
        "status": new_status.value,
        "changed_by": str(admin["_id"]),
        "timestamp": now,
        "note": update.note,
    }

    await database.orders.update_one(
        {"_id": ObjectId(order_id)},
        {
            "$set": update_fields,
            "$push": {"status_history": status_entry},
        },
    )

    await audit_log(
        action="update_order_status",
        performed_by=admin["_id"],
        target_type="order",
        target_id=ObjectId(order_id),
        details={
            "from_status": current_status.value,
            "to_status": new_status.value,
            "note": update.note,
        },
    )

    return {
        "message": f"Order status updated to '{new_status.value}'",
        "order_id": order_id,
        "previous_status": current_status.value,
        "new_status": new_status.value,
    }


@router.post("/{order_id}/payment")
async def record_payment(
    order_id: str,
    payment: PaymentRecordRequest,
    admin: dict = Depends(require_admin),
):
    """
    Record a payment against an order.
    Supports partial/multiple payments. Auto-computes payment_status.
    """
    if not ObjectId.is_valid(order_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid order ID.")

    order = await database.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    if order["order_status"] == OrderStatus.CANCELLED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot record payment for a cancelled order.",
        )

    now = datetime.now(timezone.utc)
    new_received = order.get("amount_received", 0) + payment.amount
    new_payment_status = _compute_payment_status(order["amount_total"], new_received)

    payment_entry = {
        "amount": payment.amount,
        "date": now,
        "collected_by": str(admin["_id"]),
        "note": payment.note,
    }

    await database.orders.update_one(
        {"_id": ObjectId(order_id)},
        {
            "$set": {
                "amount_received": new_received,
                "payment_status": new_payment_status,
            },
            "$push": {"payment_history": payment_entry},
        },
    )

    await audit_log(
        action="record_payment",
        performed_by=admin["_id"],
        target_type="order",
        target_id=ObjectId(order_id),
        details={
            "amount": payment.amount,
            "new_total_received": new_received,
            "new_payment_status": new_payment_status,
        },
    )

    return {
        "message": "Payment recorded",
        "amount_recorded": payment.amount,
        "amount_total": order["amount_total"],
        "amount_received": new_received,
        "amount_due": max(0, order["amount_total"] - new_received),
        "payment_status": new_payment_status,
    }


@router.get("/dues")
async def get_dues_dashboard(
    admin: dict = Depends(require_admin),
):
    """
    Dues dashboard: fully paid, partially paid, unpaid customers.
    """
    # Aggregate dues by customer
    pipeline = [
        {"$match": {"payment_status": {"$in": ["unpaid", "partial"]}}},
        {"$group": {
            "_id": "$user_id",
            "total_amount": {"$sum": "$amount_total"},
            "total_received": {"$sum": "$amount_received"},
            "order_count": {"$sum": 1},
        }},
        {"$addFields": {
            "total_due": {"$subtract": ["$total_amount", "$total_received"]},
        }},
        {"$sort": {"total_due": -1}},
    ]

    results = await database.orders.aggregate(pipeline).to_list(length=200)

    customers_with_dues = []
    for r in results:
        user = await database.users.find_one({"_id": r["_id"]})
        customers_with_dues.append({
            "user_id": str(r["_id"]),
            "user_name": user["name"] if user else "Unknown",
            "user_mobile": user.get("mobile") if user else None,
            "total_amount": r["total_amount"],
            "total_received": r["total_received"],
            "total_due": r["total_due"],
            "order_count": r["order_count"],
        })

    # Summary
    total_due = sum(c["total_due"] for c in customers_with_dues)
    unpaid_count = await database.orders.count_documents({"payment_status": "unpaid"})
    partial_count = await database.orders.count_documents({"payment_status": "partial"})
    paid_count = await database.orders.count_documents({"payment_status": "paid"})

    return {
        "summary": {
            "total_due": total_due,
            "unpaid_orders": unpaid_count,
            "partial_orders": partial_count,
            "paid_orders": paid_count,
        },
        "customers_with_dues": customers_with_dues,
    }
