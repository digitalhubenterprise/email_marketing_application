from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class SMSConfigBase(BaseModel):
    api_key: Optional[str] = None
    sender_id: Optional[str] = None
    provider: str = Field(default="bulksmsbd", description="bulksmsbd, twilio, vonage, custom")
    is_active: bool = True
    bulksmsbd_api_key: Optional[str] = None
    bulksmsbd_sender_id: Optional[str] = None
    twilio_api_key: Optional[str] = None
    twilio_sender_id: Optional[str] = None
    vonage_api_key: Optional[str] = None
    vonage_sender_id: Optional[str] = None
    custom_api_key: Optional[str] = None
    custom_sender_id: Optional[str] = None

class SMSConfigCreate(SMSConfigBase):
    pass

class SMSConfigResponse(SMSConfigBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class SMSCampaignBase(BaseModel):
    name: str
    sender_id: str
    message: str

class SMSCampaignCreate(BaseModel):
    name: str
    sender_id: str
    message: str
    recipients: str  # Comma-separated list of numbers

class SMSCampaignResponse(SMSCampaignBase):
    id: int
    user_id: int
    total_recipients: int
    sent_count: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class SMSLogResponse(BaseModel):
    id: int
    timestamp: datetime
    recipient: str
    sender_id: str
    message: str
    status: str
    response_code: Optional[str] = None
    response_message: Optional[str] = None

    class Config:
        from_attributes = True

class SMSLogsPaginated(BaseModel):
    logs: List[SMSLogResponse]
    total: int

class SMSTestRequest(BaseModel):
    recipient: str
    message: str
    api_key: str
    sender_id: str
    provider: str = "bulksmsbd"

class SMSBalanceResponse(BaseModel):
    balance: str
    currency: str = "BDT"


class SMSGroupBase(BaseModel):
    name: str
    description: Optional[str] = None

class SMSGroupCreate(SMSGroupBase):
    pass

class SMSGroupResponse(SMSGroupBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class SMSNumberBase(BaseModel):
    phone_number: str
    name: Optional[str] = None

class SMSNumberCreate(SMSNumberBase):
    group_id: int

class SMSNumberResponse(SMSNumberBase):
    id: int
    group_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class SMSGroupWithNumbersResponse(SMSGroupResponse):
    numbers: List[SMSNumberResponse] = []


class SMSTemplateBase(BaseModel):
    title: str
    body: str

class SMSTemplateCreate(SMSTemplateBase):
    pass

class SMSTemplateResponse(SMSTemplateBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
