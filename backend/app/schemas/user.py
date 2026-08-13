from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    phone_number: Optional[str] = None
    website_hp: Optional[str] = None

class UserLogin(UserBase):
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: Optional[str] = None
    email: Optional[str] = None

class TokenData(BaseModel):
    user_id: Optional[int] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    subscription_tier: str
    quota_limit: int
    quota_sent: int
    brand_primary_color: Optional[str] = "#4c6ef5"
    brand_secondary_color: Optional[str] = "#fab005"
    brand_font_family: Optional[str] = "Inter"
    notification_settings: Optional[str] = "all"
    two_factor_enabled: bool = False
    two_factor_telegram_enabled: bool = False
    telegram_chat_id: Optional[str] = None
    email_verified: bool = False
    username: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    phone_number: Optional[str] = None
    language: Optional[str] = "English"
    timezone: Optional[str] = "UTC"
    created_at: datetime
    subscription_expires_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

