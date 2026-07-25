from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from app.core.config import settings
from app.db.models import Base

database_url = settings.DATABASE_URL
engine_connect_args = {}
# asyncpg does not understand libpq's `sslmode` query parameter. Translate
# Neon/PostgreSQL's sslmode=require into asyncpg's native SSL connect arg.
if database_url.startswith("postgresql+asyncpg://"):
    parsed_url = urlsplit(database_url)
    query = dict(parse_qsl(parsed_url.query, keep_blank_values=True))
    sslmode = query.pop("sslmode", None)
    # channel_binding is a libpq option and is not accepted by asyncpg.
    query.pop("channel_binding", None)
    if sslmode in {"require", "verify-ca", "verify-full"}:
        engine_connect_args["ssl"] = True
    database_url = urlunsplit((parsed_url.scheme, parsed_url.netloc, parsed_url.path, urlencode(query), parsed_url.fragment))

# Disable JIT compilation on Postgres server side for high-frequency small API queries
# (JIT compilation adds 50-300ms overhead on simple queries).
engine_connect_args["server_settings"] = {
    "jit": "off",
    "application_name": "smartcampaign_api"
}
engine_connect_args["command_timeout"] = 15

# Neon PgBouncer pooler compatibility: disable asyncpg prepared statement caching
# to prevent statement mismatch delays across pooled Neon connections.
engine_connect_args["statement_cache_size"] = 0
engine_connect_args["prepared_statement_cache_size"] = 0

# Create Async Engine with production-safe connection pool settings for Neon Cloud DB
engine = create_async_engine(
    database_url,
    echo=False,
    future=True,
    pool_pre_ping=True,      # Verify connections before use (handles dropped connections)
    pool_size=10,            # Keep app-side pooling optimal for Neon pooler
    max_overflow=20,         # Avoid exhausting Neon connections across workers/tasks
    pool_timeout=30,         # Wait up to 30s for a connection before raising PoolTimeout
    pool_recycle=300,        # Recycle connections every 5 minutes (prevents Neon proxy stale connections)
    connect_args=engine_connect_args,
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

    # High-value indexes for the multi-tenant list/dashboard queries. These
    # are idempotent and safe for existing restored databases.
    try:
        async with engine.begin() as conn:
            from sqlalchemy import text
            for statement in (
                "CREATE INDEX IF NOT EXISTS ix_contact_lists_user_id ON contact_lists (user_id)",
                "CREATE INDEX IF NOT EXISTS ix_contacts_list_id ON contacts (list_id)",
                "CREATE INDEX IF NOT EXISTS ix_email_templates_user_id ON email_templates (user_id)",
                "CREATE INDEX IF NOT EXISTS ix_campaigns_user_created ON campaigns (user_id, created_at DESC)",
                "CREATE INDEX IF NOT EXISTS ix_campaign_logs_campaign_id ON campaign_logs (campaign_id)",
                "CREATE INDEX IF NOT EXISTS ix_campaign_logs_contact_id ON campaign_logs (contact_id)",
                "CREATE INDEX IF NOT EXISTS ix_payment_logs_user_created ON payment_logs (user_id, created_at DESC)",
                "CREATE INDEX IF NOT EXISTS ix_admin_audit_logs_created ON admin_audit_logs (created_at DESC)",
                "CREATE INDEX IF NOT EXISTS ix_sms_logs_user_timestamp ON sms_logs (user_id, timestamp DESC)",
            ):
                await conn.execute(text(statement))
    except Exception as e:
        print(f"DB performance index migration warning (non-fatal): {e}")

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

    try:
        async with engine.begin() as conn:
            from sqlalchemy import text
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS seo_meta_title VARCHAR DEFAULT 'SmartCampaign - Modern SaaS Email Marketing Platform'")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS seo_meta_description VARCHAR DEFAULT 'Create, personalize, monitor, and scale email marketing campaigns dynamically.'")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS seo_meta_keywords VARCHAR DEFAULT 'email marketing, smtp, celery, dispatch, saas'")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS default_from_name VARCHAR DEFAULT 'SmartCampaign Operations'")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS smtp_max_retries INTEGER DEFAULT 3")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS email_verification_required BOOLEAN DEFAULT false")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS min_password_length INTEGER DEFAULT 8")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS max_login_attempts INTEGER DEFAULT 5")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS session_expiry_hours INTEGER DEFAULT 24")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS telegram_bot_token VARCHAR DEFAULT ''")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR DEFAULT ''")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS telegram_notifications_enabled BOOLEAN DEFAULT false")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS two_factor_email_enabled BOOLEAN DEFAULT false")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS two_factor_telegram_enabled BOOLEAN DEFAULT false")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS two_factor_mandatory_for_admins BOOLEAN DEFAULT false")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS system_smtp_host VARCHAR")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS system_smtp_port INTEGER DEFAULT 587")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS system_smtp_username VARCHAR")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS system_smtp_encrypted_password VARCHAR")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS system_smtp_security VARCHAR DEFAULT 'TLS'")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS system_smtp_from_name VARCHAR")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS system_smtp_from_email VARCHAR")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS system_smtp_enabled BOOLEAN DEFAULT false")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS api_listener_username VARCHAR DEFAULT 'dhru_user'")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS api_listener_access_key VARCHAR DEFAULT 'dhru_key_123456'")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS api_listener_enabled BOOLEAN DEFAULT true")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS api_listener_connected_ip VARCHAR DEFAULT ''")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS payment_gateway_trc20 VARCHAR DEFAULT ''")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS payment_gateway_bep20 VARCHAR DEFAULT ''")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS payment_gateway_usdc_bep20 VARCHAR DEFAULT ''")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS payment_gateway_merchant_id VARCHAR DEFAULT ''")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS payment_gateway_qr_code VARCHAR DEFAULT ''")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS payment_gateway_trc20_enabled BOOLEAN DEFAULT true")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS payment_gateway_bep20_enabled BOOLEAN DEFAULT true")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS payment_gateway_usdc_bep20_enabled BOOLEAN DEFAULT true")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS payment_gateway_merchant_enabled BOOLEAN DEFAULT true")
            )
            await conn.execute(
                text("ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS extra_settings JSON")
            )
    except Exception as e:
        print(f"DB migration warning 4 (non-fatal): {e}")

    # Major SaaS platform feature upgrades migrations (Modules 1 - 7)
    try:
        async with engine.begin() as conn:
            from sqlalchemy import text
            # users upgrades
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_primary_color VARCHAR DEFAULT '#4c6ef5'"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_secondary_color VARCHAR DEFAULT '#fab005'"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_font_family VARCHAR DEFAULT 'Inter'"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_settings VARCHAR DEFAULT 'all'"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_telegram_enabled BOOLEAN DEFAULT false"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_2fa_secret VARCHAR"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS company VARCHAR"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS address VARCHAR"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR DEFAULT 'English'"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR DEFAULT 'UTC'"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS send_profile_email BOOLEAN DEFAULT false"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_secret VARCHAR"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_2fa_secret VARCHAR"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP"))
            
            # smtp reputation
            await conn.execute(text("ALTER TABLE smtp_servers ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 100"))
            
            # contacts upgrade
            await conn.execute(text("ALTER TABLE contacts ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active'"))
            await conn.execute(text("ALTER TABLE contacts ADD COLUMN IF NOT EXISTS custom_fields TEXT DEFAULT '{}'"))
            
            # campaigns upgrade
            await conn.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS subject_b VARCHAR"))
            await conn.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ab_split_ratio INTEGER DEFAULT 0"))
            await conn.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ab_winner_metric VARCHAR"))
            await conn.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ab_winner_subject VARCHAR"))
            await conn.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS throttle_limit INTEGER DEFAULT 0"))
            await conn.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS category VARCHAR DEFAULT 'Newsletter'"))
            await conn.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false"))
            
            # campaign logs upgrade
            await conn.execute(text("ALTER TABLE campaign_logs ADD COLUMN IF NOT EXISTS device_type VARCHAR DEFAULT 'Desktop'"))
            await conn.execute(text("ALTER TABLE campaign_logs ADD COLUMN IF NOT EXISTS link_clicks TEXT DEFAULT '{}'"))
            await conn.execute(text("ALTER TABLE campaign_logs ADD COLUMN IF NOT EXISTS error_code VARCHAR"))
            
            # telegram_services group column upgrade
            await conn.execute(text("ALTER TABLE telegram_services ADD COLUMN IF NOT EXISTS \"group\" VARCHAR DEFAULT 'General'"))
            
            # telegram_marketing_configs website_url column upgrade
            await conn.execute(text("ALTER TABLE telegram_marketing_configs ADD COLUMN IF NOT EXISTS website_url VARCHAR DEFAULT 'iPhoneUnlock.org'"))
            
            # subscription_plans upgrades
            await conn.execute(text("ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS public_price INTEGER DEFAULT 0"))
            await conn.execute(text("ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS discount INTEGER DEFAULT 0"))

            # sms_marketing_configs upgrades
            await conn.execute(text("ALTER TABLE sms_marketing_configs ADD COLUMN IF NOT EXISTS bulksmsbd_api_key VARCHAR"))
            await conn.execute(text("ALTER TABLE sms_marketing_configs ADD COLUMN IF NOT EXISTS bulksmsbd_sender_id VARCHAR"))
            await conn.execute(text("ALTER TABLE sms_marketing_configs ADD COLUMN IF NOT EXISTS twilio_api_key VARCHAR"))
            await conn.execute(text("ALTER TABLE sms_marketing_configs ADD COLUMN IF NOT EXISTS twilio_sender_id VARCHAR"))
            await conn.execute(text("ALTER TABLE sms_marketing_configs ADD COLUMN IF NOT EXISTS vonage_api_key VARCHAR"))
            await conn.execute(text("ALTER TABLE sms_marketing_configs ADD COLUMN IF NOT EXISTS vonage_sender_id VARCHAR"))
            await conn.execute(text("ALTER TABLE sms_marketing_configs ADD COLUMN IF NOT EXISTS custom_api_key VARCHAR"))
            await conn.execute(text("ALTER TABLE sms_marketing_configs ADD COLUMN IF NOT EXISTS custom_sender_id VARCHAR"))
            
            # remote_backup_configs upgrades
            await conn.execute(text("ALTER TABLE remote_backup_configs ADD COLUMN IF NOT EXISTS retention_count INTEGER DEFAULT 5"))
    except Exception as e:
        print(f"DB feature upgrades migration warning (non-fatal): {e}")

    # Create rules to protect admin_audit_logs from deletion or updates (append-only)
    try:
        async with engine.begin() as conn:
            from sqlalchemy import text
            await conn.execute(
                text("CREATE RULE block_admin_audit_logs_delete AS ON DELETE TO admin_audit_logs DO INSTEAD NOTHING")
            )
    except Exception as e:
        # Expected duplicate rule exception if already created
        _ = e

    try:
        async with engine.begin() as conn:
            from sqlalchemy import text
            await conn.execute(
                text("CREATE RULE block_admin_audit_logs_update AS ON UPDATE TO admin_audit_logs DO INSTEAD NOTHING")
            )
    except Exception as e:
        # Expected duplicate rule exception if already created
        _ = e

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
                        "INSERT INTO system_configs (id, site_name, support_email, maintenance_mode, global_send_rate_limit, default_from_email, seo_meta_title, seo_meta_description, seo_meta_keywords, default_from_name, smtp_max_retries, email_verification_required, min_password_length, max_login_attempts, session_expiry_hours, telegram_bot_token, telegram_chat_id, telegram_notifications_enabled, two_factor_email_enabled, two_factor_telegram_enabled, two_factor_mandatory_for_admins, api_listener_username, api_listener_access_key) "
                        "VALUES (1, 'SmartCampaign', 'support@smartcampaign.today', false, 1000, 'noreply@smartcampaign.today', 'SmartCampaign - Modern SaaS Email Marketing Platform', 'Create, personalize, monitor, and scale email marketing campaigns dynamically.', 'email marketing, smtp, celery, dispatch, saas', 'SmartCampaign Operations', 3, false, 8, 5, 24, '', '', false, false, false, false, '', '')"
                    )
                )
    except Exception as e:
        print(f"DB config seeding warning (non-fatal): {e}")

    # Auto-insert default remote backup configuration (id=1) if not exists
    try:
        async with engine.begin() as conn:
            from sqlalchemy import text
            backup_config_check = await conn.execute(
                text("SELECT id FROM remote_backup_configs WHERE id = 1")
            )
            if not backup_config_check.first():
                await conn.execute(
                    text(
                        "INSERT INTO remote_backup_configs (id, provider, schedule_days, is_active) "
                        "VALUES (1, 'ftp', 1, false)"
                    )
                )
    except Exception as e:
        print(f"DB remote backup config seeding warning (non-fatal): {e}")

    # Auto-seed the initial Master Admin account if not exists
    try:
        async with engine.begin() as conn:
            from sqlalchemy import text
            from app.core.security import get_password_hash
            
            # Administrator accounts are created explicitly through the
            # protected invitation flow; never seed known credentials.
    except Exception as e:
        print(f"DB admin user seeding warning (non-fatal): {e}")

    # Auto-seed the default subscription plans if not exists
    try:
        async with engine.begin() as conn:
            from sqlalchemy import text
            plan_check = await conn.execute(
                text("SELECT id FROM subscription_plans LIMIT 1")
            )
            if not plan_check.first():
                default_plans = [
                    (
                        "free", "Starter", 499, 999, 500, 5000, 1, "30 Days", "60s update interval",
                        "Contacts: 1,000\nSends/mo: 5,000\nSMTP nodes: 1\nTeam seats: 1\nCampaign create + send\nCSV import\n5 starter templates\nBasic analytics\nUnsubscribe handling"
                    ),
                    (
                        "pro", "Standard", 1199, 2999, 1800, 50000, 3, "30 Days", "45s update interval",
                        "Contacts: 10,000\nSends/mo: 50,000\nSMTP nodes: 3\nTeam seats: 3\nAll Starter features\nScheduled sending\n20+ templates\nAdvanced analytics\nMobile preview\nDuplicate campaign"
                    ),
                    (
                        "business", "Premium", 2499, 5999, 3500, 200000, 5, "30 Days", "30s update interval",
                        "Contacts: 50,000\nSends/mo: 200,000\nSMTP nodes: 5\nTeam seats: 10\nAll Standard features\nA/B subject testing\nCustom unsubscribe page\nCampaign export (PDF)"
                    ),
                    (
                        "enterprise", "Enterprise", 5999, 14999, 9000, 999999999, 999999, "30 Days", "15s update interval",
                        "Contacts: Unlimited\nSends/mo: Unlimited\nSMTP nodes: Unlimited\nTeam seats: Unlimited\nAll Premium features\nFull API access\nMulti-client manage\nCustom invoice"
                    )
                ]
                for tier, name, price, public_price, discount, quota, smtp_limit, validity, throttle, features in default_plans:
                    await conn.execute(
                        text(
                            "INSERT INTO subscription_plans (tier, name, price, public_price, discount, quota, smtp_limit, validity, throttle, features) "
                            "VALUES (:tier, :name, :price, :public_price, :discount, :quota, :smtp_limit, :validity, :throttle, :features)"
                        ),
                        {
                            "tier": tier,
                            "name": name,
                            "price": price,
                            "public_price": public_price,
                            "discount": discount,
                            "quota": quota,
                            "smtp_limit": smtp_limit,
                            "validity": validity,
                            "throttle": throttle,
                            "features": features
                        }
                    )
            else:
                # Seed default values for existing records if they are 0 or NULL
                await conn.execute(
                    text("UPDATE subscription_plans SET public_price = 999, discount = 500 WHERE tier = 'free' AND (public_price IS NULL OR public_price = 0)")
                )
                await conn.execute(
                    text("UPDATE subscription_plans SET public_price = 2999, discount = 1800 WHERE tier = 'pro' AND (public_price IS NULL OR public_price = 0)")
                )
                await conn.execute(
                    text("UPDATE subscription_plans SET public_price = 5999, discount = 3500 WHERE tier = 'business' AND (public_price IS NULL OR public_price = 0)")
                )
                await conn.execute(
                    text("UPDATE subscription_plans SET public_price = 14999, discount = 9000 WHERE tier = 'enterprise' AND (public_price IS NULL OR public_price = 0)")
                )
    except Exception as e:
        print(f"DB plans seeding warning (non-fatal): {e}")
