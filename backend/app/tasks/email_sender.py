import asyncio
import re
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import aiosmtplib
from celery import Celery
from sqlalchemy import select, update

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.db.models import Campaign, SMTPServer, Contact, CampaignLog
from app.core.security import decrypt_smtp_password

# Initialize Celery app
celery = Celery(
    "smartcampaign_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# Regex helper to parse and wrap links for click tracking
LINK_REGEX = re.compile(r'href="([^"]+)"')

def wrap_links_with_tracking(html_content: str, log_id: int) -> str:
    """Replaces standard links inside HTML email body with tracking redirect links."""
    def replace_link(match):
        original_url = match.group(1)
        # Avoid double-wrapping or wrapping pixel trackers
        if "api/track/click" in original_url or "api/track/open" in original_url or original_url.startswith("#"):
            return match.group(0)
        return f'href="{settings.TRACKING_BASE_URL}/api/track/click/{log_id}?url={original_url}"'
        
    return LINK_REGEX.sub(replace_link, html_content)

async def async_send_campaign(campaign_id: int):
    """Executes asynchronous campaign sending, SMTP connections, and tracks deliverability logs."""
    async with AsyncSessionLocal() as db:
        # 1. Fetch Campaign with related SMTPServer details
        campaign_query = select(Campaign).where(Campaign.id == campaign_id)
        campaign_res = await db.execute(campaign_query)
        campaign = campaign_res.scalars().first()
        
        if not campaign or campaign.status != "sending":
            return
            
        smtp_query = select(SMTPServer).where(SMTPServer.id == campaign.smtp_server_id)
        smtp_res = await db.execute(smtp_query)
        smtp_server = smtp_res.scalars().first()
        
        if not smtp_server:
            campaign.status = "failed"
            await db.commit()
            return
            
        # 2. Fetch target list contacts (who are not unsubscribed)
        contacts_query = select(Contact).where(
            Contact.list_id == campaign.contact_list_id,
            Contact.is_unsubscribed == False
        )
        contacts_res = await db.execute(contacts_query)
        contacts = contacts_res.scalars().all()
        
        if not contacts:
            campaign.status = "sent"
            await db.commit()
            return
            
        # Decrypt password for SMTP Auth
        plain_password = decrypt_smtp_password(smtp_server.encrypted_password)
        
        # 3. Create SMTP Client socket
        use_tls = smtp_server.security.upper() == "SSL"
        start_tls = smtp_server.security.upper() == "TLS"
        
        smtp_client = aiosmtplib.SMTP(
            hostname=smtp_server.host,
            port=smtp_server.port,
            use_tls=use_tls,
            timeout=15
        )
        
        try:
            await smtp_client.connect()
            if start_tls:
                await smtp_client.starttls()
            if smtp_server.username and plain_password:
                await smtp_client.login(smtp_server.username, plain_password)
        except Exception as e:
            # Complete SMTP handshake failure
            campaign.status = "failed"
            await db.commit()
            return
            
        sent_successful = 0
        
        # 4. Dispatch to each individual contact
        for contact in contacts:
            # Create a CampaignLog to track stats for this contact
            log = CampaignLog(
                campaign_id=campaign.id,
                contact_id=contact.id,
                email=contact.email,
                status="pending"
            )
            db.add(log)
            await db.flush()  # Gets the log.id immediately
            
            # Personalize placeholders
            pers_name = contact.name if contact.name else "Subscriber"
            personalized_subject = campaign.subject.replace("{{name}}", pers_name).replace("{{email}}", contact.email)
            personalized_html = campaign.content_html.replace("{{name}}", pers_name).replace("{{email}}", contact.email)
            
            # Inject Open Tracking Pixel (transparent GIF image) at the end of the HTML body
            open_tracker_url = f"{settings.TRACKING_BASE_URL}/api/track/open/{log.id}"
            pixel_tag = f'<img src="{open_tracker_url}" width="1" height="1" style="display:none !important;" />'
            
            # Inject Click Link Trackers
            personalized_html = wrap_links_with_tracking(personalized_html, log.id)
            
            if "</body>" in personalized_html:
                personalized_html = personalized_html.replace("</body>", f"{pixel_tag}</body>")
            else:
                personalized_html += pixel_tag
                
            # Construct Multipurpose Internet Mail MIME message
            message = MIMEMultipart("alternative")
            message["Subject"] = personalized_subject
            message["From"] = f"{smtp_server.from_name} <{smtp_server.from_email}>"
            message["To"] = contact.email
            
            html_part = MIMEText(personalized_html, "html", "utf-8")
            message.attach(html_part)
            
            try:
                # Dispatch email via active SMTP socket
                await smtp_client.send_message(message)
                log.status = "sent"
                sent_successful += 1
                
                # Update realtime statistics in Campaign & User quota
                await db.execute(
                    update(Campaign)
                    .where(Campaign.id == campaign.id)
                    .values(sent_count=Campaign.sent_count + 1)
                )
                await db.execute(
                    update(User)
                    .where(User.id == campaign.user_id)
                    .values(quota_sent=User.quota_sent + 1)
                )
                
            except Exception as mail_err:
                log.status = "failed"
                log.error_message = str(mail_err)
                
            await db.commit()
            
            # Sleep slightly to respect rates limits and prevent ISP throttles (50ms)
            await asyncio.sleep(0.05)
            
        # Cleanly disconnect from SMTP server
        try:
            await smtp_client.quit()
        except Exception:
            pass
            
        # Finalize Campaign status
        campaign.status = "sent"
        await db.commit()

@celery.task(name="app.tasks.email_sender.send_campaign_task")
def send_campaign_task(campaign_id: int):
    """Celery worker entrypoint wrapper to run async send routine in sync worker threads."""
    asyncio.run(async_send_campaign(campaign_id))
