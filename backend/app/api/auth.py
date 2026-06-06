from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.db.models import User, SystemConfig, SubscriptionPlan, PaymentLog
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    validate_password_strength,
)
from app.schemas.user import UserCreate, UserResponse, Token
from app.api.deps import get_current_user

router = APIRouter()

# Rate limiter key function to extract real client IP behind reverse proxy
def get_real_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    return get_remote_address(request)

# Rate limiter — uses real client IP address as the key
limiter = Limiter(key_func=get_real_client_ip)


# ─── Schemas ──────────────────────────────────────────────────────────

class UpgradeRequest(BaseModel):
    tier: str


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

    # Check Multi-Factor Authentication (MFA)
    if user.two_factor_enabled or user.two_factor_telegram_enabled:
        mfa_code = request.headers.get("X-2FA-Code") or request.headers.get("x-2fa-code")
        if not mfa_code:
            # If Telegram 2FA is active, dispatch verification code automatically
            if user.two_factor_telegram_enabled and user.telegram_2fa_secret and user.telegram_chat_id:
                try:
                    import pyotp
                    # 1. Resolve Bot Token
                    res = await db.execute(select(SystemConfig).where(SystemConfig.id == 1))
                    sys_config = res.scalars().first()
                    bot_token = sys_config.telegram_bot_token if sys_config else None

                    if not bot_token:
                        from app.db.models import TelegramMarketingConfig
                        user_config_res = await db.execute(
                            select(TelegramMarketingConfig).where(TelegramMarketingConfig.user_id == user.id)
                        )
                        user_config = user_config_res.scalars().first()
                        bot_token = user_config.telegram_bot_token if user_config else None

                    if bot_token:
                        totp = pyotp.TOTP(user.telegram_2fa_secret)
                        code = totp.now()
                        import aiohttp
                        telegram_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                        message_text = (
                            f"🔒 *SmartCampaign Login Code*\n\n"
                            f"Your login verification code is: *{code}*\n\n"
                            f"If you did not request this, please secure your credentials."
                        )
                        payload_data = {
                            "chat_id": user.telegram_chat_id,
                            "text": message_text,
                            "parse_mode": "Markdown"
                        }
                        async with aiohttp.ClientSession() as session:
                            await session.post(telegram_url, json=payload_data, timeout=8)
                except Exception as tg_err:
                    print(f"Error dispatching login Telegram OTP: {tg_err}")

            method = "telegram" if user.two_factor_telegram_enabled else "google"
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="2FA_REQUIRED"
            )

        # Verify the 2FA code
        import pyotp
        verified = False
        if user.two_factor_enabled and user.two_factor_secret:
            totp = pyotp.TOTP(user.two_factor_secret)
            if totp.verify(mfa_code, valid_window=1):
                verified = True

        if not verified and user.two_factor_telegram_enabled and user.telegram_2fa_secret:
            totp = pyotp.TOTP(user.telegram_2fa_secret)
            if totp.verify(mfa_code, valid_window=1):
                verified = True

        if not verified:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect 2FA verification code."
            )

    return {"access_token": create_access_token(subject=user.id, role="user"), "token_type": "bearer"}  # nosec


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


@router.post("/upgrade", response_model=UserResponse)
async def upgrade_tier(
    payload: UpgradeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Plan upgrades processed via the Billing & Checkout interface."""
    tier_lower = payload.tier.strip().lower()
    
    plan_res = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.tier == tier_lower))
    plan = plan_res.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Subscription plan not found in catalogs.")
    
    current_user.subscription_tier = tier_lower
    current_user.quota_limit = plan.quota
    current_user.is_active = True
    db.add(current_user)
    
    new_payment = PaymentLog(
        user_id=current_user.id,
        user_email=current_user.email,
        amount=plan.price,
        currency="USD",
        plan_tier=tier_lower,
        gateway="Stripe",
        status="paid",
        notes=f"Simulated upgrade to {plan.name} plan."
    )
    db.add(new_payment)
    await db.commit()
    await db.refresh(current_user)
    return current_user


# ─── Subscription Plans Public Fetch ───────────────────────────────────

@router.get("/plans")
async def list_public_plans(
    db: AsyncSession = Depends(get_db)
):
    """Public route to list all subscription plans."""
    res = await db.execute(select(SubscriptionPlan).order_by(SubscriptionPlan.price.asc()))
    plans = res.scalars().all()
    result = []
    for p in plans:
        result.append({
            "id": p.id,
            "tier": p.tier,
            "name": p.name,
            "price": p.price,
            "quota": p.quota,
            "smtpLimit": p.smtp_limit,
            "validity": p.validity,
            "throttle": p.throttle,
            "features": p.features.split("\n") if p.features else [],
            "created_at": p.created_at
        })
    return result



class PaymentSubmitRequest(BaseModel):
    amount: float
    currency: str
    plan_tier: str
    gateway: str
    txhash: str
    notes: Optional[str] = None


async def verify_bep20_transaction(tx_hash: str, expected_amount: float) -> tuple[bool, float, str]:
    import os
    is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"

    if is_production:
        if not tx_hash:
            return False, 0.0, "Transaction hash cannot be empty."
        if tx_hash.startswith("MOCK_TXN_") or tx_hash.startswith("TXN-"):
            return False, 0.0, "Mock transactions are not allowed in production."
    else:
        if tx_hash.startswith("MOCK_TXN_") or tx_hash.startswith("TXN-") or not tx_hash:
            return True, expected_amount, "Simulated BEP20 receipt accepted."
        
    import aiohttp
    import asyncio
    import json
    
    rpc_urls = [
        "https://bsc-rpc.publicnode.com",
        "https://bsc-dataseed.binance.org"
    ]
    
    usdt_contract = "0x55d398326f99059ff775485246999027b3197955"
    merchant_topic = "0x0000000000000000000000009399f9bc69f92e025a99d2a794e4db0c42b56751"
    transfer_topic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
    
    for url in rpc_urls:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    json={
                        "jsonrpc": "2.0",
                        "method": "eth_getTransactionReceipt",
                        "params": [tx_hash],
                        "id": 1
                    },
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    if response.status == 200:
                        res_data = await response.json()
                        if res_data and "result" in res_data and res_data["result"]:
                            receipt = res_data["result"]
                            if receipt.get("status") != "0x1":
                                return False, 0.0, "Transaction was reverted on the blockchain."
                            
                            logs = receipt.get("logs", [])
                            transfer_log = None
                            for log in logs:
                                topics = log.get("topics", [])
                                if (log.get("address", "").lower() == usdt_contract.lower() and
                                    len(topics) >= 3 and
                                    topics[0] == transfer_topic and
                                    topics[2].lower() == merchant_topic.lower()):
                                    transfer_log = log
                                    break
                            
                            if transfer_log:
                                raw_val = int(transfer_log.get("data", "0x0"), 16)
                                amount = raw_val / 1e18
                                return True, amount, f"Verified transfer of {amount} USDT."
                            else:
                                return False, 0.0, "Transaction does not match merchant address transfer log."
        except (aiohttp.ClientError, asyncio.TimeoutError):
            continue
        except Exception as e:
            import logging
            logging.getLogger("app.api.auth").warning("Unexpected transaction check error: %s", e)
            continue
            
    return False, 0.0, "Transaction could not be verified on the BSC network."


@router.post("/my-payments")
async def submit_payment(
    payload: PaymentSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submits a user payment log. Performs server-side BEP20 blockchain validation when applicable."""
    from app.db.models import PaymentLog
    
    status_val = "pending"
    gateway_clean = payload.gateway.lower()
    tx_hash = payload.txhash.strip()
    
    notes_val = f"[ADD_FUND] {payload.notes or ''}".strip()
    
    if "usdt" in gateway_clean or "bep20" in gateway_clean or "binance" in gateway_clean:
        success, verified_amount, log_msg = await verify_bep20_transaction(tx_hash, payload.amount)
        if success:
            status_val = "paid"
            notes_val = f"[ADD_FUND] Verified {log_msg} | TXID: {tx_hash}"
            if payload.plan_tier != "free":
                plan_res = await db.execute(
                    select(SubscriptionPlan).where(SubscriptionPlan.tier == payload.plan_tier.strip().lower())
                )
                plan = plan_res.scalars().first()
                if not plan:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Requested subscription plan tier does not exist."
                    )
                current_user.subscription_tier = plan.tier
                current_user.quota_limit = plan.quota
                db.add(current_user)
        else:
            raise HTTPException(status_code=400, detail=log_msg)
            
    new_payment = PaymentLog(
        user_id=current_user.id,
        user_email=current_user.email,
        amount=float(payload.amount),
        currency=payload.currency,
        plan_tier=payload.plan_tier,
        gateway=payload.gateway,
        status=status_val,
        notes=notes_val
    )
    db.add(new_payment)
    await db.commit()
    await db.refresh(new_payment)
    
    return {
        "success": True,
        "payment": {
            "id": new_payment.id,
            "status": new_payment.status,
            "amount": new_payment.amount,
            "notes": new_payment.notes
        }
    }


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


class SettingsUpdateRequest(BaseModel):
    brand_primary_color: Optional[str] = None
    brand_secondary_color: Optional[str] = None
    brand_font_family: Optional[str] = None
    notification_settings: Optional[str] = None


class TwoFactorVerifyRequest(BaseModel):
    code: str
    secret: str


class Telegram2FASetupRequest(BaseModel):
    telegram_chat_id: str


class Telegram2FAVerifyRequest(BaseModel):
    code: str
    secret: str
    telegram_chat_id: str


@router.post("/update-settings", response_model=UserResponse)
async def update_settings(
    payload: SettingsUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Allows standard users to customize brand style tokens and alert preferences."""
    if payload.brand_primary_color is not None:
        current_user.brand_primary_color = payload.brand_primary_color
    if payload.brand_secondary_color is not None:
        current_user.brand_secondary_color = payload.brand_secondary_color
    if payload.brand_font_family is not None:
        current_user.brand_font_family = payload.brand_font_family
    if payload.notification_settings is not None:
        current_user.notification_settings = payload.notification_settings

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/2fa/setup")
async def setup_two_factor(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generates a secure offline TOTP seed and mock QR code URI for authenticator linkage."""
    try:
        import pyotp
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MFA library (pyotp) is not installed on the server."
        )
    
    secret = pyotp.random_base32()
    provision_url = pyotp.totp.TOTP(secret).provisioning_uri(
        name=current_user.email,
        issuer_name="SmartCampaign"
    )

    return {
        "secret": secret,
        "provision_url": provision_url
    }


@router.post("/2fa/enable", response_model=UserResponse)
async def enable_two_factor(
    payload: TwoFactorVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Verifies the TOTP code and turns on MFA protection on the account."""
    try:
        import pyotp
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MFA library (pyotp) is not installed on the server."
        )

    totp = pyotp.TOTP(payload.secret)
    if not totp.verify(payload.code):
        raise HTTPException(status_code=400, detail="Invalid 2FA verification token.")

    current_user.two_factor_secret = payload.secret
    current_user.two_factor_enabled = True
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user



@router.post("/2fa/disable", response_model=UserResponse)
async def disable_two_factor(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """De-activates MFA authentication on the account."""
    current_user.two_factor_secret = None
    current_user.two_factor_enabled = False
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/2fa/telegram/setup")
async def setup_telegram_2fa(
    payload: Telegram2FASetupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generates a TOTP secret and dispatches the initial verification code via Telegram Bot."""
    try:
        import pyotp
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MFA library (pyotp) is not installed on the server."
        )

    # 1. Resolve Telegram Bot Token
    # First check SystemConfig
    res = await db.execute(select(SystemConfig).where(SystemConfig.id == 1))
    sys_config = res.scalars().first()
    bot_token = sys_config.telegram_bot_token if sys_config else None

    # Fallback to user's TelegramMarketingConfig
    if not bot_token:
        from app.db.models import TelegramMarketingConfig
        user_config_res = await db.execute(
            select(TelegramMarketingConfig).where(TelegramMarketingConfig.user_id == current_user.id)
        )
        user_config = user_config_res.scalars().first()
        bot_token = user_config.telegram_bot_token if user_config else None

    if not bot_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Telegram Bot Token is not configured. Please contact support or set your Telegram Bot Token in Telegram Marketing settings."
        )

    # 2. Generate secret and code
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    code = totp.now()

    # 3. Dispatch code to Telegram Chat ID
    import aiohttp
    telegram_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    message_text = (
        f"🔒 *SmartCampaign Security Alert*\n\n"
        f"Your Telegram 2FA verification code is: *{code}*\n\n"
        f"Enter this code in your browser to complete your setup. Do not share this code with anyone."
    )
    payload_data = {
        "chat_id": payload.telegram_chat_id,
        "text": message_text,
        "parse_mode": "Markdown"
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(telegram_url, json=payload_data, timeout=10) as response:
                if response.status != 200:
                    raw_err = await response.text()
                    raise HTTPException(
                        status_code=400,
                        detail=f"Telegram API returned an error. Ensure you have started the bot. Error: {raw_err}"
                    )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500,
            detail=f"Failed to communicate with Telegram API: {str(e)}"
        )

    return {
        "secret": secret,
        "telegram_chat_id": payload.telegram_chat_id
    }


@router.post("/2fa/telegram/enable", response_model=UserResponse)
async def enable_telegram_2fa(
    payload: Telegram2FAVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Verifies the Telegram OTP and activates Telegram 2FA protection on the account."""
    try:
        import pyotp
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MFA library (pyotp) is not installed on the server."
        )

    totp = pyotp.TOTP(payload.secret)
    if not totp.verify(payload.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid Telegram 2FA verification code.")

    current_user.telegram_2fa_secret = payload.secret
    current_user.telegram_chat_id = payload.telegram_chat_id
    current_user.two_factor_telegram_enabled = True
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/2fa/telegram/disable", response_model=UserResponse)
async def disable_telegram_2fa(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """De-activates Telegram 2FA authentication on the account."""
    current_user.telegram_2fa_secret = None
    current_user.telegram_chat_id = None
    current_user.two_factor_telegram_enabled = False
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/my-payments")
async def get_my_payments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Fetches all payment logs for the currently logged-in user to sync their wallet balance."""
    from app.db.models import PaymentLog
    result = await db.execute(
        select(PaymentLog)
        .where(PaymentLog.user_email == current_user.email)
        .order_by(PaymentLog.created_at.desc())
    )
    payments = result.scalars().all()
    return [
        {
            "id": p.id,
            "amount": p.amount,
            "currency": p.currency,
            "plan_tier": p.plan_tier,
            "gateway": p.gateway,
            "status": p.status,
            "notes": p.notes,
            "created_at": p.created_at
        } for p in payments
    ]

