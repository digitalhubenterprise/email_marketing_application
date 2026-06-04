import os
from pydantic_settings import BaseSettings
from pydantic import Field, model_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "SmartCampaign API"
    VERSION: str = "1.0"
    API_V1_STR: str = "/api"
    
    # DB URL: can be swapped easily to Supabase or other postgres urls
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:password123@db:5432/smartcampaign",
        alias="DATABASE_URL"
    )
    
    REDIS_URL: str = Field(
        default="redis://redis:6379/0",
        alias="REDIS_URL"
    )
    
    JWT_SECRET: str = Field(
        default="supersecretjwtkeyfor_smartcampaign_sass_2026",
        alias="JWT_SECRET"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 Hours
    
    # AES-256 Fernet key for encrypting custom SMTP passwords in Database
    ENCRYPTION_KEY: str = Field(
        default="gK-xW32Lkd0w3UuWlkd_98D-Jskd0923Lkd_923Jka8=",
        alias="ENCRYPTION_KEY"
    )
    
    # Tracking
    TRACKING_BASE_URL: str = Field(
        default="http://localhost:8000",
        alias="TRACKING_BASE_URL"
    )

    # Admin Registration Secret
    ADMIN_REGISTRATION_SECRET: str = Field(
        default="supersecretadmininvitekey2026",
        alias="ADMIN_REGISTRATION_SECRET"
    )

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        # Detect production environment
        is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"
        if is_production:
            if self.JWT_SECRET == "supersecretjwtkeyfor_smartcampaign_sass_2026":
                raise ValueError("JWT_SECRET must be changed from default value in production environment.")
            if self.ENCRYPTION_KEY == "gK-xW32Lkd0w3UuWlkd_98D-Jskd0923Lkd_923Jka8=":
                raise ValueError("ENCRYPTION_KEY must be changed from default value in production environment.")
            if self.ADMIN_REGISTRATION_SECRET == "supersecretadmininvitekey2026":
                raise ValueError("ADMIN_REGISTRATION_SECRET must be changed from default value in production environment.")
        return self

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
