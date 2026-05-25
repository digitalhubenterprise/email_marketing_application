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

class TokenData(BaseModel):
    user_id: Optional[int] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    subscription_tier: str
    quota_limit: int
    quota_sent: int
    created_at: datetime

    class Config:
        from_attributes = True
