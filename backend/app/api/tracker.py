from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update

from app.db.session import AsyncSessionLocal
from app.db.models import CampaignLog, Campaign

router = APIRouter()

# 1x1 Transparent GIF Byte stream
TRACKING_PIXEL = b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b'

@router.get("/open/{log_id}")
async def track_email_open(log_id: int):
    """Serves a 1x1 pixel tracking GIF and records open metrics synchronously in the DB."""
    # We open a dedicated session since this endpoint is triggered anonymously by external mail clients
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(CampaignLog).where(CampaignLog.id == log_id)
        )
        log = result.scalars().first()
        
        if log and not log.opened:
            log.opened = True
            
            # Increment campaign opens count
            await db.execute(
                update(Campaign)
                .where(Campaign.id == log.campaign_id)
                .values(open_count=Campaign.open_count + 1)
            )
            await db.commit()
            
    # Return 1x1 transparent GIF with cache controls
    return Response(
        content=TRACKING_PIXEL,
        media_type="image/gif",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

@router.get("/click/{log_id}")
async def track_email_click(log_id: int, url: str = Query(..., description="Target redirect URL")):
    """Records click-through analytics and redirects the user to their target link."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(CampaignLog).where(CampaignLog.id == log_id)
        )
        log = result.scalars().first()
        
        if log and not log.clicked:
            log.clicked = True
            
            # Increment campaign clicks count
            await db.execute(
                update(Campaign)
                .where(Campaign.id == log.campaign_id)
                .values(click_count=Campaign.click_count + 1)
            )
            await db.commit()
            
    # Safely redirect user to destination URL
    return RedirectResponse(url=url, status_code=302)
