from urllib.parse import urlparse, urlencode, quote_plus
from fastapi import APIRouter, Query
from fastapi.responses import Response, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update

from app.db.session import AsyncSessionLocal
from app.db.models import CampaignLog, Campaign

router = APIRouter()

# 1x1 Transparent GIF pixel (bytes)
TRACKING_PIXEL = (
    b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00'
    b'\xff\xff\xff\x00\x00\x00\x21\xf9\x04\x01\x00\x00\x00'
    b'\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02'
    b'\x44\x01\x00\x3b'
)

# Allowed redirect URL schemes — prevent javascript: and data: XSS attacks
ALLOWED_REDIRECT_SCHEMES = {"http", "https"}


def is_safe_redirect_url(url: str) -> bool:
    """Validates that a redirect URL uses a safe scheme (http/https only)."""
    try:
        parsed = urlparse(url)
        return parsed.scheme.lower() in ALLOWED_REDIRECT_SCHEMES and bool(parsed.netloc)
    except Exception:
        return False


@router.get("/open/{log_id}")
async def track_email_open(log_id: int):
    """Serves a 1x1 pixel tracking GIF and records open event — called by email clients."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(CampaignLog).where(CampaignLog.id == log_id)
        )
        log = result.scalars().first()

        if log and not log.opened:
            await db.execute(
                update(CampaignLog)
                .where(CampaignLog.id == log_id)
                .values(opened=True)
            )
            await db.execute(
                update(Campaign)
                .where(Campaign.id == log.campaign_id)
                .values(open_count=Campaign.open_count + 1)
            )
            await db.commit()

    return Response(
        content=TRACKING_PIXEL,
        media_type="image/gif",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/click/{log_id}")
async def track_email_click(
    log_id: int,
    url: str = Query(..., description="Target redirect URL (must be http/https)")
):
    """
    Records click-through analytics then redirects to the destination URL.
    SECURITY: Only http/https URLs are allowed to prevent open redirect abuse.
    """
    # Validate redirect URL scheme before proceeding
    if not is_safe_redirect_url(url):
        # Return a safe fallback instead of redirecting to a potentially malicious URL
        return Response(
            content=b"<html><body><p>Invalid redirect URL.</p></body></html>",
            media_type="text/html",
            status_code=400,
        )

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(CampaignLog).where(CampaignLog.id == log_id)
        )
        log = result.scalars().first()

        if log and not log.clicked:
            await db.execute(
                update(CampaignLog)
                .where(CampaignLog.id == log_id)
                .values(clicked=True)
            )
            await db.execute(
                update(Campaign)
                .where(Campaign.id == log.campaign_id)
                .values(click_count=Campaign.click_count + 1)
            )
            await db.commit()

    return RedirectResponse(url=url, status_code=302)
