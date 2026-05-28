from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.db.models import User, SystemConfig
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    validate_password_strength,
)
from app.schemas.user import UserCreate, UserResponse, Token
from app.api.deps import get_current_user

router = APIRouter()

# Rate limiter — uses client IP address as the key
limiter = Limiter(key_func=get_remote_address)


# ─── Schemas ──────────────────────────────────────────────────────────

class UpgradeRequest(BaseModel):
    tier: str

    @field_validator("tier")
    @classmethod
    def tier_must_be_valid(cls, v: str) -> str:
        allowed = {"free", "pro", "business", "enterprise"}
        if v.lower() not in allowed:
            raise ValueError(f"Invalid tier. Must be one of: {', '.join(sorted(allowed))}")
        return v.lower()


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ─── Register ─────────────────────────────────────────────────────────

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")          # Max 10 registration attempts per minute per IP
async def register(request: Request, user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    # Validate password strength
    is_strong, pw_error = validate_password_strength(user_in.password)
    if not is_strong:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=pw_error)

    # Check for existing email
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        subscription_tier="free",
        quota_limit=5000,
        quota_sent=0,
    )
    db.add(new_user)
    await db.flush()
    await db.commit()
    await db.refresh(new_user)

    # Queue system Welcome Email task
    try:
        from app.tasks.email_sender import send_system_email_task
        send_system_email_task.delay(
            recipient_email=new_user.email,
            subject="Welcome to our platform!",
            html_body=f"<h1>Welcome to SmartCampaign!</h1><p>Your marketing workspace is ready. You are on the Free tier with {new_user.quota_limit:,} monthly email sends included.</p>"
        )
    except Exception as e:
        print(f"Error queuing registration welcome email: {e}")

    return new_user


# ─── Login ────────────────────────────────────────────────────────────

@router.post("/login", response_model=Token)
@limiter.limit("20/minute")          # Max 20 login attempts per minute per IP
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()

    # Constant-time comparison prevents timing attacks
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been disabled. Please contact support.",
        )

    return {"access_token": create_access_token(subject=user.id), "token_type": "bearer"}


# ─── Current User ─────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ─── Change Password ──────────────────────────────────────────────────

@router.post("/change-password", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")           # Max 5 password change attempts per minute
async def change_password(
    request: Request,
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Allows an authenticated user to change their own password."""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    is_strong, pw_error = validate_password_strength(payload.new_password)
    if not is_strong:
        raise HTTPException(status_code=422, detail=pw_error)

    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must differ from the current one.")

    current_user.hashed_password = get_password_hash(payload.new_password)
    db.add(current_user)
    await db.commit()
    return {"message": "Password updated successfully."}


# ─── Subscription Upgrade ─────────────────────────────────────────────

@router.post("/upgrade", response_model=UserResponse)
async def upgrade_tier(
    payload: UpgradeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upgrades or changes the authenticated user's subscription tier and quota."""
    valid_tiers = {
        "free": 5000,
        "pro": 50000,
        "business": 200000,
        "enterprise": 999999999,
    }
    current_user.subscription_tier = payload.tier
    current_user.quota_limit = valid_tiers[payload.tier]
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/config")
async def get_public_config(db: AsyncSession = Depends(get_db)):
    """Exposes public platform configurations for standard branding and announcement broadcasts."""
    res = await db.execute(select(SystemConfig).where(SystemConfig.id == 1))
    config = res.scalars().first()
    if not config:
        return {
            "site_name": "SmartCampaign",
            "logo_url": None,
            "support_email": "support@smartcampaign.today",
            "announcement_active": False,
            "announcement_message": None,
            "maintenance_mode": False,
            "seo_meta_title": "SmartCampaign - Modern SaaS Email Marketing Platform",
            "seo_meta_description": "Create, personalize, monitor, and scale email marketing campaigns dynamically.",
            "seo_meta_keywords": "email marketing, smtp, celery, dispatch, saas"
        }
    return {
        "site_name": config.site_name,
        "logo_url": config.logo_url,
        "support_email": config.support_email,
        "announcement_active": config.announcement_active,
        "announcement_message": config.announcement_message,
        "maintenance_mode": config.maintenance_mode,
        "seo_meta_title": config.seo_meta_title,
        "seo_meta_description": config.seo_meta_description,
        "seo_meta_keywords": config.seo_meta_keywords
    }

