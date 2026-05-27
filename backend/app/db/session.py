from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings
from app.db.models import Base

# Create Async Engine with production-safe connection pool settings
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,      # Verify connections before use (handles dropped connections)
    pool_size=10,            # Max 10 persistent connections per worker
    max_overflow=20,         # Allow up to 20 extra connections under peak load
    pool_timeout=30,         # Wait up to 30s for a connection before raising PoolTimeout
    pool_recycle=1800,       # Recycle connections every 30 minutes (prevents stale connections)
)

# Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields a DB session and handles commit/rollback/close."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_db_tables() -> None:
    """
    Creates all tables on startup (safe — skips existing tables).
    Also runs inline migration for columns added after initial deploy.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Safe inline migrations — ADD COLUMN IF NOT EXISTS is idempotent
        try:
            from sqlalchemy import text
            await conn.execute(
                text("ALTER TABLE smtp_servers ADD COLUMN IF NOT EXISTS daily_send_limit INTEGER DEFAULT 500")
            )
            await conn.execute(
                text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS auto_resend_hours INTEGER DEFAULT 0")
            )
            await conn.execute(
                text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sending_mode VARCHAR DEFAULT 'auto'")
            )
        except Exception as e:
            print(f"DB migration warning (non-fatal): {e}")
