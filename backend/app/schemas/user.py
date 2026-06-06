from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

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
    created_at: datetime

    class Config:
        from_attributes = True
