from datetime import datetime
from pydantic import BaseModel, ConfigDict

class EmailTemplateBase(BaseModel):
    name: str
    subject: str
    content_html: str

class EmailTemplateCreate(EmailTemplateBase):
    pass

class EmailTemplateResponse(EmailTemplateBase):
    id: int
    user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

