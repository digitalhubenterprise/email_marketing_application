from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict

# Contact List schemas
class ContactListBase(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str
    description: Optional[str] = None

class ContactListCreate(ContactListBase):
    pass

class ContactListResponse(ContactListBase):
    id: int
    user_id: int
    created_at: datetime
    contacts_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

# Contact schemas
class ContactBase(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
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

    model_config = ConfigDict(from_attributes=True)


class ContactUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    tags: Optional[str] = None
    status: Optional[str] = None
    custom_fields: Optional[str] = None

# CSV upload helper response
class CSVImportResponse(BaseModel):
    success_count: int
    failed_count: int
    skipped_count: int = 0
    errors: List[str]
