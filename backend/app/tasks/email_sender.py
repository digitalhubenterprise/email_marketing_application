import asyncio
import re
import json
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from urllib.parse import quote_plus
import aiosmtplib
from celery import Celery
from celery.schedules import crontab
from sqlalchemy import select, update, func

from app.core.config import settings
from app.db.session import AsyncSessionLocal, engine
from app.db.models import Campaign, SMTPServer, Contact, CampaignLog, User, SystemConfig
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


def parse_merge_tags(template: str, contact: Contact) -> str:
    """
    Parses merge tags like {{first_name}}, {{last_name}}, {{email}} or custom JSON keys
    with support for fallback default values, e.g. {{first_name | "Friend"}}.
    """
    name_parts = (contact.name or "").strip().split(" ", 1)
    first_name = name_parts[0] if name_parts else ""
    last_name = name_parts[1] if len(name_parts) > 1 else ""

    custom_data = {}
    if contact.custom_fields:
        try:
            custom_data = json.loads(contact.custom_fields)
        except json.JSONDecodeError:
            pass

    # Match {{key}} or {{key | "fallback"}} or {{key | 'fallback'}}
    pattern = re.compile(r'\{\{\s*([a-zA-Z0-9_]+)(?:\s*\|\s*(?:"([^"]*)"|\'([^\']*)\'))?\s*\}\}')

    def repl(match):
        key = match.group(1).strip().lower()
        fallback_double = match.group(2)
        fallback_single = match.group(3)
        fallback = fallback_double if fallback_double is not None else (fallback_single if fallback_single is not None else "")

        val = None
        if key == "email":
            val = contact.email
        elif key in ("name", "full_name"):
            val = contact.name
        elif key in ("first_name", "firstname"):
            val = first_name
        elif key in ("last_name", "lastname"):
            val = last_name
        else:
            # Try custom data case-insensitively
            for k, v in custom_data.items():
                if k.lower() == key:
                    val = str(v)
                    break

        if val is None or val.strip() == "":
            return fallback
        return val

    return pattern.sub(repl, template)


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


async def handle_bounce(db, contact: Contact, smtp_server: SMTPServer, code: int) -> None:
    """Idempotently updates contact bounce flags and reduces SMTP reputation score."""
    if code >= 500:
        # Hard bounce: block email completely
        contact.status = "bounced"
        contact.is_unsubscribed = True
        if smtp_server:
            smtp_server.reputation_score = max(0, smtp_server.reputation_score - 5)
    elif code >= 400:
        # Soft bounce: allow up to 3 strikes
        custom_data = {}
        if contact.custom_fields:
            try:
                custom_data = json.loads(contact.custom_fields)
            except json.JSONDecodeError:
                pass
        soft_bounces = custom_data.get("soft_bounces", 0) + 1
        custom_data["soft_bounces"] = soft_bounces
        contact.custom_fields = json.dumps(custom_data)

        if smtp_server:
            smtp_server.reputation_score = max(0, smtp_server.reputation_score - 1)

        if soft_bounces >= 3:
            contact.status = "bounced"
            contact.is_unsubscribed = True
    await db.commit()


async def async_send_campaign(campaign_id: int) -> None:
    """
    Core async campaign sending routine.
    - Fetches campaign, SMTP config, and contacts from DB.
    - Implements dynamic A/B subject splitting and winner execution.
    - Personalizes HTML with Jinja-style placeholders and robust fallbacks.
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

        # 3. Load subscribed/active contacts only (Global suppression layer)
        contacts_res = await db.execute(
            select(Contact).where(
                Contact.list_id == campaign.contact_list_id,
                Contact.is_unsubscribed == False,
                Contact.status == "active",
                ~Contact.id.in_(
                    select(CampaignLog.contact_id).where(CampaignLog.campaign_id == campaign_id)
                )
            )
        )
        contacts = contacts_res.scalars().all()
        if not contacts:
            campaign.status = "sent"
            await db.commit()
            return

        # 4. A/B Testing split configuration
        is_ab_test = (
            campaign.subject_b is not None
            and campaign.ab_split_ratio is not None
            and campaign.ab_split_ratio > 0
            and campaign.ab_winner_subject is None
        )

        if is_ab_test:
            # Send to subset for A/B testing
            test_size = int(len(contacts) * (campaign.ab_split_ratio / 100.0))
            if test_size < 2:
                test_size = 2
            contacts = contacts[:test_size]

        # 5. Decrypt SMTP credentials
        plain_password = decrypt_smtp_password(smtp_server.encrypted_password)

        # 6. Open SMTP connection
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

        # Fetch global hourly rate limit
        sys_config_res = await db.execute(select(SystemConfig).where(SystemConfig.id == 1))
        sys_config = sys_config_res.scalars().first()
        global_rate_limit = sys_config.global_send_rate_limit if sys_config else 1000

        # Calculate throttle delay between messages
        throttle_delay = 0.05  # Default 50ms sleep
        if campaign.throttle_limit and campaign.throttle_limit > 0:
            throttle_delay = 3600.0 / campaign.throttle_limit

        # Track processed count in this run to minimize DB checks
        processed_in_run = 0

        # 7. Send to each contact
        for idx, contact in enumerate(contacts):
            # Dynamic check for emergency force-cancel or pause
            try:
                await db.refresh(campaign)
                if campaign.status != "sending":
                    break
            except Exception as e:
                import logging
                logging.getLogger("app.tasks.email_sender").warning("Could not refresh campaign status during loop: %s", e)

            # Global hourly rate limit throttle guard (check on startup and every 10 sends)
            if processed_in_run == 0 or processed_in_run % 10 == 0:
                one_hour_ago = datetime.utcnow() - timedelta(hours=1)
                sent_in_last_hour_res = await db.execute(
                    select(func.count(CampaignLog.id))
                    .join(Campaign, CampaignLog.campaign_id == Campaign.id)
                    .where(
                        Campaign.user_id == campaign.user_id,
                        CampaignLog.status == "sent",
                        CampaignLog.updated_at >= one_hour_ago
                    )
                )
                sent_in_last_hour = sent_in_last_hour_res.scalar() or 0
                if sent_in_last_hour >= global_rate_limit:
                    # Exceeded hourly rate limit! Reschedule campaign to run again in 5 minutes
                    campaign.status = "scheduled"
                    campaign.scheduled_at = datetime.utcnow() + timedelta(minutes=5)
                    await db.commit()
                    break

            processed_in_run += 1

            # Build subject name variation if A/B testing
            subject_to_use = campaign.subject
            subject_code = None

            if is_ab_test:
                if idx % 2 == 0:
                    subject_to_use = campaign.subject
                    subject_code = "A"
                else:
                    subject_to_use = campaign.subject_b
                    subject_code = "B"
            elif campaign.ab_winner_subject:
                subject_to_use = campaign.ab_winner_subject

            log = CampaignLog(
                campaign_id=campaign.id,
                contact_id=contact.id,
                email=contact.email,
                status="pending",
                error_code=subject_code, # Store 'A' or 'B' label to compute click/open winner
            )
            db.add(log)
            await db.flush()  # Get log.id immediately

            # Personalize subject & body
            personalized_subject = parse_merge_tags(subject_to_use, contact)
            personalized_html = parse_merge_tags(campaign.content_html, contact)

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
            
            # RFC 8058 One-Click Unsubscribe headers
            import hmac
            import hashlib
            unsubscribe_token = hmac.new(settings.JWT_SECRET.encode(), str(contact.id).encode(), hashlib.sha256).hexdigest()
            unsubscribe_url = f"{settings.TRACKING_BASE_URL}/api/track/unsubscribe/{contact.id}?token={unsubscribe_token}"
            message["List-Unsubscribe"] = f"<{unsubscribe_url}>"
            message["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"

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
            except aiosmtplib.SMTPResponseException as mail_err:
                log.status = "failed"
                log.error_code = str(mail_err.code)
                log.error_message = str(mail_err.message)[:500]
                await handle_bounce(db, contact, smtp_server, mail_err.code)
            except Exception as mail_err:
                log.status = "failed"
                code_match = re.search(r'\b([45]\d{2})\b', str(mail_err))
                code = int(code_match.group(1)) if code_match else 550
                log.error_code = str(code)
                log.error_message = str(mail_err)[:500]
                await handle_bounce(db, contact, smtp_server, code)

            await db.commit()
            await asyncio.sleep(max(0.05, throttle_delay))  # Enforce rate throttling boundary

        # 8. Clean disconnect
        try:
            await smtp_client.quit()
        except Exception as e:
            import logging
            logging.getLogger("app.tasks.email_sender").debug("SMTP client connection close error: %s", e)

        # If we successfully sent the A/B testing subset, pause and schedule evaluator in 2 hours
        if is_ab_test and campaign.status == "sending":
            campaign.status = "paused"
            await db.commit()
            # Schedule automatic A/B subject winner selection task to fire after 2 hours
            evaluate_ab_test_task.apply_async(args=[campaign.id], countdown=7200)
        elif campaign.status == "sending":
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


@celery.task(name="app.tasks.email_sender.evaluate_ab_test_task")
def evaluate_ab_test_task(campaign_id: int) -> None:
    """Evaluates the winner of an A/B split subject test and resumes sending with the winning subject."""
    async def run():
        async with AsyncSessionLocal() as db:
            campaign_res = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
            campaign = campaign_res.scalars().first()
            if not campaign:
                return

            # Count opens for A vs B
            a_sent = await db.execute(select(func.count(CampaignLog.id)).where(CampaignLog.campaign_id == campaign_id, CampaignLog.error_code == "A"))
            a_sent_count = a_sent.scalar() or 0

            a_opens = await db.execute(select(func.count(CampaignLog.id)).where(CampaignLog.campaign_id == campaign_id, CampaignLog.error_code == "A", CampaignLog.opened == True))
            a_opens_count = a_opens.scalar() or 0

            b_sent = await db.execute(select(func.count(CampaignLog.id)).where(CampaignLog.campaign_id == campaign_id, CampaignLog.error_code == "B"))
            b_sent_count = b_sent.scalar() or 0

            b_opens = await db.execute(select(func.count(CampaignLog.id)).where(CampaignLog.campaign_id == campaign_id, CampaignLog.error_code == "B", CampaignLog.opened == True))
            b_opens_count = b_opens.scalar() or 0

            a_rate = (a_opens_count / a_sent_count) if a_sent_count > 0 else 0.0
            b_rate = (b_opens_count / b_sent_count) if b_sent_count > 0 else 0.0

            if b_rate > a_rate:
                campaign.ab_winner_subject = campaign.subject_b
            else:
                campaign.ab_winner_subject = campaign.subject

            # Resume sending campaign to the remainder of the contacts
            campaign.status = "sending"
            await db.commit()

            # Trigger celery task
            send_campaign_task.delay(campaign.id)

    try:
        asyncio.run(run())
    except Exception as exc:
        print(f"Error evaluating A/B test campaign {campaign_id}: {exc}")


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


async def async_prune_old_dhru_logs() -> None:
    """Deletes Dhru Api Log entries older than 30 days."""
    from app.db.models import DhruApiLog
    from sqlalchemy import delete
    await engine.dispose()
    async with AsyncSessionLocal() as db:
        cutoff = datetime.utcnow() - timedelta(days=30)
        await db.execute(delete(DhruApiLog).where(DhruApiLog.created_at < cutoff))
        await db.commit()
    await engine.dispose()


@celery.task(name="app.tasks.email_sender.prune_old_dhru_logs_task")
def prune_old_dhru_logs_task() -> None:
    """Prunes old Dhru API logs."""
    try:
        asyncio.run(async_prune_old_dhru_logs())
    except Exception as exc:
        print(f"Error pruning old Dhru logs: {exc}")


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

    # Prune old Dhru API logs daily at midnight UTC
    sender.add_periodic_task(
        crontab(hour="0", minute="0"),
        prune_old_dhru_logs_task.s(),
        name="prune-old-dhru-logs-task"
    )

    # Check for scheduled Telegram AI posts every 60 seconds
    try:
        from app.tasks.telegram_tasks import check_scheduled_telegram_posts_task
        sender.add_periodic_task(
            60.0,
            check_scheduled_telegram_posts_task.s(),
            name="check-scheduled-telegram-posts-every-60s"
        )
    except Exception as e:
        print(f"Error loading Telegram periodic task: {e}")


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


@celery.task(name="app.tasks.email_sender.send_system_email_task")
def send_system_email_task(recipient_email: str, subject: str, html_body: str) -> None:
    """
    Background task to dispatch system emails (welcome, OTP, password reset, alerts)
    using the platform-configured System SMTP settings from SystemConfig.
    Falls back to console logging if no system SMTP is configured.
    """
    async def run():
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(SystemConfig).where(SystemConfig.id == 1))
            config = res.scalars().first()

            if not config:
                print(f"[SYSTEM EMAIL] No system config found. Skipping email to {recipient_email}.")
                return

            # Use system SMTP if configured and enabled
            if config.system_smtp_enabled and config.system_smtp_host and config.system_smtp_username:
                host = config.system_smtp_host
                port = config.system_smtp_port or 587
                username = config.system_smtp_username
                password = decrypt_smtp_password(config.system_smtp_encrypted_password or "")
                security = (config.system_smtp_security or "TLS").upper()
                from_name = config.system_smtp_from_name or config.site_name or "SmartCampaign"
                from_email = config.system_smtp_from_email or config.default_from_email or "noreply@smartcampaign.today"

                try:
                    msg = MIMEMultipart("alternative")
                    msg["Subject"] = subject
                    msg["From"] = f"{from_name} <{from_email}>"
                    msg["To"] = recipient_email
                    msg.attach(MIMEText(html_body, "html", "utf-8"))

                    use_ssl = security == "SSL"
                    start_tls = security == "TLS"

                    smtp_client = aiosmtplib.SMTP(
                        hostname=host,
                        port=port,
                        use_tls=use_ssl,
                        timeout=30,
                    )
                    await smtp_client.connect()
                    if start_tls:
                        await smtp_client.starttls()
                    await smtp_client.login(username, password)
                    await smtp_client.send_message(msg)
                    await smtp_client.quit()

                    print(f"[SYSTEM EMAIL SENT] To: {recipient_email} | Subject: {subject} | From: {from_email}")

                except Exception as smtp_err:
                    print(f"[SYSTEM EMAIL ERROR] Failed to send to {recipient_email}: {smtp_err}")

            else:
                # Fallback: log to console when no system SMTP is configured
                from_email = config.default_from_email if config else "noreply@smartcampaign.today"
                site_name = config.site_name if config else "SmartCampaign"
                print(f"[SYSTEM EMAIL LOG] Site: {site_name} | From: {from_email} | To: {recipient_email}")
                print(f"[SYSTEM EMAIL LOG] Subject: {subject}")
                print(f"[SYSTEM EMAIL LOG] NOTE: Configure System SMTP in Admin Settings to enable real delivery.")

    try:
        asyncio.run(run())
    except Exception as exc:
        print(f"Error executing system email task: {exc}")
