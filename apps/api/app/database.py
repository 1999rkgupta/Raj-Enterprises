"""
Raj Enterprises API — MongoDB Database Connection

Async MongoDB connection using Motor driver.
Provides database instance and collection accessors.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import IndexModel, ASCENDING, TEXT
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class Database:
    """MongoDB async database manager."""

    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None

    async def connect(self):
        """Establish connection to MongoDB."""
        logger.info(f"Connecting to MongoDB at {settings.mongodb_url}...")
        self.client = AsyncIOMotorClient(
            settings.mongodb_url,
            maxPoolSize=50,
            minPoolSize=10,
            serverSelectionTimeoutMS=5000,
        )
        self.db = self.client[settings.mongodb_db_name]

        # Verify connection
        try:
            await self.client.admin.command("ping")
            logger.info(f"Connected to MongoDB database: {settings.mongodb_db_name}")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise

        # Ensure indexes
        await self._ensure_indexes()

    async def disconnect(self):
        """Close MongoDB connection."""
        if self.client:
            self.client.close()
            logger.info("Disconnected from MongoDB")

    async def _ensure_indexes(self):
        """Create all required indexes for collections."""
        try:
            # Users collection indexes
            users = self.db["users"]
            await users.create_indexes([
                IndexModel([("firebase_uid", ASCENDING)], unique=True),
                IndexModel([("mobile", ASCENDING)], unique=True, sparse=True),
                IndexModel([("email", ASCENDING)], unique=True, sparse=True),
                IndexModel([("role", ASCENDING)]),
                IndexModel([("is_active", ASCENDING)]),
                IndexModel([("created_at", ASCENDING)]),
            ])

            # Products collection indexes
            products = self.db["products"]
            await products.create_indexes([
                IndexModel([("category_id", ASCENDING)]),
                IndexModel([("status", ASCENDING)]),
                IndexModel([("sku", ASCENDING)], unique=True),
                IndexModel([("created_at", ASCENDING)]),
                IndexModel([("title", TEXT), ("description", TEXT)]),
                IndexModel([("price", ASCENDING)]),
            ])

            # Categories collection indexes
            categories = self.db["categories"]
            await categories.create_indexes([
                IndexModel([("parent_id", ASCENDING)]),
                IndexModel([("is_active", ASCENDING)]),
                IndexModel([("name", ASCENDING)], unique=True),
            ])

            # Carts collection indexes
            carts = self.db["carts"]
            await carts.create_indexes([
                IndexModel([("user_id", ASCENDING)], unique=True),
            ])

            # Orders collection indexes
            orders = self.db["orders"]
            await orders.create_indexes([
                IndexModel([("user_id", ASCENDING)]),
                IndexModel([("order_number", ASCENDING)], unique=True),
                IndexModel([("order_status", ASCENDING)]),
                IndexModel([("payment_status", ASCENDING)]),
                IndexModel([("created_at", ASCENDING)]),
            ])

            # Wishlist collection indexes
            wishlists = self.db["wishlists"]
            await wishlists.create_indexes([
                IndexModel([("user_id", ASCENDING)], unique=True),
            ])

            # Audit logs collection indexes
            audit_logs = self.db["audit_logs"]
            await audit_logs.create_indexes([
                IndexModel([("action", ASCENDING)]),
                IndexModel([("performed_by", ASCENDING)]),
                IndexModel([("timestamp", ASCENDING)]),
            ])

            logger.info("Database indexes ensured successfully")
        except Exception as e:
            logger.warning(f"Error ensuring indexes (non-fatal): {e}")

    # --- Collection Accessors ---

    @property
    def users(self):
        return self.db["users"]

    @property
    def products(self):
        return self.db["products"]

    @property
    def categories(self):
        return self.db["categories"]

    @property
    def carts(self):
        return self.db["carts"]

    @property
    def orders(self):
        return self.db["orders"]

    @property
    def wishlists(self):
        return self.db["wishlists"]

    @property
    def audit_logs(self):
        return self.db["audit_logs"]


# Singleton database instance
database = Database()
