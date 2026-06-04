from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class TelegramMarketingConfigBase(BaseModel):
    telegram_channel: Optional[str] = None
    interval_hours: int = Field(default=2, ge=1, le=168)
    is_active: bool = False
    website_url: Optional[str] = "iPhoneUnlock.org"

class TelegramMarketingConfigUpdate(TelegramMarketingConfigBase):
    telegram_bot_token: Optional[str] = None
    groq_api_key: Optional[str] = None

class TelegramMarketingConfigResponse(TelegramMarketingConfigBase):
    id: int
    user_id: int
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    created_at: datetime
    has_bot_token: bool
    has_groq_key: bool

    class Config:
        from_attributes = True

class TelegramServiceBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., min_length=1, max_length=50)
    group: Optional[str] = "General"
    focus: str = Field(..., min_length=1)
    angle: str = Field(..., min_length=1, max_length=255)
    active: bool = True

class TelegramServiceCreate(TelegramServiceBase):
    pass

class TelegramServiceUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    group: Optional[str] = None
    focus: Optional[str] = None
    angle: Optional[str] = None
    active: Optional[bool] = None

class TelegramServiceResponse(TelegramServiceBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class TelegramLogResponse(BaseModel):
    id: int
    timestamp: datetime
    service_title: str
    category: str
    status: str
    message: str

    class Config:
        from_attributes = True

class TelegramMarketingStats(BaseModel):
    total_posts: int
    success_posts: int
    failed_posts: int
    active_services: int
    inactive_services: int
    scheduler_status: str
