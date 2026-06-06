import aiosmtplib
import asyncio
import ipaddress
import os
import socket
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.db.models import SMTPServer, User
from app.core.security import encrypt_smtp_password
from app.schemas.smtp import SMTPServerCreate, SMTPServerResponse, SMTPServerUpdate, SMTPTestRequest
from app.api.deps import get_current_user

router = APIRouter()

# Max SMTP servers per user (enterprise guard)
MAX_SMTP_SERVERS_FREE = 1
MAX_SMTP_SERVERS_PAID = 20


@router.get("", response_model=List[SMTPServerResponse])
async def list_smtp_servers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SMTPServer).where(SMTPServer.user_id == current_user.id).order_by(SMTPServer.id.desc())
    )
    return result.scalars().all()


@router.post("", response_model=SMTPServerResponse, status_code=status.HTTP_201_CREATED)
async def create_smtp_server(
    smtp_in: SMTPServerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Enforce dynamic tier-based SMTP server limits
    count_result = await db.execute(
        select(SMTPServer).where(SMTPServer.user_id == current_user.id)
    )
    existing_count = len(count_result.scalars().all())

    from app.db.models import SubscriptionPlan
    plan_res = await db.execute(
        select(SubscriptionPlan).where(SubscriptionPlan.tier == current_user.subscription_tier)
    )
    plan = plan_res.scalars().first()
    
    smtp_limit = MAX_SMTP_SERVERS_FREE
    if plan:
        smtp_limit = plan.smtp_limit
    else:
        if current_user.subscription_tier == "free":
            smtp_limit = MAX_SMTP_SERVERS_FREE
        else:
            smtp_limit = MAX_SMTP_SERVERS_PAID

    if existing_count >= smtp_limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your '{current_user.subscription_tier}' plan allows only {smtp_limit} SMTP server(s). Please upgrade to a higher tier.",
        )

    encrypted = encrypt_smtp_password(smtp_in.password)
    new_server = SMTPServer(
        user_id=current_user.id,
        name=smtp_in.name.strip(),
        host=smtp_in.host.strip().lower(),
        port=smtp_in.port,
        username=smtp_in.username.strip(),
        encrypted_password=encrypted,
        security=smtp_in.security.upper(),
        from_name=smtp_in.from_name.strip(),
        from_email=smtp_in.from_email.strip().lower(),
        daily_send_limit=smtp_in.daily_send_limit,
        is_active=smtp_in.is_active,
    )
    db.add(new_server)
    await db.commit()
    await db.refresh(new_server)
    return new_server


@router.delete("/{server_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_smtp_server(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SMTPServer).where(
            SMTPServer.id == server_id,
            SMTPServer.user_id == current_user.id,
        )
    )
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="SMTP server not found.")

    await db.delete(server)
    await db.commit()


@router.post("/test-connection")
async def test_smtp_connection(
    req: SMTPTestRequest,
    current_user: User = Depends(get_current_user),  # Requires auth — prevents abuse
):
    """
    Tests SMTP socket connectivity and credential authentication.
    Requires a valid JWT session — endpoint cannot be abused anonymously.
    """
    is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"
    if is_production:
        host_clean = req.host.strip()
        is_private = False
        try:
            # Check if it is an IP address
            ip = ipaddress.ip_address(host_clean)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast:
                is_private = True
        except ValueError:
            # Resolve DNS hostname
            try:
                loop = asyncio.get_running_loop()
                addr_info = await loop.run_in_executor(
                    None, lambda: socket.getaddrinfo(host_clean, None)
                )
                for family, socktype, proto, canonname, sockaddr in addr_info:
                    ip_str = sockaddr[0]
                    ip = ipaddress.ip_address(ip_str)
                    if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast:
                        is_private = True
                        break
            except Exception:
                pass

        if is_private:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Testing connections to private or loopback IP ranges is not allowed in production."
            )

    use_tls = req.security.upper() == "SSL"
    start_tls = req.security.upper() == "TLS"

    try:
        smtp_client = aiosmtplib.SMTP(
            hostname=req.host,
            port=req.port,
            use_tls=use_tls,
            timeout=10,
        )
        await smtp_client.connect()

        if start_tls:
            await smtp_client.starttls()

        if req.username and req.password:
            await smtp_client.login(req.username, req.password)

        await smtp_client.quit()
        return {"success": True, "message": "Successfully connected and authenticated to SMTP server!"}

    except aiosmtplib.SMTPAuthenticationError:
        return {"success": False, "message": "Authentication failed — check your username and password."}
    except aiosmtplib.SMTPConnectError:
        return {"success": False, "message": "Could not connect — check Host and Port settings."}
    except Exception as e:
        return {"success": False, "message": f"Connection error: {str(e)}"}
