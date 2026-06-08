from typing import Optional
import jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.db.session import get_db
from app.db.models import AdminUser

# Admin-specific OAuth2 password bearer
oauth2_scheme_admin = OAuth2PasswordBearer(tokenUrl="/api/admin/login", auto_error=False)


async def get_current_admin(
    request: Request,
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme_admin)
) -> AdminUser:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate admin credentials. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    cookie_token = request.cookies.get("admin_token")
    if cookie_token:
        token = cookie_token

    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=["HS256"],
            options={"require": ["exp", "sub", "iat"]}
        )
        admin_id_str: str = payload.get("sub")
        role: str = payload.get("role")
        if admin_id_str is None or role != "admin":
            raise credentials_exception
        admin_id = int(admin_id_str)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin session has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (jwt.PyJWTError, ValueError):
        raise credentials_exception

    result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin = result.scalars().first()

    if admin is None:
        raise credentials_exception

    # Enforce token rotation signature check (pws)
    import secrets
    token_pws = payload.get("pws")
    if not token_pws or not admin.hashed_password:
        raise credentials_exception

    if not secrets.compare_digest(token_pws, admin.hashed_password[-10:]):
        raise credentials_exception

    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is disabled.",
        )

    return admin
