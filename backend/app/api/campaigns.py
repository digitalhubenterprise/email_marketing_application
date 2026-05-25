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

@router.get("", response_model=List[CampaignResponse])
async def list_campaigns(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Campaign).where(Campaign.user_id == current_user.id).order_by(Campaign.id.desc())
    )
    return result.scalars().all()

@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    campaign_in: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify SMTP server belongs to user
    if campaign_in.smtp_server_id:
        smtp_check = await db.execute(
            select(SMTPServer).where(
                SMTPServer.id == campaign_in.smtp_server_id,
                SMTPServer.user_id == current_user.id
            )
        )
        if not smtp_check.scalars().first():
            raise HTTPException(status_code=400, detail="Invalid SMTP Server specified")

    # Verify contact list belongs to user
    if campaign_in.contact_list_id:
        list_check = await db.execute(
            select(ContactList).where(
                ContactList.id == campaign_in.contact_list_id,
                ContactList.user_id == current_user.id
            )
        )
        if not list_check.scalars().first():
            raise HTTPException(status_code=400, detail="Invalid Contact List specified")

    # Estimate recipient count
    total_recipients = 0
    if campaign_in.contact_list_id:
        count_query = select(func.count(Contact.id)).where(
            Contact.list_id == campaign_in.contact_list_id,
            Contact.is_unsubscribed == False
        )
        count_result = await db.execute(count_query)
        total_recipients = count_result.scalar() or 0

    new_campaign = Campaign(
        user_id=current_user.id,
        name=campaign_in.name,
        subject=campaign_in.subject,
        content_html=campaign_in.content_html,
        smtp_server_id=campaign_in.smtp_server_id,
        contact_list_id=campaign_in.contact_list_id,
        status="draft",
        total_recipients=total_recipients,
        scheduled_at=campaign_in.scheduled_at
    )
    db.add(new_campaign)
    await db.commit()
    await db.refresh(new_campaign)
    return new_campaign

@router.post("/{campaign_id}/send", response_model=CampaignResponse)
async def trigger_campaign_send(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Triggers the async Celery task to distribute emails for a specific campaign."""
    # Verify campaign ownership
    result = await db.execute(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.user_id == current_user.id
        )
    )
    campaign = result.scalars().first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    if campaign.status == "sending":
        raise HTTPException(status_code=400, detail="Campaign is already sending")
        
    if not campaign.smtp_server_id or not campaign.contact_list_id:
        raise HTTPException(
            status_code=400,
            detail="Campaign must have an SMTP server and a Contact List selected before sending"
        )
        
    # Count targets
    count_query = select(func.count(Contact.id)).where(
        Contact.list_id == campaign.contact_list_id,
        Contact.is_unsubscribed == False
    )
    count_result = await db.execute(count_query)
    total_recipients = count_result.scalar() or 0
    
    if total_recipients == 0:
        raise HTTPException(status_code=400, detail="Selected contact list is empty")
        
    # Update state to sending
    campaign.status = "sending"
    campaign.total_recipients = total_recipients
    campaign.sent_count = 0
    await db.commit()
    await db.refresh(campaign)
    
    # Import and trigger Celery task
    # Using delay to push to Redis queue async
    from app.tasks.email_sender import send_campaign_task
    send_campaign_task.delay(campaign.id)
    
    return campaign

@router.get("/{campaign_id}/logs", response_model=List[CampaignLogResponse])
async def list_campaign_delivery_logs(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify ownership
    campaign_check = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id, Campaign.user_id == current_user.id)
    )
    if not campaign_check.scalars().first():
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    result = await db.execute(
        select(CampaignLog).where(CampaignLog.campaign_id == campaign_id).order_by(CampaignLog.id.desc())
    )
    return result.scalars().all()

@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_aggregates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Aggregates sending counts, average deliverability, and recent campaigns for premium dashboard metrics."""
    # 1. Total Sent Count
    campaign_sends_query = select(func.sum(Campaign.sent_count)).where(Campaign.user_id == current_user.id)
    total_sent = (await db.execute(campaign_sends_query)).scalar() or 0
    
    # 2. Average Open Rate
    open_query = select(func.sum(Campaign.open_count), func.sum(Campaign.sent_count)).where(Campaign.user_id == current_user.id)
    open_res = (await db.execute(open_query)).first()
    sum_opens = open_res[0] if open_res and open_res[0] is not None else 0
    sum_sends = open_res[1] if open_res and open_res[1] is not None else 0
    avg_open_rate = (sum_opens / sum_sends * 100) if (sum_sends > 0) else 0.0
    
    # 3. Average Click Rate
    click_query = select(func.sum(Campaign.click_count), func.sum(Campaign.sent_count)).where(Campaign.user_id == current_user.id)
    click_res = (await db.execute(click_query)).first()
    sum_clicks = click_res[0] if click_res and click_res[0] is not None else 0
    sum_sends_c = click_res[1] if click_res and click_res[1] is not None else 0
    avg_click_rate = (sum_clicks / sum_sends_c * 100) if (sum_sends_c > 0) else 0.0
    
    # 4. Lists Count
    lists_query = select(func.count(ContactList.id)).where(ContactList.user_id == current_user.id)
    total_lists = (await db.execute(lists_query)).scalar() or 0
    
    # 5. Contacts Count
    contacts_query = select(func.count(Contact.id)).join(ContactList).where(ContactList.user_id == current_user.id)
    total_contacts = (await db.execute(contacts_query)).scalar() or 0
    
    # 6. SMTP health check
    smtp_query = select(func.count(SMTPServer.id)).where(SMTPServer.user_id == current_user.id, SMTPServer.is_active == True)
    active_smtp = (await db.execute(smtp_query)).scalar() or 0
    smtp_health = active_smtp > 0
    
    # 7. Recent Campaigns
    recent_query = select(Campaign).where(Campaign.user_id == current_user.id).order_by(Campaign.id.desc()).limit(5)
    recent_campaigns = (await db.execute(recent_query)).scalars().all()
    
    return DashboardStats(
        total_emails_sent=total_sent,
        avg_open_rate=round(avg_open_rate, 2),
        avg_click_rate=round(avg_click_rate, 2),
        total_lists=total_lists,
        total_contacts=total_contacts,
        smtp_health=smtp_health,
        recent_campaigns=recent_campaigns
    )
