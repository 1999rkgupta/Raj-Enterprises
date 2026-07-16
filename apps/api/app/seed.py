"""
Raj Enterprises — Database Seed Script

Creates sample categories, 15-20 products with placeholder images,
and one seeded super_admin account.

Run: python -m app.seed
"""

import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Seed Data ---

CATEGORIES = [
    {"name": "Interior Paints", "parent_id": None},
    {"name": "Exterior Paints", "parent_id": None},
    {"name": "Wood Finishes", "parent_id": None},
    {"name": "Primers & Sealers", "parent_id": None},
    {"name": "Hardware & Tools", "parent_id": None},
    {"name": "Adhesives & Putty", "parent_id": None},
]

PRODUCTS = [
    # Interior Paints
    {"title": "Royal Silk Emulsion - White", "description": "Premium interior wall emulsion with silk-like smooth finish. Washable, low VOC formula with excellent coverage. Ideal for living rooms and bedrooms.", "category": "Interior Paints", "price": 450.00, "stock": 120, "sku": "RE-INT-001"},
    {"title": "Royal Silk Emulsion - Ivory", "description": "Warm ivory shade interior emulsion with luxurious silk finish. Stain-resistant and easy to maintain. Perfect for creating warm, inviting spaces.", "category": "Interior Paints", "price": 450.00, "stock": 95, "sku": "RE-INT-002"},
    {"title": "Premium Acrylic Distemper", "description": "Economy interior wall paint with good coverage and smooth matte finish. Available in multiple shades. Ideal for budget-friendly renovations.", "category": "Interior Paints", "price": 280.00, "stock": 200, "sku": "RE-INT-003"},
    {"title": "Luxury Matt Finish - Pearl Grey", "description": "Ultra-premium matte finish paint with advanced stain-guard technology. Fingerprint resistant, ideal for high-traffic areas.", "category": "Interior Paints", "price": 650.00, "stock": 60, "sku": "RE-INT-004"},

    # Exterior Paints
    {"title": "WeatherShield Exterior Emulsion - White", "description": "All-weather exterior paint with anti-algal and anti-fungal properties. UV resistant with 7-year durability guarantee.", "category": "Exterior Paints", "price": 580.00, "stock": 85, "sku": "RE-EXT-001"},
    {"title": "WeatherShield Exterior Emulsion - Cream", "description": "Durable cream shade exterior paint with advanced water-beading technology. Resists peeling and cracking in extreme weather.", "category": "Exterior Paints", "price": 580.00, "stock": 70, "sku": "RE-EXT-002"},
    {"title": "Apex Ultima Textured Paint", "description": "Textured exterior wall paint with sand-like finish. Hides surface imperfections and provides unique architectural appeal.", "category": "Exterior Paints", "price": 720.00, "stock": 45, "sku": "RE-EXT-003"},

    # Wood Finishes
    {"title": "Premium Wood Stain - Walnut", "description": "Rich walnut wood stain that enhances natural grain patterns. Oil-based formula for deep penetration and lasting protection.", "category": "Wood Finishes", "price": 380.00, "stock": 55, "sku": "RE-WD-001"},
    {"title": "Marine Grade Wood Varnish", "description": "High-gloss polyurethane varnish suitable for interior and exterior wood. Excellent water and scratch resistance.", "category": "Wood Finishes", "price": 520.00, "stock": 40, "sku": "RE-WD-002"},
    {"title": "Wood Primer - Universal", "description": "Multi-surface wood primer compatible with all topcoats. Seals porous wood and provides excellent adhesion base.", "category": "Wood Finishes", "price": 310.00, "stock": 75, "sku": "RE-WD-003"},

    # Primers & Sealers
    {"title": "Wall Primer - Water Based", "description": "Quick-drying water-based wall primer for interior surfaces. Low odor formula, ready to topcoat in 4 hours.", "category": "Primers & Sealers", "price": 220.00, "stock": 150, "sku": "RE-PR-001"},
    {"title": "Metal Primer - Anti-Rust Red Oxide", "description": "Heavy-duty red oxide metal primer with superior rust prevention. Ideal for gates, grills, and structural steel.", "category": "Primers & Sealers", "price": 340.00, "stock": 90, "sku": "RE-PR-002"},

    # Hardware & Tools
    {"title": "Professional Paint Roller Set (9 inch)", "description": "Complete paint roller set including frame, 3 roller covers (smooth, textured, gloss), extension pole, and tray.", "category": "Hardware & Tools", "price": 185.00, "stock": 200, "sku": "RE-HW-001"},
    {"title": "Paint Brush Set - 5 Piece", "description": "Professional grade synthetic bristle paint brushes. Includes 1\", 2\", 3\", 4\" flat and 2\" angled brushes.", "category": "Hardware & Tools", "price": 120.00, "stock": 180, "sku": "RE-HW-002"},
    {"title": "Masking Tape - 2 inch (50m Roll)", "description": "High-quality painter's masking tape for clean, sharp paint lines. Easy removal without residue for up to 14 days.", "category": "Hardware & Tools", "price": 65.00, "stock": 3, "sku": "RE-HW-003"},

    # Adhesives & Putty
    {"title": "Wall Putty - White Cement Based (5kg)", "description": "Premium white cement-based wall putty for smooth finishing. Excellent adhesion and crack-bridging properties.", "category": "Adhesives & Putty", "price": 180.00, "stock": 130, "sku": "RE-AP-001"},
    {"title": "Acrylic Wall Putty (1kg)", "description": "Ready-to-use acrylic wall putty for minor repairs and filling. Sets in 30 minutes, sandable in 2 hours.", "category": "Adhesives & Putty", "price": 95.00, "stock": 220, "sku": "RE-AP-002"},
    {"title": "Construction Adhesive - Heavy Duty", "description": "Industrial strength construction adhesive for bonding wood, metal, concrete, and ceramics. Waterproof and heat resistant.", "category": "Adhesives & Putty", "price": 250.00, "stock": 80, "sku": "RE-AP-003"},
]

SUPER_ADMIN = {
    "firebase_uid": "SEED_SUPER_ADMIN_UID",
    "name": "Raj Admin",
    "mobile": "+919999999999",
    "email": "admin@rajenterprises.com",
    "shop_name": "Raj Enterprises HQ",
    "addresses": [{
        "label": "Office",
        "full_name": "Raj Admin",
        "phone": "+919999999999",
        "address_line_1": "Raj Enterprises Factory",
        "address_line_2": "Industrial Area",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "landmark": "Near Industrial Gate",
        "is_default": True,
    }],
    "role": "super_admin",
    "profile_image_url": None,
    "is_active": True,
    "notification_opt_in": True,
    "has_password": True,
    "metadata": {"seeded": True},
}


async def seed_database():
    """Seed the database with sample data."""
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.mongodb_db_name]

    now = datetime.now(timezone.utc)

    # --- Seed Categories ---
    logger.info("Seeding categories...")
    category_map = {}  # name -> _id

    for cat_data in CATEGORIES:
        existing = await db.categories.find_one({"name": cat_data["name"]})
        if existing:
            category_map[cat_data["name"]] = existing["_id"]
            logger.info(f"  Category '{cat_data['name']}' already exists, skipping.")
            continue

        result = await db.categories.insert_one({
            "name": cat_data["name"],
            "parent_id": cat_data["parent_id"],
            "is_active": True,
        })
        category_map[cat_data["name"]] = result.inserted_id
        logger.info(f"  Created category: {cat_data['name']}")

    # --- Seed Products ---
    logger.info("Seeding products...")

    for prod_data in PRODUCTS:
        existing = await db.products.find_one({"sku": prod_data["sku"]})
        if existing:
            logger.info(f"  Product '{prod_data['title']}' (SKU: {prod_data['sku']}) already exists, skipping.")
            continue

        category_id = category_map.get(prod_data["category"], None)

        doc = {
            "title": prod_data["title"],
            "description": prod_data["description"],
            "category_id": str(category_id) if category_id else None,
            "images": [],  # Placeholder — add actual images later
            "price": prod_data["price"],
            "stock_count": prod_data["stock"],
            "sku": prod_data["sku"],
            "status": "active" if prod_data["stock"] > 0 else "out_of_stock",
            "low_stock_threshold": 5,
            "created_at": now,
            "updated_at": now,
            "metadata": {"seeded": True},
        }

        await db.products.insert_one(doc)
        logger.info(f"  Created product: {prod_data['title']} (₹{prod_data['price']})")

    # --- Seed Super Admin ---
    logger.info("Seeding super admin account...")

    existing_admin = await db.users.find_one({"role": "super_admin"})
    if existing_admin:
        logger.info(f"  Super admin already exists: {existing_admin['name']}")
    else:
        admin_doc = {
            **SUPER_ADMIN,
            "created_at": now,
            "updated_at": now,
            "last_active_at": now,
        }
        await db.users.insert_one(admin_doc)
        logger.info(f"  Created super admin: {SUPER_ADMIN['name']}")

    logger.info("\n✅ Database seeding complete!")
    logger.info(f"   Categories: {len(CATEGORIES)}")
    logger.info(f"   Products: {len(PRODUCTS)}")
    logger.info(f"   Super Admin: {SUPER_ADMIN['email']}")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed_database())
