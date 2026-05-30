from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr

# Contact List schemas
class ContactListBase(BaseModel):
    name: str
    description: Optional[str] = None

class ContactListCreate(ContactListBase):
    pass

class ContactListResponse(ContactListBase):
    id: int
    user_id: int
    created_at: datetime
    contacts_count: Optional[int] = 0

    class Config:
        from_attributes = True

# Contact schemas
class ContactBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    tags: Optional[str] = None  # comma-separated
    status: Optional[str] = "active"
    custom_fields: Optional[str] = "{}"

class ContactCreate(ContactBase):
    pass

class ContactResponse(ContactBase):
    id: int
    list_id: int
    is_unsubscribed: bool
    created_at: datetime

    class Config:
        from_attributes = True

# CSV upload helper response
class CSVImportResponse(BaseModel):
    success_count: int
    failed_count: int
    errors: List[str]
