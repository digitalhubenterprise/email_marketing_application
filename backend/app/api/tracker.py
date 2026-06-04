import json
from urllib.parse import urlparse
from fastapi import APIRouter, Query, Request
from fastapi.responses import Response, RedirectResponse
from sqlalchemy.future import select
from sqlalchemy import update

from app.db.session import AsyncSessionLocal
from app.db.models import CampaignLog, Campaign, Contact

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
async def track_email_open(log_id: int, request: Request):
    """Serves a 1x1 pixel tracking GIF and records open event — called by email clients."""
    user_agent = request.headers.get("User-Agent", "").lower()
    device_type = "Desktop"
    if any(keyword in user_agent for keyword in ["mobile", "android", "iphone", "ipad", "ipod", "windows phone"]):
        device_type = "Mobile"

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(CampaignLog).where(CampaignLog.id == log_id)
        )
        log = result.scalars().first()

        if log and not log.opened:
            log.opened = True
            log.device_type = device_type
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
    request: Request,
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

    user_agent = request.headers.get("User-Agent", "").lower()
    device_type = "Desktop"
    if any(keyword in user_agent for keyword in ["mobile", "android", "iphone", "ipad", "ipod", "windows phone"]):
        device_type = "Mobile"

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(CampaignLog).where(CampaignLog.id == log_id)
        )
        log = result.scalars().first()

        if log:
            # Map link click counts
            clicks = {}
            if log.link_clicks:
                try:
                    clicks = json.loads(log.link_clicks)
                except json.JSONDecodeError:
                    pass
            clicks[url] = clicks.get(url, 0) + 1
            log.link_clicks = json.dumps(clicks)
            log.device_type = device_type

            if not log.clicked:
                log.clicked = True
                await db.execute(
                    update(Campaign)
                    .where(Campaign.id == log.campaign_id)
                    .values(click_count=Campaign.click_count + 1)
                )
            await db.commit()

    return RedirectResponse(url=url, status_code=302)


@router.api_route("/unsubscribe/{contact_id}", methods=["GET", "POST"])
async def unsubscribe_contact(
    contact_id: int,
    request: Request,
    token: str = Query(..., description="Secure unsubscribe token")
):
    """
    Handles unsubscribe requests.
    Supports GET (browser-based unsubscribe confirmation)
    and POST (RFC 8058 One-Click unsubscribe).
    """
    import hmac
    import hashlib
    from app.core.config import settings

    expected_token = hmac.new(settings.JWT_SECRET.encode(), str(contact_id).encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(token, expected_token):
        return Response(
            content=b"<html><body><h3>Invalid or missing unsubscribe security token.</h3></body></html>",
            media_type="text/html",
            status_code=403,
        )
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Contact).where(Contact.id == contact_id)
        )
        contact = result.scalars().first()
        if not contact:
            return Response(
                content=b"<html><body><h3>Contact not found</h3></body></html>",
                media_type="text/html",
                status_code=404,
            )

        # Update contact status
        contact.is_unsubscribed = True
        contact.status = "unsubscribed"
        await db.commit()

    if request.method == "POST":
        return Response(content="Unsubscribed successfully", media_type="text/plain", status_code=200)

    # Return a confirmation HTML page
    html_response = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Unsubscribed Successfully</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            body {{
                font-family: 'Inter', sans-serif;
                background-color: #f8f9fa;
                color: #212529;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
            }}
            .card {{
                background: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                max-width: 480px;
                width: 100%;
                text-align: center;
            }}
            h2 {{
                color: #e03131;
                margin-top: 0;
            }}
            p {{
                font-size: 16px;
                line-height: 1.5;
                color: #495057;
            }}
            .btn {{
                display: inline-block;
                margin-top: 20px;
                padding: 10px 20px;
                background-color: #4c6ef5;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 500;
                transition: background-color 0.2s;
            }}
            .btn:hover {{
                background-color: #3b5bdb;
            }}
        </style>
    </head>
    <body>
        <div class="card">
            <h2>Unsubscribed</h2>
            <p>You have been successfully unsubscribed from this list. You will no longer receive any promotional emails from us.</p>
            <p style="font-size: 14px; color: #868e96;">Email: <strong>{contact.email}</strong></p>
        </div>
    </body>
    </html>
    """
    return Response(content=html_response, media_type="text/html", status_code=200)
