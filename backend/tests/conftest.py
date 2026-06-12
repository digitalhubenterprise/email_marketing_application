import os, sys
os.environ["TESTING"] = "True"
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import asyncio
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.main import app
from app.db.session import get_db
from app.db.models import Base
from app.tasks.email_sender import celery

# Configure Celery in eager mode for tests to run tasks synchronously without Redis broker
celery.conf.task_always_eager = True

from sqlalchemy.pool import StaticPool

DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    DATABASE_URL,
    poolclass=StaticPool,
    connect_args={"check_same_thread": False},
    echo=False
)
TestingSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Override production db session and engine with test ones for all celery tasks and imports during testing
import app.db.session as db_session_mod
import app.tasks.email_sender as email_sender_mod

from sqlalchemy.ext.asyncio import AsyncEngine

async def dummy_dispose(self):
    pass
AsyncEngine.dispose = dummy_dispose

db_session_mod.AsyncSessionLocal = TestingSessionLocal
db_session_mod.engine = engine
email_sender_mod.AsyncSessionLocal = TestingSessionLocal
email_sender_mod.engine = engine

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="session", autouse=True)
async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        # Seed default configurations
        from sqlalchemy import text
        await conn.execute(
            text(
                "INSERT INTO system_configs (id, site_name, support_email, maintenance_mode, global_send_rate_limit, default_from_email, seo_meta_title, seo_meta_description, seo_meta_keywords, default_from_name, smtp_max_retries, email_verification_required, min_password_length, max_login_attempts, session_expiry_hours, telegram_bot_token, telegram_chat_id, telegram_notifications_enabled, two_factor_email_enabled, two_factor_telegram_enabled, two_factor_mandatory_for_admins) "
                "VALUES (1, 'SmartCampaign', 'support@smartcampaign.today', 0, 1000, 'noreply@smartcampaign.today', 'SmartCampaign - Modern SaaS Email Marketing Platform', 'Create, personalize, monitor, and scale email marketing campaigns dynamically.', 'email marketing, smtp, celery, dispatch, saas', 'SmartCampaign Operations', 3, 0, 8, 5, 24, '', '', 0, 0, 0, 0)"
            )
        )
        
        default_plans = [
            ("free", "Starter", 499, 5000, 1, "30 Days", "60s update interval", "Features free"),
            ("pro", "Standard", 1199, 50000, 3, "30 Days", "45s update interval", "Features pro"),
            ("business", "Premium", 2499, 200000, 5, "30 Days", "30s update interval", "Features business"),
            ("enterprise", "Enterprise", 5999, 999999999, 999999, "30 Days", "15s update interval", "Features enterprise")
        ]
        for tier, name, price, quota, smtp_limit, validity, throttle, features in default_plans:
            await conn.execute(
                text(
                    "INSERT INTO subscription_plans (tier, name, price, quota, smtp_limit, validity, throttle, features) "
                    "VALUES (:tier, :name, :price, :quota, :smtp_limit, :validity, :throttle, :features)"
                ),
                {
                    "tier": tier,
                    "name": name,
                    "price": price,
                    "quota": quota,
                    "smtp_limit": smtp_limit,
                    "validity": validity,
                    "throttle": throttle,
                    "features": features
                }
            )
    yield
    await engine.dispose()

@pytest.fixture
async def db_session():
    async with TestingSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

@pytest.fixture(autouse=True)
async def override_get_db(db_session):
    async def _get_db():
        yield db_session
    app.dependency_overrides[get_db] = _get_db
    yield
    app.dependency_overrides.pop(get_db, None)

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="https://test") as ac:
        yield ac
