from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AliasChoices, Field, model_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "SmartCampaign API"
    VERSION: str = "3.0"
    API_V1_STR: str = "/api"
    
    # DB URL: can be swapped easily to Supabase or other postgres urls
    DATABASE_URL: str = Field(
        alias="DATABASE_URL",
        # Neon is the authoritative database when both variables exist.
        validation_alias=AliasChoices("NEON_DATABASE_URL", "DATABASE_URL")
    )
    
    REDIS_URL: str = Field(alias="REDIS_URL")
    
    JWT_SECRET: str = Field(alias="JWT_SECRET", min_length=32)
    # Short-lived access tokens reduce the impact of token theft.
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # AES-256 Fernet key for encrypting custom SMTP passwords in Database
    ENCRYPTION_KEY: str = Field(alias="ENCRYPTION_KEY", min_length=32)
    
    # Tracking
    TRACKING_BASE_URL: str = Field(alias="TRACKING_BASE_URL")

    # Admin Registration Secret
    ADMIN_REGISTRATION_SECRET: str = Field(alias="ADMIN_REGISTRATION_SECRET", min_length=32)
    # Optional one-time bootstrap credentials, supplied only through Coolify secrets.
    ADMIN_EMAIL: str = ""
    ADMIN_PASSWORD: str = ""

    TESTING: bool = False
    ENVIRONMENT: str = "development"

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        # Neon commonly provides a standard PostgreSQL URL (postgresql:// or postgres://).
        # SQLAlchemy's async engine requires the asyncpg dialect explicitly.
        if self.DATABASE_URL.startswith("postgres://"):
            self.DATABASE_URL = "postgresql+asyncpg://" + self.DATABASE_URL[len("postgres://"):]
        elif self.DATABASE_URL.startswith("postgresql://"):
            self.DATABASE_URL = "postgresql+asyncpg://" + self.DATABASE_URL[len("postgresql://"):]
        if self.ENVIRONMENT.lower() == "production" and not self.TRACKING_BASE_URL.startswith("https://"):
            raise ValueError("TRACKING_BASE_URL must use HTTPS in production.")
        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
