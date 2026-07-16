"""
Raj Enterprises — Admin Dashboard Router

Sales summary, pending dues, low-stock alerts.
"""

from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
from app.database import database
from app.dependencies import require_admin
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/summary")
async def get_dashboard_summary(admin: dict = Depends(require_admin)):
    """Get dashboard summary: sales, dues, low-stock, recent orders."""

    # Total sales (delivered orders)
    pipeline_sales = [
        {"$match": {"order_status": "delivered"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_total"}, "count": {"$sum": 1}}},
    ]
    sales_result = await database.orders.aggregate(pipeline_sales).to_list(length=1)
    total_sales = sales_result[0]["total"] if sales_result else 0
    total_orders_delivered = sales_result[0]["count"] if sales_result else 0

    # Pending dues (unpaid + partial)
    pipeline_dues = [
        {"$match": {"payment_status": {"$in": ["unpaid", "partial"]}}},
        {"$group": {
            "_id": None,
            "total_due": {"$sum": {"$subtract": ["$amount_total", "$amount_received"]}},
            "count": {"$sum": 1},
        }},
    ]
    dues_result = await database.orders.aggregate(pipeline_dues).to_list(length=1)
    total_dues = dues_result[0]["total_due"] if dues_result else 0
    pending_orders_count = dues_result[0]["count"] if dues_result else 0

    # Low stock products
    low_stock_products = await database.products.find({
        "status": "active",
        "$expr": {"$lte": ["$stock_count", "$low_stock_threshold"]},
    }).to_list(length=20)

    low_stock_list = [
        {
            "id": str(p["_id"]),
            "title": p["title"],
            "stock_count": p["stock_count"],
            "threshold": p.get("low_stock_threshold", 5),
        }
        for p in low_stock_products
    ]

    # Recent orders (last 10)
    recent_orders = await database.orders.find().sort("created_at", -1).to_list(length=10)
    recent_list = []
    for order in recent_orders:
        user = await database.users.find_one({"_id": order["user_id"]})
        recent_list.append({
            "id": str(order["_id"]),
            "order_number": order["order_number"],
            "customer_name": user["name"] if user else "Unknown",
            "amount_total": order["amount_total"],
            "order_status": order["order_status"],
            "payment_status": order["payment_status"],
            "created_at": order["created_at"].isoformat(),
        })

    # Counts
    total_customers = await database.users.count_documents({"role": "customer", "is_active": True})
    total_products = await database.products.count_documents({"status": "active"})
    total_orders = await database.orders.count_documents({})

    # Today's sales
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    pipeline_today = [
        {"$match": {"created_at": {"$gte": today_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_total"}, "count": {"$sum": 1}}},
    ]
    today_result = await database.orders.aggregate(pipeline_today).to_list(length=1)
    today_sales = today_result[0]["total"] if today_result else 0
    today_orders = today_result[0]["count"] if today_result else 0

    return {
        "total_sales": total_sales,
        "total_orders_delivered": total_orders_delivered,
        "total_dues": total_dues,
        "pending_orders_count": pending_orders_count,
        "low_stock_products": low_stock_list,
        "low_stock_count": len(low_stock_list),
        "recent_orders": recent_list,
        "total_customers": total_customers,
        "total_products": total_products,
        "total_orders": total_orders,
        "today_sales": today_sales,
        "today_orders": today_orders,
    }
