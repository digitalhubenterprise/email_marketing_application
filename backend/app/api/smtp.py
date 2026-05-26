import aiosmtplib
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

@router.get("", response_model=List[SMTPServerResponse])
async def list_smtp_servers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(SMTPServer).where(SMTPServer.user_id == current_user.id)
    )
    return result.scalars().all()

@router.post("", response_model=SMTPServerResponse, status_code=status.HTTP_201_CREATED)
async def create_smtp_server(
    smtp_in: SMTPServerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    encrypted = encrypt_smtp_password(smtp_in.password)
    new_server = SMTPServer(
        user_id=current_user.id,
        name=smtp_in.name,
        host=smtp_in.host,
        port=smtp_in.port,
        username=smtp_in.username,
        encrypted_password=encrypted,
        security=smtp_in.security,
        from_name=smtp_in.from_name,
        from_email=smtp_in.from_email,
        daily_send_limit=smtp_in.daily_send_limit,
        is_active=smtp_in.is_active
    )
    db.add(new_server)
    await db.commit()
    await db.refresh(new_server)
    return new_server

@router.delete("/{server_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_smtp_server(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(SMTPServer).where(
            SMTPServer.id == server_id,
            SMTPServer.user_id == current_user.id
        )
    )
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="SMTP server not found")
    
    await db.delete(server)
    await db.commit()
    return

@router.post("/test-connection")
async def test_smtp_connection(
    req: SMTPTestRequest,
    current_user: User = Depends(get_current_user)
):
    """Establishes an active SMTP socket connection using aiosmtplib to verify credentials."""
    use_tls = req.security.upper() == "SSL"
    start_tls = req.security.upper() == "TLS"

    try:
        smtp_client = aiosmtplib.SMTP(
            hostname=req.host,
            port=req.port,
            use_tls=use_tls,
            timeout=10
        )
        
        await smtp_client.connect()
        
        if start_tls:
            await smtp_client.starttls()
            
        if req.username and req.password:
            await smtp_client.login(req.username, req.password)
            
        await smtp_client.quit()
        return {"success": True, "message": "Successfully connected and authenticated!"}
        
    except aiosmtplib.SMTPAuthenticationError:
        return {"success": False, "message": "Authentication failed. Check your username/password."}
    except aiosmtplib.SMTPConnectError:
        return {"success": False, "message": "Failed to connect to the SMTP server. Check Host and Port."}
    except Exception as e:
        return {"success": False, "message": f"Connection error: {str(e)}"}
