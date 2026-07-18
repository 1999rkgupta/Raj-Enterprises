"""
Raj Enterprises — Orders Router (Customer-facing)

Customer order placement and history viewing.
Stock is NOT decremented at order placement — only when admin marks 'packed'.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from datetime import datetime, timezone, timedelta
from typing import Optional
from bson import ObjectId
from app.database import database
from app.dependencies import get_current_user
from app.models.order import (
    OrderCreate, OrderResponse, OrderListResponse,
    OrderItemSnapshot, OrderStatus, PaymentStatus,
    DeliveryAddress, StatusHistoryEntry,
)
from app.config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


async def _generate_order_number() -> str:
    """Generate a sequential, human-readable order number."""
    # Format: RE-YYYYMM-XXXXX (e.g., RE-202607-00001)
    now = datetime.now(timezone.utc)
    prefix = f"RE-{now.strftime('%Y%m')}-"

    # Find the latest order number for this month
    latest = await database.orders.find_one(
        {"order_number": {"$regex": f"^{prefix}"}},
        sort=[("order_number", -1)],
    )

    if latest:
        last_num = int(latest["order_number"].split("-")[-1])
        next_num = last_num + 1
    else:
        next_num = 1

    return f"{prefix}{next_num:05d}"


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def place_order(
    order_data: OrderCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Place a new order from selected cart items.
    COD only. Payment gateway integration deferred.
    DECISION: Stock is NOT decremented here — decremented at 'packed' status.
    """
    user_id = current_user["_id"]

    # Get cart
    cart = await database.carts.find_one({"user_id": user_id})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty.")

    # Get selected items only
    selected_items = [i for i in cart["items"] if i.get("selected", True)]
    if not selected_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No items selected for checkout.",
        )

    # Resolve delivery address
    if order_data.delivery_address:
        delivery_addr = order_data.delivery_address.model_dump()
    else:
        addresses = current_user.get("addresses", [])
        if not addresses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No delivery address available. Add an address first.",
            )
        addr_idx = min(order_data.address_index, len(addresses) - 1)
        addr = addresses[addr_idx]
        delivery_addr = {
            "full_name": addr.get("full_name", current_user["name"]),
            "phone": addr.get("phone", current_user.get("mobile", "")),
            "address_line_1": addr["address_line_1"],
            "address_line_2": addr.get("address_line_2"),
            "city": addr["city"],
            "state": addr["state"],
            "pincode": addr["pincode"],
            "landmark": addr.get("landmark"),
        }

    # Build order items with price snapshots
    order_items = []
    amount_total = 0.0

    for cart_item in selected_items:
        product = await database.products.find_one({"_id": ObjectId(cart_item["product_id"])})
        if not product:
            continue

        if product.get("stock_count", 0) < cart_item["quantity"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for '{product['title']}'. "
                       f"Available: {product.get('stock_count', 0)}, Requested: {cart_item['quantity']}",
            )

        subtotal = product["price"] * cart_item["quantity"]
        order_items.append({
            "product_id": str(product["_id"]),
            "title_snapshot": product["title"],
            "price_snapshot": product["price"],
            "quantity": cart_item["quantity"],
            "subtotal": subtotal,
        })
        amount_total += subtotal

    if not order_items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid items to order.")

    # Generate order number
    order_number = await _generate_order_number()
    now = datetime.now(timezone.utc)

    # Create order document
    order_doc = {
        "order_number": order_number,
        "user_id": user_id,
        "items": order_items,
        "delivery_address": delivery_addr,
        "order_status": OrderStatus.PLACED.value,
        "payment_status": PaymentStatus.UNPAID.value,
        "amount_total": amount_total,
        "amount_received": 0.0,
        "payment_history": [],
        "expected_delivery_date": now + timedelta(days=settings.default_delivery_days),
        "invoice_generated": False,
        "invoice_url": None,
        "created_at": now,
        "status_history": [{
            "status": OrderStatus.PLACED.value,
            "changed_by": str(user_id),
            "timestamp": now,
            "note": "Order placed by customer",
        }],
        "metadata": {},
    }

    result = await database.orders.insert_one(order_doc)

    # Remove ordered items from cart
    remaining_items = [i for i in cart["items"] if not i.get("selected", True)]
    await database.carts.update_one(
        {"_id": cart["_id"]},
        {"$set": {"items": remaining_items, "updated_at": now}},
    )

    logger.info(f"Order {order_number} placed by user {user_id}")

    return OrderResponse(
        id=str(result.inserted_id),
        order_number=order_number,
        items=[OrderItemSnapshot(**item) for item in order_items],
        delivery_address=DeliveryAddress(**delivery_addr),
        order_status=OrderStatus.PLACED,
        payment_status=PaymentStatus.UNPAID,
        amount_total=amount_total,
        amount_received=0.0,
        amount_due=amount_total,
        expected_delivery_date=order_doc["expected_delivery_date"],
        invoice_generated=False,
        created_at=now,
        status_history=[],
    )


@router.get("", response_model=OrderListResponse)
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    month: Optional[int] = None,
    year: Optional[int] = None,
    order_status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """List the current user's orders with filters."""
    query = {"user_id": current_user["_id"]}

    if order_status:
        query["order_status"] = order_status

    if month and year:
        start_date = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
        query["created_at"] = {"$gte": start_date, "$lt": end_date}
    elif year:
        query["created_at"] = {
            "$gte": datetime(year, 1, 1, tzinfo=timezone.utc),
            "$lt": datetime(year + 1, 1, 1, tzinfo=timezone.utc),
        }

    total = await database.orders.count_documents(query)
    skip = (page - 1) * page_size
    orders = await database.orders.find(query).sort("created_at", -1).skip(skip).limit(page_size).to_list(length=page_size)

    responses = []
    for order in orders:
        total_amt = order.get("amount_total", 0)
        received = order.get("amount_received", 0)
        responses.append(OrderResponse(
            id=str(order["_id"]),
            order_number=order["order_number"],
            items=[OrderItemSnapshot(**item) for item in order.get("items", [])],
            delivery_address=DeliveryAddress(**order["delivery_address"]),
            order_status=order["order_status"],
            payment_status=order["payment_status"],
            amount_total=total_amt,
            amount_received=received,
            amount_due=max(0, total_amt - received),
            expected_delivery_date=order.get("expected_delivery_date"),
            invoice_generated=order.get("invoice_generated", False),
            invoice_url=order.get("invoice_url"),
            created_at=order["created_at"],
            status_history=[
                StatusHistoryEntry(**sh) for sh in order.get("status_history", [])
            ],
        ))

    return OrderListResponse(
        orders=responses,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a single order by ID (must belong to the current user)."""
    if not ObjectId.is_valid(order_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid order ID.")

    order = await database.orders.find_one({
        "_id": ObjectId(order_id),
        "user_id": current_user["_id"],
    })
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    total_amt = order.get("amount_total", 0)
    received = order.get("amount_received", 0)

    return OrderResponse(
        id=str(order["_id"]),
        order_number=order["order_number"],
        items=[OrderItemSnapshot(**item) for item in order.get("items", [])],
        delivery_address=DeliveryAddress(**order["delivery_address"]),
        order_status=order["order_status"],
        payment_status=order["payment_status"],
        amount_total=total_amt,
        amount_received=received,
        amount_due=max(0, total_amt - received),
        expected_delivery_date=order.get("expected_delivery_date"),
        invoice_generated=order.get("invoice_generated", False),
        invoice_url=order.get("invoice_url"),
        created_at=order["created_at"],
        status_history=[
            StatusHistoryEntry(**sh) for sh in order.get("status_history", [])
        ],
    )


from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from fastapi.responses import StreamingResponse
import io

@router.get("/{order_id}/invoice")
async def download_invoice(
    order_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate and stream an invoice PDF for the order.
    Uses reportlab to generate the layout on-demand.
    """
    if not ObjectId.is_valid(order_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid order ID.")

    query = {"_id": ObjectId(order_id)}
    if current_user.get("role") not in ("admin", "super_admin"):
        query["user_id"] = current_user["_id"]

    order = await database.orders.find_one(query)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    if current_user.get("role") not in ("admin", "super_admin") and order.get("order_status") != "delivered":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invoices can only be downloaded once the order has been delivered."
        )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=15,
        alignment=1  # Centered
    )
    section_style = ParagraphStyle(
        'SectionStyle',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=11,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'BodyStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155")
    )

    # 1. Company Header Details
    company_data = [
        [
            Paragraph(f"<strong>{settings.company_name}</strong><br/>{settings.company_address}<br/>GST: {settings.company_gst}", body_style),
            Paragraph(f"Email: {settings.company_email}<br/>Phone: {settings.company_phone}", body_style)
        ]
    ]
    company_table = Table(company_data, colWidths=[270, 270])
    company_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (0,-1), 'LEFT'),
        ('ALIGN', (1,0), (1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(company_table)
    story.append(Spacer(1, 10))

    # Divider line
    divider = Table([[""]], colWidths=[540])
    divider.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 1.5, colors.HexColor("#0F172A")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(divider)
    story.append(Spacer(1, 10))

    # 2. Document Title
    story.append(Paragraph("INVOICE", title_style))

    # 3. Header Grid (Order Info & Bill To)
    addr = order["delivery_address"]
    addr_line_2 = f", {addr['address_line_2']}" if addr.get("address_line_2") else ""
    landmark = f" (Landmark: {addr['landmark']})" if addr.get("landmark") else ""
    full_address = f"{addr['address_line_1']}{addr_line_2}, {addr['city']}, {addr['state']} - {addr['pincode']}{landmark}"

    header_data = [
        [Paragraph("<strong>Invoice Details</strong>", section_style), Paragraph("<strong>Bill To</strong>", section_style)],
        [
            Paragraph(f"Order Number: {order['order_number']}<br/>Date: {order['created_at'].strftime('%Y-%m-%d %H:%M')}<br/>Status: {order['order_status'].upper()}<br/>Payment: {order['payment_status'].upper()}", body_style),
            Paragraph(f"{addr['full_name']}<br/>{full_address}<br/>Phone: {addr['phone']}", body_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[270, 270])
    header_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 20))

    # 4. Items Table
    story.append(Paragraph("<strong>Purchased Items</strong>", section_style))
    table_data = [["SKU", "Item Description", "Qty", "Unit Price", "Subtotal"]]
    
    for item in order["items"]:
        # Find SKU from product if not snapshotted, otherwise use fallback
        sku = "RE-PAINT"
        product = await database.products.find_one({"_id": ObjectId(item["product_id"])})
        if product:
            sku = product.get("sku", sku)

        table_data.append([
            sku,
            item["title_snapshot"],
            str(item["quantity"]),
            f"INR {item['price_snapshot']:.2f}",
            f"INR {item['subtotal']:.2f}"
        ])

    # Totals Row
    table_data.append(["", "", "", "Total Amount:", f"INR {order['amount_total']:.2f}"])
    table_data.append(["", "", "", "Amount Received:", f"INR {order.get('amount_received', 0.0):.2f}"])
    table_data.append(["", "", "", "Balance Due:", f"INR {max(0.0, order['amount_total'] - order.get('amount_received', 0.0)):.2f}"])

    items_table = Table(table_data, colWidths=[100, 200, 40, 100, 100])
    
    # Dynamic table styling with zebra striping
    items_table_style = [
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0F172A")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('ALIGN', (2,1), (-1,-1), 'RIGHT'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
    ]
    
    # Zebra striping for item rows (excluding headers and totals)
    for i in range(1, len(table_data) - 3):
        if i % 2 == 0:
            items_table_style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor("#F8FAFC")))

    # Lines and fonts config
    items_table_style.extend([
        ('LINEBELOW', (0,0), (-1,-4), 0.5, colors.HexColor("#E2E8F0")),
        ('LINEBELOW', (-2,-3), (-1,-1), 1, colors.HexColor("#0F172A")),
        ('FONTNAME', (-2,-3), (-1,-1), 'Helvetica-Bold'),
    ])

    items_table.setStyle(TableStyle(items_table_style))
    story.append(items_table)

    # Build PDF
    doc.build(story)
    buffer.seek(0)

    filename = f"invoice_{order['order_number']}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
