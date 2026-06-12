from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class AdminUserBase(BaseModel):
    email: EmailStr

class AdminUserCreate(AdminUserBase):
    password: str
    role: str = "support"  # master_admin, support, moderator

class AdminUserResponse(AdminUserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AdminUserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class SystemConfigResponse(BaseModel):
    id: int
    site_name: str
    logo_url: Optional[str]
    support_email: str
    maintenance_mode: Optional[bool] = False
    global_send_rate_limit: int
    default_from_email: str
    announcement_active: Optional[bool] = False
    announcement_message: Optional[str] = None
    seo_meta_title: Optional[str] = None
    seo_meta_description: Optional[str] = None
    seo_meta_keywords: Optional[str] = None
    default_from_name: Optional[str] = None
    smtp_max_retries: Optional[int] = None
    email_verification_required: Optional[bool] = None
    min_password_length: Optional[int] = None
    max_login_attempts: Optional[int] = None
    session_expiry_hours: Optional[int] = None
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    telegram_notifications_enabled: Optional[bool] = None
    two_factor_email_enabled: Optional[bool] = None
    two_factor_telegram_enabled: Optional[bool] = None
    two_factor_mandatory_for_admins: Optional[bool] = None
    created_at: Optional[datetime] = None

    # System SMTP fields (password excluded for security)
    system_smtp_host: Optional[str] = None
    system_smtp_port: Optional[int] = None
    system_smtp_username: Optional[str] = None
    system_smtp_security: Optional[str] = None
    system_smtp_from_name: Optional[str] = None
    system_smtp_from_email: Optional[str] = None
    system_smtp_enabled: Optional[bool] = None

    api_listener_username: Optional[str] = None
    api_listener_access_key: Optional[str] = None
    api_listener_enabled: Optional[bool] = None
    api_listener_connected_ip: Optional[str] = None
    payment_gateway_trc20: Optional[str] = None
    payment_gateway_bep20: Optional[str] = None
    payment_gateway_usdc_bep20: Optional[str] = None
    payment_gateway_merchant_id: Optional[str] = None
    payment_gateway_qr_code: Optional[str] = None
    payment_gateway_trc20_enabled: Optional[bool] = None
    payment_gateway_bep20_enabled: Optional[bool] = None
    payment_gateway_usdc_bep20_enabled: Optional[bool] = None
    payment_gateway_merchant_enabled: Optional[bool] = None
    extra_settings: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)

class SystemConfigUpdate(BaseModel):
    site_name: Optional[str] = None
    logo_url: Optional[str] = None
    support_email: Optional[str] = None
    global_send_rate_limit: Optional[int] = None
    default_from_email: Optional[str] = None
    announcement_active: Optional[bool] = None
    announcement_message: Optional[str] = None
    seo_meta_title: Optional[str] = None
    seo_meta_description: Optional[str] = None
    seo_meta_keywords: Optional[str] = None
    default_from_name: Optional[str] = None
    smtp_max_retries: Optional[int] = None
    email_verification_required: Optional[bool] = None
    min_password_length: Optional[int] = None
    max_login_attempts: Optional[int] = None
    session_expiry_hours: Optional[int] = None
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    telegram_notifications_enabled: Optional[bool] = None
    two_factor_email_enabled: Optional[bool] = None
    two_factor_telegram_enabled: Optional[bool] = None
    two_factor_mandatory_for_admins: Optional[bool] = None
    # System SMTP fields (plaintext password accepted and encrypted before storing)
    system_smtp_host: Optional[str] = None
    system_smtp_port: Optional[int] = None
    system_smtp_username: Optional[str] = None
    system_smtp_password: Optional[str] = None  # plaintext — encrypted on save
    system_smtp_security: Optional[str] = None
    system_smtp_from_name: Optional[str] = None
    system_smtp_from_email: Optional[str] = None
    system_smtp_enabled: Optional[bool] = None

    api_listener_username: Optional[str] = None
    api_listener_access_key: Optional[str] = None
    api_listener_enabled: Optional[bool] = None
    api_listener_connected_ip: Optional[str] = None
    payment_gateway_trc20: Optional[str] = None
    payment_gateway_bep20: Optional[str] = None
    payment_gateway_usdc_bep20: Optional[str] = None
    payment_gateway_merchant_id: Optional[str] = None
    payment_gateway_qr_code: Optional[str] = None
    payment_gateway_trc20_enabled: Optional[bool] = None
    payment_gateway_bep20_enabled: Optional[bool] = None
    payment_gateway_usdc_bep20_enabled: Optional[bool] = None
    payment_gateway_merchant_enabled: Optional[bool] = None
    extra_settings: Optional[dict] = None


class PaymentLogBase(BaseModel):
    user_email: EmailStr
    amount: float
    currency: str = "USD"
    plan_tier: str = "pro"
    gateway: str = "bKash"
    status: str = "pending"
    action_type: Optional[str] = "add_fund"
    notes: Optional[str] = None

class PaymentLogCreate(PaymentLogBase):
    pass

class PaymentLogResponse(PaymentLogBase):
    id: int
    user_id: Optional[int] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AdminAuditLogResponse(BaseModel):
    id: int
    admin_email: str
    action_type: str
    target_entity: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AdminDashboardStats(BaseModel):
    total_users: int
    new_users_today: int
    active_subscriptions: int
    free_trials: int
    expired_subscriptions: int
    emails_sent_today: int
    emails_sent_month: int
    emails_sent_all_time: int
    revenue_usd_month: float
    revenue_bdt_month: float
    recent_activities: List[AdminAuditLogResponse]


class SubscriptionPlanBase(BaseModel):
    tier: str
    name: str
    price: int
    public_price: Optional[int] = 0
    discount: Optional[int] = 0
    quota: int
    smtp_limit: int
    validity: str = "30 Days"
    throttle: str = "30s update interval"
    features: List[str]

class SubscriptionPlanCreate(SubscriptionPlanBase):
    pass

class SubscriptionPlanUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[int] = None
    public_price: Optional[int] = None
    discount: Optional[int] = None
    quota: Optional[int] = None
    smtp_limit: Optional[int] = None
    validity: Optional[str] = None
    throttle: Optional[str] = None
    features: Optional[List[str]] = None


class SubscriptionPlanResponse(SubscriptionPlanBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    phone_number: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None
    send_password_mail: Optional[bool] = False
    send_profile_email: Optional[bool] = False


class DhruApiLogResponse(BaseModel):
    id: int
    action: str
    username: Optional[str] = None
    ip_address: Optional[str] = None
    status: str
    message: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RemoteBackupConfigResponse(BaseModel):
    id: int
    provider: str
    s3_endpoint: Optional[str] = None
    s3_bucket: Optional[str] = None
    s3_access_key: Optional[str] = None
    s3_region: Optional[str] = None
    s3_folder: Optional[str] = None
    ftp_host: Optional[str] = None
    ftp_port: Optional[int] = 21
    ftp_username: Optional[str] = None
    ftp_path: Optional[str] = None
    ftp_secure: Optional[bool] = True
    schedule_days: int
    retention_count: Optional[int] = 5
    is_active: bool
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RemoteBackupConfigUpdate(BaseModel):
    provider: Optional[str] = None
    s3_endpoint: Optional[str] = None
    s3_bucket: Optional[str] = None
    s3_access_key: Optional[str] = None
    s3_secret_key: Optional[str] = None
    s3_region: Optional[str] = None
    s3_folder: Optional[str] = None
    ftp_host: Optional[str] = None
    ftp_port: Optional[int] = None
    ftp_username: Optional[str] = None
    ftp_password: Optional[str] = None
    ftp_path: Optional[str] = None
    ftp_secure: Optional[bool] = None
    schedule_days: Optional[int] = Field(None, ge=1, le=7)
    retention_count: Optional[int] = Field(None, ge=1, le=30)
    is_active: Optional[bool] = None


class RemoteBackupLogResponse(BaseModel):
    id: int
    filename: str
    status: str
    size_bytes: int
    message: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)





