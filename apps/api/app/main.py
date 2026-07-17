"""
Raj Enterprises API — FastAPI Application Entry Point

Production-grade e-commerce backend.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import firebase_admin
from firebase_admin import credentials
import logging
import os

from app.config import settings
from app.database import database

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    # --- Startup ---
    logger.info(f"Starting {settings.app_name} ({settings.app_env})")

    # Initialize Firebase Admin SDK
    try:
        firebase_json = os.environ.get("FIREBASE_CREDENTIALS_JSON")
        if firebase_json:
            import json
            service_account_info = json.loads(firebase_json)
            cred = credentials.Certificate(service_account_info)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK initialized with credentials from environment variable")
        elif os.path.exists(settings.firebase_service_account_path):
            cred = credentials.Certificate(settings.firebase_service_account_path)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK initialized with service account file")
        else:
            # In development, allow running without Firebase credentials
            # (auth endpoints will fail, but other endpoints work)
            if not settings.is_production:
                logger.warning(
                    "Firebase service account not found. "
                    "Auth endpoints will not work. "
                    f"Expected path: {settings.firebase_service_account_path}"
                )
                # Initialize with default (for dev/testing)
                try:
                    firebase_admin.initialize_app()
                except ValueError:
                    pass  # Already initialized
            else:
                raise FileNotFoundError(
                    f"Firebase service account required in production. Please set "
                    f"FIREBASE_CREDENTIALS_JSON environment variable or configure "
                    f"{settings.firebase_service_account_path}"
                )
    except Exception as e:
        logger.error(f"Firebase initialization error: {e}")
        if settings.is_production:
            raise

    # Connect to MongoDB
    await database.connect()

    yield

    # --- Shutdown ---
    await database.disconnect()
    logger.info("Application shutdown complete")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description=(
        "Production-grade e-commerce API for Raj Enterprises — "
        "paints & hardware manufacturer (B2C, factory-direct)"
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Import and register routers ---
from app.routers import auth, users, products, categories, cart, orders, wishlist
from app.routers.admin import (
    dashboard as admin_dashboard,
    users as admin_users,
    products as admin_products,
    orders as admin_orders,
    reports as admin_reports,
)

# Public / Customer routes
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(cart.router, prefix="/api/cart", tags=["Cart"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(wishlist.router, prefix="/api/wishlist", tags=["Wishlist"])

# Admin routes
app.include_router(admin_dashboard.router, prefix="/api/admin/dashboard", tags=["Admin - Dashboard"])
app.include_router(admin_users.router, prefix="/api/admin/users", tags=["Admin - Users"])
app.include_router(admin_products.router, prefix="/api/admin/products", tags=["Admin - Products"])
app.include_router(admin_orders.router, prefix="/api/admin/orders", tags=["Admin - Orders"])
app.include_router(admin_reports.router, prefix="/api/admin/reports", tags=["Admin - Reports"])


# --- Health check ---
@app.get("/", tags=["Health"])
async def root():
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "status": "running",
        "environment": settings.app_env,
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for monitoring."""
    try:
        # Check MongoDB connection
        await database.client.admin.command("ping")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "environment": settings.app_env,
    }
