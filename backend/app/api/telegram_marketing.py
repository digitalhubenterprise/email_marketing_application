from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, update, delete

from app.db.session import get_db
from app.db.models import User, TelegramMarketingConfig, TelegramService, TelegramLog
from app.schemas.telegram_marketing import (
    TelegramMarketingConfigResponse,
    TelegramMarketingConfigUpdate,
    TelegramServiceCreate,
    TelegramServiceResponse,
    TelegramServiceUpdate,
    TelegramLogResponse,
    TelegramMarketingStats
)
from app.api.deps import get_current_user
from app.tasks.telegram_tasks import execute_telegram_post_job

router = APIRouter()

# Helper for UTC time
def utc_now_naive():
    return datetime.now(timezone.utc).replace(tzinfo=None)

# ─── Config API ────────────────────────────────────────────────────────

@router.get("/config", response_model=TelegramMarketingConfigResponse)
async def get_telegram_config(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches or creates the user's active Telegram Marketing configuration."""
    res = await db.execute(
        select(TelegramMarketingConfig).where(TelegramMarketingConfig.user_id == current_user.id)
    )
    config = res.scalars().first()
    
    if not config:
        # Seed default config
        config = TelegramMarketingConfig(
            user_id=current_user.id,
            interval_hours=2,
            is_active=False
        )
        db.add(config)
        await db.commit()
        await db.refresh(config)
        
    return TelegramMarketingConfigResponse(
        id=config.id,
        user_id=config.user_id,
        telegram_channel=config.telegram_channel,
        interval_hours=config.interval_hours,
        is_active=config.is_active,
        last_run=config.last_run,
        next_run=config.next_run,
        created_at=config.created_at,
        has_bot_token=bool(config.telegram_bot_token),
        has_groq_key=bool(config.groq_api_key)
    )

@router.post("/config", response_model=TelegramMarketingConfigResponse)
async def update_telegram_config(
    payload: TelegramMarketingConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Updates active configuration parameters and recalculates intervals scheduler."""
    res = await db.execute(
        select(TelegramMarketingConfig).where(TelegramMarketingConfig.user_id == current_user.id)
    )
    config = res.scalars().first()
    
    if not config:
        config = TelegramMarketingConfig(user_id=current_user.id)
        
    config.telegram_channel = payload.telegram_channel
    config.interval_hours = payload.interval_hours
    
    # Recalculate schedule next run if toggled on
    was_active = config.is_active
    config.is_active = payload.is_active
    
    if payload.is_active and not was_active:
        config.next_run = utc_now_naive()
        
    if payload.telegram_bot_token:
        config.telegram_bot_token = payload.telegram_bot_token.strip()
    if payload.groq_api_key:
        config.groq_api_key = payload.groq_api_key.strip()
        
    db.add(config)
    await db.commit()
    await db.refresh(config)
    
    return TelegramMarketingConfigResponse(
        id=config.id,
        user_id=config.user_id,
        telegram_channel=config.telegram_channel,
        interval_hours=config.interval_hours,
        is_active=config.is_active,
        last_run=config.last_run,
        next_run=config.next_run,
        created_at=config.created_at,
        has_bot_token=bool(config.telegram_bot_token),
        has_groq_key=bool(config.groq_api_key)
    )

# ─── Services API ──────────────────────────────────────────────────────

@router.get("/services", response_model=List[TelegramServiceResponse])
async def list_services(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists rotation service topics for dynamic LLM copywriting."""
    res = await db.execute(
        select(TelegramService)
        .where(TelegramService.user_id == current_user.id)
        .order_by(TelegramService.id.desc())
    )
    return res.scalars().all()

@router.post("/services", response_model=TelegramServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    payload: TelegramServiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Adds a new promotion topic profile to dynamic rotation."""
    new_service = TelegramService(
        user_id=current_user.id,
        title=payload.title.strip(),
        category=payload.category.strip(),
        focus=payload.focus.strip(),
        angle=payload.angle.strip(),
        active=payload.active
    )
    db.add(new_service)
    await db.commit()
    await db.refresh(new_service)
    return new_service

@router.put("/services/{service_id}", response_model=TelegramServiceResponse)
async def update_service(
    service_id: int,
    payload: TelegramServiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Modifies a dynamic service promotion configuration."""
    res = await db.execute(
        select(TelegramService).where(
            TelegramService.id == service_id,
            TelegramService.user_id == current_user.id
        )
    )
    service = res.scalars().first()
    if not service:
        raise HTTPException(status_code=404, detail="Service profile not found.")
        
    update_data = payload.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(service, key, val)
        
    db.add(service)
    await db.commit()
    await db.refresh(service)
    return service

@router.delete("/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Purges a service category from automatic promotion rotation."""
    res = await db.execute(
        select(TelegramService).where(
            TelegramService.id == service_id,
            TelegramService.user_id == current_user.id
        )
    )
    service = res.scalars().first()
    if not service:
        raise HTTPException(status_code=404, detail="Service profile not found.")
        
    await db.delete(service)
    await db.commit()

# ─── Logs & Diagnostics API ───────────────────────────────────────────

@router.get("/logs")
async def get_logs_list(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Paginated search query listing user's Celery/Telegram dispatch log events."""
    offset = (page - 1) * limit
    
    q = select(TelegramLog).where(TelegramLog.user_id == current_user.id)
    
    if status_filter:
        q = q.where(TelegramLog.status == status_filter)
    if search:
        q = q.where(
            (TelegramLog.service_title.ilike(f"%{search}%")) |
            (TelegramLog.category.ilike(f"%{search}%")) |
            (TelegramLog.message.ilike(f"%{search}%"))
        )
        
    # Count total
    count_res = await db.execute(select(func.count()).select_from(q.subquery()))
    total = count_res.scalar() or 0
    
    # Fetch records
    records_res = await db.execute(
        q.order_by(TelegramLog.timestamp.desc()).offset(offset).limit(limit)
    )
    logs = records_res.scalars().all()
    
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "logs": [
            {
                "id": log.id,
                "timestamp": log.timestamp,
                "service_title": log.service_title,
                "category": log.category,
                "status": log.status,
                "message": log.message
            } for log in logs
        ]
    }

@router.post("/trigger-post")
async def trigger_manual_post(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Synchronously triggers the AI Content engine and delivers copy to Telegram."""
    res = await db.execute(
        select(TelegramMarketingConfig).where(TelegramMarketingConfig.user_id == current_user.id)
    )
    config = res.scalars().first()
    if not config:
        raise HTTPException(
            status_code=400,
            detail="Configure active tokens and channels inside Settings first."
        )
        
    success, log_msg = await execute_telegram_post_job(db, config.id)
    if not success:
        raise HTTPException(status_code=400, detail=log_msg)
        
    return {"success": True, "message": log_msg}

@router.get("/stats", response_model=TelegramMarketingStats)
async def get_telegram_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculates active scheduler state and telemetry success aggregates."""
    # Scheduler state
    config_res = await db.execute(
        select(TelegramMarketingConfig).where(TelegramMarketingConfig.user_id == current_user.id)
    )
    config = config_res.scalars().first()
    scheduler_status = "Inactive"
    if config and config.is_active:
        scheduler_status = "Active"
        
    # Service aggregates
    active_services = (await db.execute(
        select(func.count(TelegramService.id))
        .where(TelegramService.user_id == current_user.id, TelegramService.active == True)
    )).scalar() or 0
    
    inactive_services = (await db.execute(
        select(func.count(TelegramService.id))
        .where(TelegramService.user_id == current_user.id, TelegramService.active == False)
    )).scalar() or 0
    
    # Log counts
    total_posts = (await db.execute(
        select(func.count(TelegramLog.id)).where(TelegramLog.user_id == current_user.id)
    )).scalar() or 0
    
    success_posts = (await db.execute(
        select(func.count(TelegramLog.id))
        .where(TelegramLog.user_id == current_user.id, TelegramLog.status == "Success")
    )).scalar() or 0
    
    failed_posts = (await db.execute(
        select(func.count(TelegramLog.id))
        .where(TelegramLog.user_id == current_user.id, TelegramLog.status == "Failed")
    )).scalar() or 0
    
    return TelegramMarketingStats(
        total_posts=total_posts,
        success_posts=success_posts,
        failed_posts=failed_posts,
        active_services=active_services,
        inactive_services=inactive_services,
        scheduler_status=scheduler_status
    )
