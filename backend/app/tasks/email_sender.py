import asyncio
import re
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from urllib.parse import quote_plus
import aiosmtplib
from celery import Celery
from celery.schedules import crontab
from sqlalchemy import select, update

from app.core.config import settings
from app.db.session import AsyncSessionLocal, engine
from app.db.models import Campaign, SMTPServer, Contact, CampaignLog, User
from app.core.security import decrypt_smtp_password

# Initialize Celery broker
celery = Celery(
    "smartcampaign_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

# Regex to find <a href="..."> links in HTML for click tracking injection
LINK_REGEX = re.compile(r'href="([^"]+)"', re.IGNORECASE)

# Schemes that should NOT be wrapped with tracking (already wrapped, anchors, tracking routes)
SKIP_TRACKING_PATTERNS = ("api/track/", "#", "mailto:", "tel:")


def wrap_links_with_tracking(html_content: str, log_id: int) -> str:
    """
    Replaces <a href="..."> links in HTML with click-tracking redirect URLs.
    - Skips already-tracked URLs, anchors, mailto:, tel: links.
    - Properly URL-encodes the original URL to prevent injection.
    """
    def replace_link(match: re.Match) -> str:
        original_url = match.group(1)
        if any(pattern in original_url for pattern in SKIP_TRACKING_PATTERNS):
            return match.group(0)
        encoded_url = quote_plus(original_url)
        tracking_url = f"{settings.TRACKING_BASE_URL}/api/track/click/{log_id}?url={encoded_url}"
        return f'href="{tracking_url}"'

    return LINK_REGEX.sub(replace_link, html_content)


def inject_open_pixel(html_content: str, open_tracker_url: str) -> str:
    """Injects a 1x1 tracking pixel before </body> or appends to end of HTML."""
    pixel_tag = (
        f'<img src="{open_tracker_url}" width="1" height="1" '
        f'alt="" style="display:none !important;border:0;outline:0;'
        f'padding:0;margin:0;" />'
    )
    if "</body>" in html_content.lower():
        # Case-insensitive replacement
        idx = html_content.lower().rfind("</body>")
        return html_content[:idx] + pixel_tag + html_content[idx:]
    return html_content + pixel_tag


async def async_send_campaign(campaign_id: int) -> None:
    """
    Core async campaign sending routine.
    - Fetches campaign, SMTP config, and contacts from DB.
    - Personalizes HTML with Jinja-style {{name}}/{{email}} placeholders.
    - Injects open pixel + click tracking links.
    - Sends via aiosmtplib with rate-limiting sleep.
    - Updates sent_count and quota_sent in real time.
    """
    await engine.dispose()  # Reset connection pool for worker process

    async with AsyncSessionLocal() as db:
        # 1. Load campaign
        campaign_res = await db.execute(
            select(Campaign).where(Campaign.id == campaign_id)
        )
        campaign = campaign_res.scalars().first()
        if not campaign or campaign.status != "sending":
            return

        # 2. Load SMTP server
        smtp_res = await db.execute(
            select(SMTPServer).where(SMTPServer.id == campaign.smtp_server_id)
        )
        smtp_server = smtp_res.scalars().first()
        if not smtp_server:
            campaign.status = "failed"
            await db.commit()
            return

        # 3. Load subscribed contacts only
        contacts_res = await db.execute(
            select(Contact).where(
                Contact.list_id == campaign.contact_list_id,
                Contact.is_unsubscribed == False,
            )
        )
        contacts = contacts_res.scalars().all()
        if not contacts:
            campaign.status = "sent"
            await db.commit()
            return

        # 4. Decrypt SMTP credentials
        plain_password = decrypt_smtp_password(smtp_server.encrypted_password)

        # 5. Open SMTP connection
        use_tls = smtp_server.security.upper() == "SSL"
        start_tls = smtp_server.security.upper() == "TLS"

        smtp_client = aiosmtplib.SMTP(
            hostname=smtp_server.host,
            port=smtp_server.port,
            use_tls=use_tls,
            timeout=20,
        )

        try:
            await smtp_client.connect()
            if start_tls:
                await smtp_client.starttls()
            if smtp_server.username and plain_password:
                await smtp_client.login(smtp_server.username, plain_password)
        except Exception:
            campaign.status = "failed"
            await db.commit()
            return

        # 6. Send to each contact
        for contact in contacts:
            log = CampaignLog(
                campaign_id=campaign.id,
                contact_id=contact.id,
                email=contact.email,
                status="pending",
            )
            db.add(log)
            await db.flush()  # Get log.id immediately

            # Personalize content
            display_name = contact.name.strip() if contact.name else "Subscriber"
            personalized_subject = (
                campaign.subject
                .replace("{{name}}", display_name)
                .replace("{{email}}", contact.email)
            )
            personalized_html = (
                campaign.content_html
                .replace("{{name}}", display_name)
                .replace("{{email}}", contact.email)
            )

            # Inject click tracking
            personalized_html = wrap_links_with_tracking(personalized_html, log.id)

            # Inject open pixel
            open_tracker_url = f"{settings.TRACKING_BASE_URL}/api/track/open/{log.id}"
            personalized_html = inject_open_pixel(personalized_html, open_tracker_url)

            # Build MIME message
            message = MIMEMultipart("alternative")
            message["Subject"] = personalized_subject
            message["From"] = f"{smtp_server.from_name} <{smtp_server.from_email}>"
            message["To"] = contact.email
            message["X-Mailer"] = "SmartCampaign/1.0"
            message.attach(MIMEText(personalized_html, "html", "utf-8"))

            try:
                await smtp_client.send_message(message)
                log.status = "sent"

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
                log.error_message = str(mail_err)[:500]  # Cap error message length

            await db.commit()
            await asyncio.sleep(0.05)  # 50ms inter-message delay for ISP rate limits

        # 7. Clean disconnect
        try:
            await smtp_client.quit()
        except Exception:
            pass

        campaign.status = "sent"
        await db.commit()

    await engine.dispose()


@celery.task(name="app.tasks.email_sender.send_campaign_task", bind=True, max_retries=2)
def send_campaign_task(self, campaign_id: int) -> None:
    """Celery worker entry point — wraps async send routine in sync context."""
    try:
        asyncio.run(async_send_campaign(campaign_id))
    except Exception as exc:
        # Retry up to 2 times with 60s delay on unexpected failure
        raise self.retry(exc=exc, countdown=60)


async def async_reset_monthly_quotas() -> None:
    """Resets quota_sent back to 0 for all users at the beginning of the month."""
    await engine.dispose()
    async with AsyncSessionLocal() as db:
        await db.execute(update(User).values(quota_sent=0))
        await db.commit()
    await engine.dispose()


@celery.task(name="app.tasks.email_sender.reset_monthly_quotas_task")
def reset_monthly_quotas_task() -> None:
    """Resets all users' quota_sent to 0 monthly."""
    try:
        asyncio.run(async_reset_monthly_quotas())
    except Exception as exc:
        print(f"Error resetting monthly quotas: {exc}")


@celery.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    # Check for scheduled campaigns every 10 seconds
    sender.add_periodic_task(
        10.0,
        check_scheduled_campaigns_task.s(),
        name="check-scheduled-campaigns-every-10s"
    )

    # Reset monthly quota on the 1st of every month at midnight UTC
    sender.add_periodic_task(
        crontab(day_of_month="1", hour="0", minute="0"),
        reset_monthly_quotas_task.s(),
        name="reset-monthly-quotas-task"
    )


async def async_check_scheduled_campaigns() -> None:
    """Finds scheduled campaigns whose time has passed, sets status to sending, and triggers dispatch."""
    await engine.dispose()
    async with AsyncSessionLocal() as db:
        now = datetime.utcnow()
        result = await db.execute(
            select(Campaign).where(
                Campaign.status == "scheduled",
                Campaign.scheduled_at <= now
            )
        )
        campaigns = result.scalars().all()
        for campaign in campaigns:
            # Shift status immediately to prevent double scheduling
            campaign.status = "sending"
            await db.commit()
            
            # Fire Celery task
            send_campaign_task.delay(campaign.id)
    await engine.dispose()


@celery.task(name="app.tasks.email_sender.check_scheduled_campaigns_task")
def check_scheduled_campaigns_task() -> None:
    """Beat periodic task wrapper — runs scheduled check async."""
    try:
        asyncio.run(async_check_scheduled_campaigns())
    except Exception as exc:
        print(f"Error executing scheduled campaigns check: {exc}")
