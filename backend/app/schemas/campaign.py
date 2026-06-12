from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class CampaignBase(BaseModel):
    name: str
    subject: str
    subject_b: Optional[str] = None
    ab_split_ratio: Optional[int] = 0
    ab_winner_metric: Optional[str] = None
    ab_winner_subject: Optional[str] = None
    throttle_limit: Optional[int] = 0
    category: Optional[str] = "Newsletter"
    is_archived: Optional[bool] = False
    content_html: str
    smtp_server_id: Optional[int] = None
    contact_list_id: Optional[int] = None
    scheduled_at: Optional[datetime] = None
    auto_resend_hours: Optional[int] = 0
    sending_mode: Optional[str] = "auto" # auto, manual

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

    model_config = ConfigDict(from_attributes=True)

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

    model_config = ConfigDict(from_attributes=True)

# Dashboard overall stats
class DashboardStats(BaseModel):
    total_emails_sent: int
    avg_open_rate: float
    avg_click_rate: float
    total_lists: int
    total_contacts: int
    smtp_health: bool
    recent_campaigns: List[CampaignResponse]
