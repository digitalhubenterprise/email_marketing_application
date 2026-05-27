from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

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

    class Config:
        from_attributes = True

class AdminUserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class SystemConfigResponse(BaseModel):
    id: int
    site_name: str
    logo_url: Optional[str]
    support_email: str
    maintenance_mode: bool
    global_send_rate_limit: int
    default_from_email: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class SystemConfigUpdate(BaseModel):
    site_name: Optional[str] = None
    logo_url: Optional[str] = None
    support_email: Optional[str] = None
    global_send_rate_limit: Optional[int] = None
    default_from_email: Optional[str] = None

class PaymentLogBase(BaseModel):
    user_email: EmailStr
    amount: int
    currency: str = "USD"
    plan_tier: str = "pro"
    gateway: str = "bKash"
    notes: Optional[str] = None

class PaymentLogCreate(PaymentLogBase):
    pass

class PaymentLogResponse(PaymentLogBase):
    id: int
    user_id: Optional[int] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class AdminAuditLogResponse(BaseModel):
    id: int
    admin_email: str
    action_type: str
    target_entity: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AdminDashboardStats(BaseModel):
    total_users: int
    new_users_today: int
    active_subscriptions: int
    free_trials: int
    expired_subscriptions: int
    emails_sent_today: int
    emails_sent_month: int
    emails_sent_all_time: int
    revenue_usd_month: int
    revenue_bdt_month: int
    recent_activities: List[AdminAuditLogResponse]
