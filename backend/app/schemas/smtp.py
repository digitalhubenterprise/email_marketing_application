from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class SMTPServerBase(BaseModel):
    name: str
    host: str
    port: int = Field(..., ge=1, le=65535)
    username: str
    security: str = Field(default="TLS", description="SSL, TLS, or NONE")
    from_name: str
    from_email: EmailStr
    daily_send_limit: int = Field(default=500, ge=1)
    is_active: bool = Field(default=True)

class SMTPServerCreate(SMTPServerBase):
    password: str

class SMTPServerUpdate(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    security: Optional[str] = None
    from_name: Optional[str] = None
    from_email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    daily_send_limit: Optional[int] = None

class SMTPServerResponse(SMTPServerBase):
    id: int
    user_id: int
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SMTPTestRequest(BaseModel):
    host: str
    port: int
    username: str
    password: str
    security: str
    from_email: str
