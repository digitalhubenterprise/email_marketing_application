from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class CampaignBase(BaseModel):
    name: str
    subject: str
    content_html: str
    smtp_server_id: Optional[int] = None
    contact_list_id: Optional[int] = None
    scheduled_at: Optional[datetime] = None

class CampaignCreate(CampaignBase):
    pass

class CampaignResponse(CampaignBase):
    id: int
    user_id: int
    status: str
    total_recipients: int
    sent_count: int
    open_count: int
    click_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class CampaignLogResponse(BaseModel):
    id: int
    campaign_id: int
    contact_id: int
    email: str
    status: str
    opened: bool
    clicked: bool
    error_message: Optional[str] = None
    updated_at: datetime

    class Config:
        from_attributes = True

# Dashboard overall stats
class DashboardStats(BaseModel):
    total_emails_sent: int
    avg_open_rate: float
    avg_click_rate: float
    total_lists: int
    total_contacts: int
    smtp_health: bool
    recent_campaigns: List[CampaignResponse]
