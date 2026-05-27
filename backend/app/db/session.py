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
        async with engine.begin() as conn:
            from sqlalchemy import text
            await conn.execute(
                text("ALTER TABLE smtp_servers ADD COLUMN IF NOT EXISTS daily_send_limit INTEGER DEFAULT 500")
            )
    except Exception as e:
        print(f"DB migration warning 1 (non-fatal): {e}")

    try:
        async with engine.begin() as conn:
            from sqlalchemy import text
            await conn.execute(
                text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS auto_resend_hours INTEGER DEFAULT 0")
            )
    except Exception as e:
        print(f"DB migration warning 2 (non-fatal): {e}")

    try:
        async with engine.begin() as conn:
            from sqlalchemy import text
            await conn.execute(
                text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sending_mode VARCHAR DEFAULT 'auto'")
            )
    except Exception as e:
        print(f"DB migration warning 3 (non-fatal): {e}")

    # Create rules to protect admin_audit_logs from deletion or updates (append-only)
    try:
        async with engine.begin() as conn:
            from sqlalchemy import text
            await conn.execute(
                text("CREATE RULE block_admin_audit_logs_delete AS ON DELETE TO admin_audit_logs DO INSTEAD NOTHING")
            )
    except Exception:
        pass

    try:
        async with engine.begin() as conn:
            from sqlalchemy import text
            await conn.execute(
                text("CREATE RULE block_admin_audit_logs_update AS ON UPDATE TO admin_audit_logs DO INSTEAD NOTHING")
            )
    except Exception:
        pass

    # Auto-insert default system configuration (id=1) if not exists
    try:
        async with engine.begin() as conn:
            from sqlalchemy import text
            config_check = await conn.execute(
                text("SELECT id FROM system_configs WHERE id = 1")
            )
            if not config_check.first():
                await conn.execute(
                    text(
                        "INSERT INTO system_configs (id, site_name, support_email, maintenance_mode, global_send_rate_limit, default_from_email) "
                        "VALUES (1, 'SmartCampaign', 'support@smartcampaign.today', false, 1000, 'noreply@smartcampaign.today')"
                    )
                )
    except Exception as e:
        print(f"DB config seeding warning (non-fatal): {e}")

    # Auto-seed the initial Master Admin account if not exists
    try:
        async with engine.begin() as conn:
            from sqlalchemy import text
            from app.core.security import get_password_hash
            admin_check = await conn.execute(
                text("SELECT id FROM admin_users WHERE email = 'admin@gmail.com'")
            )
            if not admin_check.first():
                hashed_pw = get_password_hash("admin123#")
                await conn.execute(
                    text(
                        "INSERT INTO admin_users (email, hashed_password, role, is_active) "
                        "VALUES ('admin@gmail.com', :hashed_pw, 'master_admin', true)"
                    ),
                    {"hashed_pw": hashed_pw}
                )
    except Exception as e:
        print(f"DB admin user seeding warning (non-fatal): {e}")
