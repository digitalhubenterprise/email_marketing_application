from typing import AsyncGenerator, Optional
import jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.db.session import get_db
from app.db.models import User
from app.schemas.user import TokenData

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        token = cookie_token

    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=["HS256"],
            options={"require": ["exp", "sub", "iat"]}  # Enforce required claims
        )
        user_id_str: str = payload.get("sub")
        role: str = payload.get("role")
        if user_id_str is None or role != "user":
            raise credentials_exception
        token_data = TokenData(user_id=int(user_id_str))
    except (jwt.ExpiredSignatureError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (jwt.PyJWTError, ValueError):
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == token_data.user_id))
    user = result.scalars().first()

    if user is None:
        raise credentials_exception

    # Enforce token rotation signature check (pws)
    import secrets
    token_pws = payload.get("pws")
    if not token_pws or not user.hashed_password:
        raise credentials_exception
    
    if not secrets.compare_digest(token_pws, user.hashed_password[-10:]):
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Please contact support.",
        )

    # Check if subscription has expired
    if user.subscription_tier != "expired" and user.subscription_expires_at:
        from app.db.models import utc_now_naive
        if user.subscription_expires_at < utc_now_naive():
            user.subscription_tier = "expired"
            db.add(user)
            await db.commit()
            await db.refresh(user)

    return user


async def verify_active_subscription(
    current_user: User = Depends(get_current_user)
) -> User:
    """Enforces active subscription/trial check for functional endpoints."""
    if current_user.subscription_tier == "expired":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SUBSCRIPTION_EXPIRED"
        )
    return current_user

