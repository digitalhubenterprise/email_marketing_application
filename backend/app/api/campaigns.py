from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.db.session import get_db
from app.db.models import Campaign, SMTPServer, ContactList, Contact, User, CampaignLog
from app.schemas.campaign import CampaignCreate, CampaignResponse, CampaignLogResponse, DashboardStats
from app.api.deps import get_current_user

router = APIRouter()


# ─────────────────────── Dashboard (MUST be before /{campaign_id} routes) ───────────────────────

@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_aggregates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns aggregated metrics for the authenticated user's campaign dashboard."""

    # Total sent
    total_sent = (
        await db.execute(
            select(func.sum(Campaign.sent_count)).where(Campaign.user_id == current_user.id)
        )
    ).scalar() or 0

    # Open rate
    open_res = (
        await db.execute(
            select(func.sum(Campaign.open_count), func.sum(Campaign.sent_count))
            .where(Campaign.user_id == current_user.id)
        )
    ).first()
    sum_opens = open_res[0] or 0
    sum_sends = open_res[1] or 0
    avg_open_rate = round((sum_opens / sum_sends * 100), 2) if sum_sends > 0 else 0.0

    # Click rate
    click_res = (
        await db.execute(
            select(func.sum(Campaign.click_count), func.sum(Campaign.sent_count))
            .where(Campaign.user_id == current_user.id)
        )
    ).first()
    sum_clicks = click_res[0] or 0
    sum_sends_c = click_res[1] or 0
    avg_click_rate = round((sum_clicks / sum_sends_c * 100), 2) if sum_sends_c > 0 else 0.0

    # List count
    total_lists = (
        await db.execute(
            select(func.count(ContactList.id)).where(ContactList.user_id == current_user.id)
        )
    ).scalar() or 0

    # Contact count
    total_contacts = (
        await db.execute(
            select(func.count(Contact.id))
            .join(ContactList)
            .where(ContactList.user_id == current_user.id)
        )
    ).scalar() or 0

    # SMTP health
    active_smtp = (
        await db.execute(
            select(func.count(SMTPServer.id)).where(
                SMTPServer.user_id == current_user.id,
                SMTPServer.is_active == True,
            )
        )
    ).scalar() or 0

    # Recent campaigns (last 5)
    recent_campaigns = (
        await db.execute(
            select(Campaign)
            .where(Campaign.user_id == current_user.id)
            .order_by(Campaign.id.desc())
            .limit(5)
        )
    ).scalars().all()

    return DashboardStats(
        total_emails_sent=total_sent,
        avg_open_rate=avg_open_rate,
        avg_click_rate=avg_click_rate,
        total_lists=total_lists,
        total_contacts=total_contacts,
        smtp_health=active_smtp > 0,
        recent_campaigns=recent_campaigns,
    )


# ─────────────────────── Campaign CRUD ───────────────────────

@router.get("", response_model=List[CampaignResponse])
async def list_campaigns(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Campaign)
        .where(Campaign.user_id == current_user.id)
        .order_by(Campaign.id.desc())
    )
    return result.scalars().all()


@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    campaign_in: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify SMTP server belongs to this user
    if campaign_in.smtp_server_id:
        smtp_check = await db.execute(
            select(SMTPServer).where(
                SMTPServer.id == campaign_in.smtp_server_id,
                SMTPServer.user_id == current_user.id,
            )
        )
        if not smtp_check.scalars().first():
            raise HTTPException(status_code=400, detail="Invalid SMTP server — not found or unauthorized.")

    # Verify contact list belongs to this user
    if campaign_in.contact_list_id:
        list_check = await db.execute(
            select(ContactList).where(
                ContactList.id == campaign_in.contact_list_id,
                ContactList.user_id == current_user.id,
            )
        )
        if not list_check.scalars().first():
            raise HTTPException(status_code=400, detail="Invalid contact list — not found or unauthorized.")

    # Count eligible contacts
    total_recipients = 0
    if campaign_in.contact_list_id:
        count_result = await db.execute(
            select(func.count(Contact.id)).where(
                Contact.list_id == campaign_in.contact_list_id,
                Contact.is_unsubscribed == False,
            )
        )
        total_recipients = count_result.scalar() or 0

    scheduled_at_naive = None
    if campaign_in.scheduled_at:
        scheduled_at_naive = campaign_in.scheduled_at.replace(tzinfo=None)

    from datetime import datetime
    status_to_set = "draft"
    is_auto = (campaign_in.sending_mode or "auto").lower() == "auto"

    if is_auto:
        # Check if scheduled in the future
        if scheduled_at_naive and scheduled_at_naive > datetime.utcnow():
            status_to_set = "scheduled"
        else:
            status_to_set = "sending"

    new_campaign = Campaign(
        user_id=current_user.id,
        name=campaign_in.name.strip(),
        subject=campaign_in.subject.strip(),
        content_html=campaign_in.content_html,
        smtp_server_id=campaign_in.smtp_server_id,
        contact_list_id=campaign_in.contact_list_id,
        status=status_to_set,
        total_recipients=total_recipients,
        scheduled_at=scheduled_at_naive,
        auto_resend_hours=campaign_in.auto_resend_hours,
        sending_mode=campaign_in.sending_mode or "auto",
    )
    db.add(new_campaign)
    await db.commit()
    await db.refresh(new_campaign)

    # Automatically trigger sending for "auto" mode campaigns
    if is_auto:
        from app.tasks.email_sender import send_campaign_task
        if status_to_set == "sending":
            send_campaign_task.delay(new_campaign.id)
        elif status_to_set == "scheduled":
            send_campaign_task.apply_async(args=[new_campaign.id], eta=scheduled_at_naive)

    return new_campaign


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.user_id == current_user.id,
        )
    )
    campaign = result.scalars().first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    return campaign


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.user_id == current_user.id,
        )
    )
    campaign = result.scalars().first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")

    if campaign.status == "sending":
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a campaign that is currently sending.",
        )

    await db.delete(campaign)
    await db.commit()


@router.post("/{campaign_id}/send", response_model=CampaignResponse)
async def trigger_campaign_send(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Triggers the async Celery worker to dispatch emails for a campaign."""
    result = await db.execute(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.user_id == current_user.id,
        )
    )
    campaign = result.scalars().first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")

    if campaign.status == "sending":
        raise HTTPException(status_code=400, detail="Campaign is already sending.")

    if campaign.status == "sent":
        raise HTTPException(status_code=400, detail="Campaign has already been sent.")

    if not campaign.smtp_server_id or not campaign.contact_list_id:
        raise HTTPException(
            status_code=400,
            detail="Campaign must have an SMTP server and a Contact List before sending.",
        )

    # Quota guard — prevent users from exceeding their monthly limit
    if current_user.quota_sent >= current_user.quota_limit:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Monthly sending quota exhausted ({current_user.quota_limit:,} emails). Upgrade your plan to send more.",
        )

    # Count active contacts
    count_result = await db.execute(
        select(func.count(Contact.id)).where(
            Contact.list_id == campaign.contact_list_id,
            Contact.is_unsubscribed == False,
        )
    )
    total_recipients = count_result.scalar() or 0

    if total_recipients == 0:
        raise HTTPException(status_code=400, detail="Selected contact list has no active subscribers.")

    campaign.status = "sending"
    campaign.total_recipients = total_recipients
    campaign.sent_count = 0
    await db.commit()
    await db.refresh(campaign)

    from app.tasks.email_sender import send_campaign_task
    send_campaign_task.delay(campaign.id)

    return campaign


@router.get("/{campaign_id}/logs", response_model=List[CampaignLogResponse])
async def list_campaign_logs(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign_check = await db.execute(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.user_id == current_user.id,
        )
    )
    if not campaign_check.scalars().first():
        raise HTTPException(status_code=404, detail="Campaign not found.")

    result = await db.execute(
        select(CampaignLog)
        .where(CampaignLog.campaign_id == campaign_id)
        .order_by(CampaignLog.id.desc())
    )
    return result.scalars().all()
