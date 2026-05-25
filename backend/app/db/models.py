from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

def utc_now_naive():
    """Generates a timezone-naive UTC datetime for seamless TIMESTAMP compatibility."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    subscription_tier = Column(String, default="free")  # free, pro, business
    quota_limit = Column(Integer, default=1000)        # Max monthly sends
    quota_sent = Column(Integer, default=0)            # Current month sends
    created_at = Column(DateTime, default=utc_now_naive)

    smtp_servers = relationship("SMTPServer", back_populates="user", cascade="all, delete-orphan")
    contact_lists = relationship("ContactList", back_populates="user", cascade="all, delete-orphan")
    templates = relationship("EmailTemplate", back_populates="user", cascade="all, delete-orphan")
    campaigns = relationship("Campaign", back_populates="user", cascade="all, delete-orphan")


class SMTPServer(Base):
    __tablename__ = "smtp_servers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    host = Column(String, nullable=False)
    port = Column(Integer, nullable=False)
    username = Column(String, nullable=False)
    encrypted_password = Column(String, nullable=False)
    security = Column(String, default="TLS")  # SSL, TLS, NONE
    from_name = Column(String, nullable=False)
    from_email = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now_naive)

    user = relationship("User", back_populates="smtp_servers")
    campaigns = relationship("Campaign", back_populates="smtp_server")


class ContactList(Base):
    __tablename__ = "contact_lists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now_naive)

    user = relationship("User", back_populates="contact_lists")
    contacts = relationship("Contact", back_populates="contact_list", cascade="all, delete-orphan")
    campaigns = relationship("Campaign", back_populates="contact_list")


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    list_id = Column(Integer, ForeignKey("contact_lists.id", ondelete="CASCADE"), nullable=False)
    email = Column(String, index=True, nullable=False)
    name = Column(String, nullable=True)
    tags = Column(String, nullable=True)  # Comma-separated strings
    is_unsubscribed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now_naive)

    contact_list = relationship("ContactList", back_populates="contacts")
    campaign_logs = relationship("CampaignLog", back_populates="contact", cascade="all, delete-orphan")


class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    content_html = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now_naive)

    user = relationship("User", back_populates="templates")


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    content_html = Column(Text, nullable=False)
    smtp_server_id = Column(Integer, ForeignKey("smtp_servers.id", ondelete="SET NULL"), nullable=True)
    contact_list_id = Column(Integer, ForeignKey("contact_lists.id", ondelete="SET NULL"), nullable=True)
    status = Column(String, default="draft")  # draft, scheduled, sending, sent, failed
    total_recipients = Column(Integer, default=0)
    sent_count = Column(Integer, default=0)
    open_count = Column(Integer, default=0)
    click_count = Column(Integer, default=0)
    scheduled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now_naive)

    user = relationship("User", back_populates="campaigns")
    smtp_server = relationship("SMTPServer", back_populates="campaigns")
    contact_list = relationship("ContactList", back_populates="campaigns")
    logs = relationship("CampaignLog", back_populates="campaign", cascade="all, delete-orphan")


class CampaignLog(Base):
    __tablename__ = "campaign_logs"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False)
    email = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending, sent, bounced, failed
    opened = Column(Boolean, default=False)
    clicked = Column(Boolean, default=False)
    error_message = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=utc_now_naive, onupdate=utc_now_naive)

    campaign = relationship("Campaign", back_populates="logs")
    contact = relationship("Contact", back_populates="campaign_logs")
