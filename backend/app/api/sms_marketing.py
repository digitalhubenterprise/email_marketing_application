from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.db.session import get_db
from app.db.models import User, SMSMarketingConfig, SMSCampaign, SMSLog, SMSGroup, SMSNumber, SMSTemplate
from app.schemas.sms import (
    SMSConfigCreate,
    SMSConfigResponse,
    SMSCampaignCreate,
    SMSCampaignResponse,
    SMSLogsPaginated,
    SMSTestRequest,
    SMSBalanceResponse,
    SMSGroupCreate,
    SMSGroupResponse,
    SMSNumberCreate,
    SMSNumberResponse,
    SMSGroupWithNumbersResponse,
    SMSTemplateCreate,
    SMSTemplateResponse
)
from app.api.deps import get_current_user
from app.services.sms_service import SMSService

router = APIRouter()


@router.get("/config", response_model=SMSConfigResponse)
async def get_sms_config(
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches user's current SMS API Gateway configurations."""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    result = await db.execute(
        select(SMSMarketingConfig).where(SMSMarketingConfig.user_id == current_user.id)
    )
    config = result.scalars().first()
    if not config:
        config = SMSMarketingConfig(user_id=current_user.id)
        db.add(config)
        await db.commit()
        await db.refresh(config)
    else:
        # On-the-fly migration of legacy BulkSMSBD credentials
        modified = False
        if config.provider == 'bulksmsbd':
            if config.api_key and not config.bulksmsbd_api_key:
                config.bulksmsbd_api_key = config.api_key
                modified = True
            if config.sender_id and not config.bulksmsbd_sender_id:
                config.bulksmsbd_sender_id = config.sender_id
                modified = True
        if modified:
            await db.commit()
            await db.refresh(config)
            
    return config


@router.post("/config", response_model=SMSConfigResponse)
async def update_sms_config(
    payload: SMSConfigCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Saves or updates user's SMS API settings."""
    result = await db.execute(
        select(SMSMarketingConfig).where(SMSMarketingConfig.user_id == current_user.id)
    )
    config = result.scalars().first()
    if not config:
        config = SMSMarketingConfig(user_id=current_user.id)
        db.add(config)

    # Copy new provider-specific fields
    config.provider = payload.provider
    config.is_active = payload.is_active
    config.bulksmsbd_api_key = payload.bulksmsbd_api_key
    config.bulksmsbd_sender_id = payload.bulksmsbd_sender_id
    config.twilio_api_key = payload.twilio_api_key
    config.twilio_sender_id = payload.twilio_sender_id
    config.vonage_api_key = payload.vonage_api_key
    config.vonage_sender_id = payload.vonage_sender_id
    config.custom_api_key = payload.custom_api_key
    config.custom_sender_id = payload.custom_sender_id

    # Fallback to legacy fields if provider-specific fields are missing
    if payload.provider == 'bulksmsbd':
        if not config.bulksmsbd_api_key:
            config.bulksmsbd_api_key = payload.api_key
        if not config.bulksmsbd_sender_id:
            config.bulksmsbd_sender_id = payload.sender_id
    elif payload.provider == 'twilio':
        if not config.twilio_api_key:
            config.twilio_api_key = payload.api_key
        if not config.twilio_sender_id:
            config.twilio_sender_id = payload.sender_id
    elif payload.provider == 'vonage':
        if not config.vonage_api_key:
            config.vonage_api_key = payload.api_key
        if not config.vonage_sender_id:
            config.vonage_sender_id = payload.sender_id
    elif payload.provider == 'custom':
        if not config.custom_api_key:
            config.custom_api_key = payload.api_key
        if not config.custom_sender_id:
            config.custom_sender_id = payload.sender_id
    else:
        # Fallback for mock or other providers
        pass

    # Update legacy api_key/sender_id to match the active provider
    if payload.provider == 'bulksmsbd':
        config.api_key = config.bulksmsbd_api_key
        config.sender_id = config.bulksmsbd_sender_id
    elif payload.provider == 'twilio':
        config.api_key = config.twilio_api_key
        config.sender_id = config.twilio_sender_id
    elif payload.provider == 'vonage':
        config.api_key = config.vonage_api_key
        config.sender_id = config.vonage_sender_id
    elif payload.provider == 'custom':
        config.api_key = config.custom_api_key
        config.sender_id = config.custom_sender_id
    else:
        # Fallback for mock or other providers
        config.api_key = payload.api_key
        config.sender_id = payload.sender_id

    await db.commit()
    await db.refresh(config)
    return config


@router.get("/balance", response_model=SMSBalanceResponse)
async def get_sms_balance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches real-time API credit balance from the SMS provider service."""
    result = await db.execute(
        select(SMSMarketingConfig).where(SMSMarketingConfig.user_id == current_user.id)
    )
    config = result.scalars().first()
    if not config or not config.api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SMS API Key is not configured. Please go to settings."
        )

    try:
        res = await SMSService.get_balance(config.provider, config.api_key)
        return res
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e)
        )


@router.post("/test-connection")
async def test_sms_connection(
    req: SMSTestRequest,
    current_user: User = Depends(get_current_user)
):
    """Dispatches a single test SMS and checks for successful submission (202)."""
    if not req.api_key or not req.sender_id or not req.recipient:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="API Key, Sender ID, and Recipient number are required."
        )

    res = await SMSService.send_sms(
        provider=req.provider,
        api_key=req.api_key,
        sender_id=req.sender_id,
        recipient=req.recipient,
        message=req.message
    )
    return res


@router.post("/campaigns", response_model=SMSCampaignResponse)
async def create_sms_campaign(
    payload: SMSCampaignCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Creates a new SMS campaign, dispatches messages to BulkSMSBD API, and logs delivery results."""
    # Check config
    result = await db.execute(
        select(SMSMarketingConfig).where(SMSMarketingConfig.user_id == current_user.id)
    )
    config = result.scalars().first()
    if not config or not config.api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SMS API Gateway is not configured. Please complete setup in Settings."
        )

    # Parse recipients list
    raw_recipients = [r.strip() for r in payload.recipients.split(",") if r.strip()]
    if not raw_recipients:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recipient mobile numbers list cannot be empty."
        )

    total_count = len(raw_recipients)
    
    # Save campaign entry initially as sending status
    campaign = SMSCampaign(
        user_id=current_user.id,
        name=payload.name.strip(),
        sender_id=payload.sender_id.strip() or config.sender_id,
        message=payload.message,
        total_recipients=total_count,
        status="sending"
    )
    db.add(campaign)
    await db.flush()

    # Call the service layer to send SMS (supports single/bulk comma-separated string)
    recipients_str = ",".join(raw_recipients)
    res = await SMSService.send_sms(
        provider=config.provider,
        api_key=config.api_key,
        sender_id=campaign.sender_id,
        recipient=recipients_str,
        message=campaign.message
    )

    sent_count = 0
    status_val = "failed"
    
    if res.get("success"):
        sent_count = total_count
        status_val = "delivered"

    # Log individual SMS outcomes in database
    for recipient in raw_recipients:
        log_entry = SMSLog(
            user_id=current_user.id,
            recipient=recipient,
            sender_id=campaign.sender_id,
            message=campaign.message,
            status=status_val,
            response_code=res.get("code"),
            response_message=res.get("message")
        )
        db.add(log_entry)

    # Update campaign status
    campaign.sent_count = sent_count
    campaign.status = "sent" if sent_count == total_count else "failed"
    
    await db.commit()
    await db.refresh(campaign)

    return campaign


@router.get("/campaigns", response_model=List[SMSCampaignResponse])
async def list_sms_campaigns(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists all SMS campaigns for the user."""
    result = await db.execute(
        select(SMSCampaign)
        .where(SMSCampaign.user_id == current_user.id)
        .order_by(SMSCampaign.id.desc())
    )
    return result.scalars().all()


@router.get("/logs", response_model=SMSLogsPaginated)
async def list_sms_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches paginated SMS logs with search filters."""
    offset = (page - 1) * limit
    q = select(SMSLog).where(SMSLog.user_id == current_user.id)

    if search:
        q = q.where(
            (SMSLog.recipient.ilike(f"%{search}%")) |
            (SMSLog.message.ilike(f"%{search}%"))
        )

    total_res = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_res.scalar() or 0

    logs_res = await db.execute(
        q.order_by(SMSLog.timestamp.desc()).offset(offset).limit(limit)
    )
    logs = logs_res.scalars().all()

    return {"logs": logs, "total": total}


@router.post("/groups", response_model=SMSGroupResponse)
async def create_sms_group(
    payload: SMSGroupCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Creates a new SMS Group."""
    group = SMSGroup(
        user_id=current_user.id,
        name=payload.name.strip(),
        description=payload.description
    )
    db.add(group)
    await db.commit()
    await db.refresh(group)
    return group


@router.get("/groups", response_model=List[SMSGroupWithNumbersResponse])
async def list_sms_groups(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists all SMS Groups including their phone numbers list."""
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(SMSGroup)
        .where(SMSGroup.user_id == current_user.id)
        .options(selectinload(SMSGroup.numbers))
        .order_by(SMSGroup.id.desc())
    )
    return result.scalars().all()


@router.delete("/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sms_group(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes an SMS Group and all nested numbers."""
    result = await db.execute(
        select(SMSGroup).where(SMSGroup.id == group_id, SMSGroup.user_id == current_user.id)
    )
    group = result.scalars().first()
    if not group:
        raise HTTPException(status_code=404, detail="SMS Group not found.")

    await db.delete(group)
    await db.commit()


@router.post("/numbers", response_model=SMSNumberResponse)
async def add_sms_number(
    payload: SMSNumberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Adds a phone number to an SMS Group."""
    # Verify group ownership
    group_res = await db.execute(
        select(SMSGroup).where(SMSGroup.id == payload.group_id, SMSGroup.user_id == current_user.id)
    )
    group = group_res.scalars().first()
    if not group:
        raise HTTPException(status_code=404, detail="SMS Group not found.")

    number = SMSNumber(
        group_id=payload.group_id,
        phone_number=payload.phone_number.strip(),
        name=payload.name.strip() if payload.name else None
    )
    db.add(number)
    await db.commit()
    await db.refresh(number)
    return number


@router.get("/numbers", response_model=List[SMSNumberResponse])
async def list_sms_numbers(
    group_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists all SMS numbers for the user, with optional group filter."""
    q = select(SMSNumber).join(SMSGroup).where(SMSGroup.user_id == current_user.id)
    if group_id is not None:
        q = q.where(SMSNumber.group_id == group_id)
        
    result = await db.execute(q.order_by(SMSNumber.id.desc()))
    return result.scalars().all()


@router.delete("/numbers/{number_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sms_number(
    number_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes an SMS number from a group."""
    result = await db.execute(
        select(SMSNumber)
        .join(SMSGroup)
        .where(SMSNumber.id == number_id, SMSGroup.user_id == current_user.id)
    )
    number = result.scalars().first()
    if not number:
        raise HTTPException(status_code=404, detail="SMS Number not found.")

    await db.delete(number)
    await db.commit()


@router.post("/templates", response_model=SMSTemplateResponse)
async def create_sms_template(
    payload: SMSTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Creates a new SMS template."""
    template = SMSTemplate(
        user_id=current_user.id,
        title=payload.title.strip(),
        body=payload.body.strip()
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


@router.get("/templates", response_model=List[SMSTemplateResponse])
async def list_sms_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists all SMS templates for the user."""
    result = await db.execute(
        select(SMSTemplate)
        .where(SMSTemplate.user_id == current_user.id)
        .order_by(SMSTemplate.id.desc())
    )
    return result.scalars().all()


@router.put("/templates/{template_id}", response_model=SMSTemplateResponse)
async def update_sms_template(
    template_id: int,
    payload: SMSTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Updates an existing SMS template."""
    result = await db.execute(
        select(SMSTemplate).where(SMSTemplate.id == template_id, SMSTemplate.user_id == current_user.id)
    )
    template = result.scalars().first()
    if not template:
        raise HTTPException(status_code=404, detail="SMS template not found.")

    template.title = payload.title.strip()
    template.body = payload.body.strip()
    await db.commit()
    await db.refresh(template)
    return template


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sms_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes an SMS template."""
    result = await db.execute(
        select(SMSTemplate).where(SMSTemplate.id == template_id, SMSTemplate.user_id == current_user.id)
    )
    template = result.scalars().first()
    if not template:
        raise HTTPException(status_code=404, detail="SMS template not found.")

    await db.delete(template)
    await db.commit()
