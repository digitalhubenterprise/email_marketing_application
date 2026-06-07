from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

def utc_now_naive():
    """Generates a timezone-naive UTC datetime for seamless TIMESTAMP compatibility."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    subscription_tier = Column(String, default="free")  # free, pro, business
    quota_limit = Column(Integer, default=1000)        # Max monthly sends
    quota_sent = Column(Integer, default=0)            # Current month sends
    brand_primary_color = Column(String, default="#4c6ef5")
    brand_secondary_color = Column(String, default="#fab005")
    brand_font_family = Column(String, default="Inter")
    notification_settings = Column(String, default="all")
    two_factor_secret = Column(String, nullable=True)
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_telegram_enabled = Column(Boolean, default=False)
    telegram_2fa_secret = Column(String, nullable=True)
    telegram_chat_id = Column(String, nullable=True)
    username = Column(String, nullable=True)
    company = Column(String, nullable=True)
    address = Column(String, nullable=True)
    country = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    language = Column(String, default="English")
    timezone = Column(String, default="UTC")
    send_profile_email = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    email_verification_secret = Column(String, nullable=True)
    email_2fa_secret = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now_naive)

    smtp_servers = relationship("SMTPServer", back_populates="user", cascade="all, delete-orphan")
    contact_lists = relationship("ContactList", back_populates="user", cascade="all, delete-orphan")
    templates = relationship("EmailTemplate", back_populates="user", cascade="all, delete-orphan")
    campaigns = relationship("Campaign", back_populates="user", cascade="all, delete-orphan")
    telegram_config = relationship("TelegramMarketingConfig", back_populates="user", uselist=False, cascade="all, delete-orphan")
    telegram_services = relationship("TelegramService", back_populates="user", cascade="all, delete-orphan")
    telegram_logs = relationship("TelegramLog", back_populates="user", cascade="all, delete-orphan")


class SMTPServer(Base):
    __tablename__ = "smtp_servers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    host = Column(String, nullable=False)
    port = Column(Integer, nullable=False)
    username = Column(String, nullable=False)
    encrypted_password = Column(String, nullable=False)
    security = Column(String, default="TLS")  # SSL, TLS, NONE
    from_name = Column(String, nullable=False)
    from_email = Column(String, nullable=False)
    daily_send_limit = Column(Integer, default=500)
    reputation_score = Column(Integer, default=100)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now_naive)

    user = relationship("User", back_populates="smtp_servers")
    campaigns = relationship("Campaign", back_populates="smtp_server")


class ContactList(Base):
    __tablename__ = "contact_lists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now_naive)

    user = relationship("User", back_populates="contact_lists")
    contacts = relationship("Contact", back_populates="contact_list", cascade="all, delete-orphan")
    campaigns = relationship("Campaign", back_populates="contact_list")


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    list_id = Column(Integer, ForeignKey("contact_lists.id", ondelete="CASCADE"), nullable=False)
    email = Column(String, index=True, nullable=False)
    name = Column(String, nullable=True)
    tags = Column(String, nullable=True)  # Comma-separated strings
    status = Column(String, default="active")  # active, unsubscribed, bounced
    custom_fields = Column(Text, default="{}")  # Store as stringified JSON dict
    is_unsubscribed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now_naive)

    contact_list = relationship("ContactList", back_populates="contacts")
    campaign_logs = relationship("CampaignLog", back_populates="contact", cascade="all, delete-orphan")


class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    content_html = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now_naive)

    user = relationship("User", back_populates="templates")


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    subject_b = Column(String, nullable=True)  # For A/B testing
    ab_split_ratio = Column(Integer, default=0)  # Percentage to test (0 to 100)
    ab_winner_metric = Column(String, nullable=True)  # "open_rate", "click_rate"
    ab_winner_subject = Column(String, nullable=True)  # The determined winner
    throttle_limit = Column(Integer, default=0)  # Emails per hour limit (0 = no limit)
    category = Column(String, default="Newsletter")  # Newsletter, Promo, Transactional, etc.
    is_archived = Column(Boolean, default=False)
    content_html = Column(Text, nullable=False)
    smtp_server_id = Column(Integer, ForeignKey("smtp_servers.id", ondelete="SET NULL"), nullable=True)
    contact_list_id = Column(Integer, ForeignKey("contact_lists.id", ondelete="SET NULL"), nullable=True)
    status = Column(String, default="draft")  # draft, scheduled, sending, sent, failed, paused
    total_recipients = Column(Integer, default=0)
    sent_count = Column(Integer, default=0)
    open_count = Column(Integer, default=0)
    click_count = Column(Integer, default=0)
    scheduled_at = Column(DateTime, nullable=True)
    auto_resend_hours = Column(Integer, nullable=True, default=0)
    sending_mode = Column(String, default="auto") # auto, manual
    is_spam = Column(Boolean, default=False)
    spam_note = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now_naive)

    user = relationship("User", back_populates="campaigns")
    smtp_server = relationship("SMTPServer", back_populates="campaigns")
    contact_list = relationship("ContactList", back_populates="campaigns")
    logs = relationship("CampaignLog", back_populates="campaign", cascade="all, delete-orphan")


class CampaignLog(Base):
    __tablename__ = "campaign_logs"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False)
    email = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending, sent, bounced, failed
    device_type = Column(String, default="Desktop")  # Desktop, Mobile
    link_clicks = Column(Text, default="{}")  # Stringified JSON clicks dict
    error_code = Column(String, nullable=True)  # Store bounce code like 550 or 421
    opened = Column(Boolean, default=False)
    clicked = Column(Boolean, default=False)
    error_message = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=utc_now_naive, onupdate=utc_now_naive)

    campaign = relationship("Campaign", back_populates="logs")
    contact = relationship("Contact", back_populates="campaign_logs")


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="support")  # master_admin, billing_admin, support, moderator
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now_naive)


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_email = Column(String, nullable=False)
    action_type = Column(String, nullable=False)  # suspend_user, plan_change, manually_paid, etc.
    target_entity = Column(String, nullable=True)  # email, payment_id, etc.
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now_naive)


class SystemConfig(Base):
    __tablename__ = "system_configs"

    id = Column(Integer, primary_key=True, index=True)
    site_name = Column(String, default="SmartCampaign")
    logo_url = Column(String, nullable=True)
    support_email = Column(String, default="support@smartcampaign.today")
    maintenance_mode = Column(Boolean, default=False)
    global_send_rate_limit = Column(Integer, default=1000)  # max sends per hour per user
    default_from_email = Column(String, default="noreply@smartcampaign.today")
    announcement_active = Column(Boolean, default=False)
    announcement_message = Column(String, nullable=True)
    seo_meta_title = Column(String, default="SmartCampaign - Modern SaaS Email Marketing Platform")
    seo_meta_description = Column(String, default="Create, personalize, monitor, and scale email marketing campaigns dynamically.")
    seo_meta_keywords = Column(String, default="email marketing, smtp, celery, dispatch, saas")
    default_from_name = Column(String, default="SmartCampaign operations")
    smtp_max_retries = Column(Integer, default=3)
    email_verification_required = Column(Boolean, default=False)
    min_password_length = Column(Integer, default=8)
    max_login_attempts = Column(Integer, default=5)
    session_expiry_hours = Column(Integer, default=24)
    telegram_bot_token = Column(String, default="")
    telegram_chat_id = Column(String, default="")
    telegram_notifications_enabled = Column(Boolean, default=False)
    two_factor_email_enabled = Column(Boolean, default=False)
    two_factor_telegram_enabled = Column(Boolean, default=False)
    two_factor_mandatory_for_admins = Column(Boolean, default=False)
    # System SMTP — used for alerts, OTP, welcome/reset emails
    system_smtp_host = Column(String, nullable=True)
    system_smtp_port = Column(Integer, default=587)
    system_smtp_username = Column(String, nullable=True)
    system_smtp_encrypted_password = Column(String, nullable=True)
    system_smtp_security = Column(String, default="TLS")  # TLS, SSL, NONE
    system_smtp_from_name = Column(String, nullable=True)
    system_smtp_from_email = Column(String, nullable=True)
    system_smtp_enabled = Column(Boolean, default=False)
    api_listener_username = Column(String, default="dhru_user")
    api_listener_access_key = Column(String, default="dhru_key_123456")
    api_listener_enabled = Column(Boolean, default=True)
    api_listener_connected_ip = Column(String, nullable=True, default="")
    payment_gateway_trc20 = Column(String, nullable=True, default="")
    payment_gateway_bep20 = Column(String, nullable=True, default="")
    payment_gateway_usdc_bep20 = Column(String, nullable=True, default="")
    payment_gateway_merchant_id = Column(String, nullable=True, default="")
    payment_gateway_qr_code = Column(String, nullable=True, default="")
    payment_gateway_trc20_enabled = Column(Boolean, default=True)
    payment_gateway_bep20_enabled = Column(Boolean, default=True)
    payment_gateway_usdc_bep20_enabled = Column(Boolean, default=True)
    payment_gateway_merchant_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now_naive)


class PaymentLog(Base):
    __tablename__ = "payment_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_email = Column(String, nullable=False)
    amount = Column(Float, nullable=False)  # flat BDT or USD amount
    currency = Column(String, default="USD")  # USD, BDT
    plan_tier = Column(String, nullable=False)
    gateway = Column(String, default="bKash")  # bKash, Stripe, Bank Transfer
    status = Column(String, default="pending")  # paid, pending, failed, refunded
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now_naive)


class TelegramMarketingConfig(Base):
    __tablename__ = "telegram_marketing_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    telegram_bot_token = Column(String, nullable=True)
    telegram_channel = Column(String, nullable=True)
    groq_api_key = Column(String, nullable=True)
    interval_hours = Column(Integer, default=120)
    is_active = Column(Boolean, default=False)
    website_url = Column(String, default="iPhoneUnlock.org", nullable=True)
    last_run = Column(DateTime, nullable=True)
    next_run = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now_naive)

    user = relationship("User", back_populates="telegram_config")


class TelegramService(Base):
    __tablename__ = "telegram_services"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False)
    group = Column(String, default="General", nullable=True)
    focus = Column(Text, nullable=False)
    angle = Column(String, nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now_naive)

    user = relationship("User", back_populates="telegram_services")


class TelegramLog(Base):
    __tablename__ = "telegram_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, default=utc_now_naive)
    service_title = Column(String, nullable=False)
    category = Column(String, nullable=False)
    status = Column(String, nullable=False)  # "Success" or "Failed"
    message = Column(Text, nullable=False)

    user = relationship("User", back_populates="telegram_logs")


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(Integer, primary_key=True, index=True)
    tier = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    price = Column(Integer, nullable=False)
    public_price = Column(Integer, nullable=True, default=0)
    discount = Column(Integer, nullable=True, default=0)
    quota = Column(Integer, nullable=False)
    smtp_limit = Column(Integer, nullable=False)
    validity = Column(String, default="30 Days")
    throttle = Column(String, default="30s update interval")
    features = Column(Text, nullable=False)  # Newline-separated list of features
    created_at = Column(DateTime, default=utc_now_naive)
class DhruApiLog(Base):
    __tablename__ = "dhru_api_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False)
    username = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    status = Column(String, nullable=False)  # "success" or "failed"
    message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now_naive)
