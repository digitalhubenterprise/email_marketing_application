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
    
    REDIS_URL: str = Field(default="redis://redis:6379/0", alias="REDIS_URL")
    
    JWT_SECRET: str = Field(default="supersecretjwtkeyfor_smartcampaign_sass_2026", alias="JWT_SECRET")
    # Short-lived access tokens reduce the impact of token theft.
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # AES-256 Fernet key for encrypting custom SMTP passwords in Database
    ENCRYPTION_KEY: str = Field(default="gK-xW32Lkd0w3UuWlkd_98D-Jskd0923Lkd_923Jka8=", alias="ENCRYPTION_KEY")
    
    # Tracking
    TRACKING_BASE_URL: str = Field(default="http://localhost:8000", alias="TRACKING_BASE_URL")

    # Admin Registration Secret
    ADMIN_REGISTRATION_SECRET: str = Field(default="supersecretadmininvitekey2026", alias="ADMIN_REGISTRATION_SECRET")
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
        
        is_production = self.ENVIRONMENT.lower() == "production"
        import warnings
        
        if is_production:
            if self.JWT_SECRET == "supersecretjwtkeyfor_smartcampaign_sass_2026":
                warnings.warn("JWT_SECRET is using default development key. Set JWT_SECRET in environment for production.")
            if self.ENCRYPTION_KEY == "gK-xW32Lkd0w3UuWlkd_98D-Jskd0923Lkd_923Jka8=":
                warnings.warn("ENCRYPTION_KEY is using default development key. Set ENCRYPTION_KEY in environment for production.")
            if self.ADMIN_REGISTRATION_SECRET == "supersecretadmininvitekey2026":
                warnings.warn("ADMIN_REGISTRATION_SECRET is using default development key. Set ADMIN_REGISTRATION_SECRET in environment for production.")
            if not self.TRACKING_BASE_URL.startswith("https://"):
                warnings.warn("TRACKING_BASE_URL is not using HTTPS. Secure SSL is recommended for tracking links in production.")
        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
