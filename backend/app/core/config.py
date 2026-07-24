import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AliasChoices, Field, model_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "SmartCampaign API"
    VERSION: str = "3.0"
    API_V1_STR: str = "/api"
    
    # DB URL: can be swapped easily to Supabase or other postgres urls
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:password123@db:5432/smartcampaign",
        alias="DATABASE_URL",
        # Neon is the authoritative database when both variables exist.
        validation_alias=AliasChoices("NEON_DATABASE_URL", "DATABASE_URL")
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

    TESTING: bool = False
    ENVIRONMENT: str = "development"

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        # Neon commonly provides a standard PostgreSQL URL. SQLAlchemy's
        # async engine requires the asyncpg dialect explicitly.
        if self.DATABASE_URL.startswith("postgresql://"):
            self.DATABASE_URL = "postgresql+asyncpg://" + self.DATABASE_URL[len("postgresql://"):]
        # Detect production environment
        is_production = self.ENVIRONMENT.lower() == "production"
        # Never allow the development fallback secrets to be used in any
        # non-test deployment. A missing ENVIRONMENT must not silently weaken
        # authentication or credential encryption.
        if not self.TESTING:
            if self.JWT_SECRET == "supersecretjwtkeyfor_smartcampaign_sass_2026":
                raise ValueError("JWT_SECRET must be configured with a unique random value.")
            if self.ENCRYPTION_KEY == "gK-xW32Lkd0w3UuWlkd_98D-Jskd0923Lkd_923Jka8=":
                raise ValueError("ENCRYPTION_KEY must be configured with a unique Fernet key.")
            if self.ADMIN_REGISTRATION_SECRET == "supersecretadmininvitekey2026":
                raise ValueError("ADMIN_REGISTRATION_SECRET must be configured with a unique random value.")
        if is_production:
            if self.JWT_SECRET == "supersecretjwtkeyfor_smartcampaign_sass_2026":  # nosec
                raise ValueError("JWT_SECRET must be changed from default value in production environment.")
            if self.ENCRYPTION_KEY == "gK-xW32Lkd0w3UuWlkd_98D-Jskd0923Lkd_923Jka8=":  # nosec
                raise ValueError("ENCRYPTION_KEY must be changed from default value in production environment.")
            if self.ADMIN_REGISTRATION_SECRET == "supersecretadmininvitekey2026":  # nosec
                raise ValueError("ADMIN_REGISTRATION_SECRET must be changed from default value in production environment.")
        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
