"""
Raj Enterprises API — Application Configuration

All configuration is environment-driven via Pydantic Settings.
No hardcoded values. See .env.example for all available options.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List, Optional
import json


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # --- Application ---
    app_name: str = "Raj Enterprises API"
    app_env: str = "development"
    debug: bool = True
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = '["http://localhost:5173","http://localhost:5174"]'

    # --- MongoDB ---
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "raj_enterprises"

    # --- Firebase ---
    firebase_service_account_path: str = "./firebase-service-account.json"

    # --- Image Storage ---
    image_base_url: str = "http://localhost:5173/uploads"
    image_upload_dir: str = "../web/public/uploads"

    # --- Cloudinary ---
    cloudinary_cloud_name: Optional[str] = None
    cloudinary_api_key: Optional[str] = None
    cloudinary_api_secret: Optional[str] = None

    # --- Security ---
    max_admin_accounts: int = 5
    otp_rate_limit: int = 5
    login_rate_limit: int = 10
    session_inactivity_days: int = 10
    session_max_lifetime_days: int = 30

    # --- Order Defaults ---
    default_delivery_days: int = 7

    # --- Company Info (for invoices) ---
    company_name: str = "Raj Enterprises"
    company_address: str = "Your Company Address Here"
    company_phone: str = "+91-XXXXXXXXXX"
    company_email: str = "info@rajenterprises.com"
    company_gst: str = "XXXXXXXXXXXX"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from JSON string or comma-separated list of URLs."""
        raw = self.cors_origins.strip()
        
        # 1. Try to parse as valid JSON array
        try:
            return json.loads(raw)
        except Exception:
            pass

        # 2. Fallback: Clean square brackets, quotes, and split by comma
        cleaned = raw.replace("[", "").replace("]", "").replace('"', "").replace("'", "")
        origins = [item.strip() for item in cleaned.split(",") if item.strip()]
        if origins:
            return origins

        # 3. Default fallback
        return ["http://localhost:5173", "http://localhost:5174"]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Singleton settings instance
settings = Settings()
