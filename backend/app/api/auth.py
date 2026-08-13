from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, ConfigDict, Field, field_validator, EmailStr
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
from app.middleware.csrf import set_csrf_cookie, csrf_dependency
from app.schemas.user import UserCreate, UserResponse, Token
from app.api.deps import get_current_user
from app.core.config import settings

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
from app.middleware.rate_limit import limiter


# ─── Schemas ──────────────────────────────────────────────────────────

class UpgradeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    tier: str
    payment_method: Optional[str] = "Stripe"
    billing_cycle: Optional[str] = "monthly"


class ChangePasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    current_password: str
    new_password: str


import re

# ─── Register ─────────────────────────────────────────────────────────

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")          # Max 5 registration attempts per minute per IP
async def register(request: Request, user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    # 1. Anti-Bot Honeypot Trap Check
    if user_in.website_hp and len(user_in.website_hp.strip()) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Automated bot submission detected."
        )

    # 2. Strict Input Boundary Checks & Sanitization
    email_clean = str(user_in.email).strip().lower()
    if len(email_clean) > 254:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Email address exceeds maximum length of 254 characters.")

    if len(user_in.password) > 128:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password exceeds maximum length of 128 characters.")

    phone_clean = None
    if user_in.phone_number:
        phone_clean = re.sub(r'[<>\'"\`\\]', '', user_in.phone_number.strip())[:32]

    # 3. Validate password strength
    is_strong, pw_error = validate_password_strength(user_in.password)
    if not is_strong:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=pw_error)

    # 4. Check for existing email
    result = await db.execute(select(User).where(User.email == email_clean))
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    # 5. Check global config for email verification requirement
    res = await db.execute(select(SystemConfig).where(SystemConfig.id == 1))
    sys_config = res.scalars().first()
    email_verification_required = sys_config.email_verification_required if sys_config else False

    from app.db.models import utc_now_naive
    new_user = User(
        email=email_clean,
        hashed_password=get_password_hash(user_in.password),
        phone_number=phone_clean,
        subscription_tier="trial",
        quota_limit=5000,
        quota_sent=0,
        subscription_expires_at=utc_now_naive() + timedelta(days=15),
    )

    if email_verification_required:
        import pyotp
        new_user.email_verified = False
        new_user.email_verification_secret = pyotp.random_base32()
        db.add(new_user)
        await db.flush()
        await db.commit()
        await db.refresh(new_user)

        # Generate and dispatch verification code via email
        totp = pyotp.TOTP(new_user.email_verification_secret)
        code = totp.now()

        try:
            from app.tasks.email_sender import send_system_email_task
            send_system_email_task.delay(
                recipient_email=new_user.email,
                subject="🔒 Verify Your Email Address",
                html_body=(
                    f"<h1>Confirm Your Registration</h1>"
                    f"<p>Thank you for signing up! Your verification code is: <strong>{code}</strong></p>"
                    f"<p>Please enter this code on the verification screen to activate your account. The code is valid for 5 minutes.</p>"
                )
            )
        except Exception as e:
            print(f"Error queuing email verification OTP: {e}")
    else:
        new_user.email_verified = True
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
                html_body=f"<h1>Welcome to SmartCampaign!</h1><p>Your workspace is ready. You are on the Free tier with {new_user.quota_limit:,} monthly email sends included.</p>"
            )
        except Exception as e:
            print(f"Error queuing registration welcome email: {e}")

    return new_user


# ─── Login ────────────────────────────────────────────────────────────

@router.post("/login", response_model=Token)
@limiter.limit("10/minute")          # Max 10 login attempts per minute per IP
async def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    from app.db.models import utc_now_naive
    now = utc_now_naive()

    email_clean = form_data.username.strip().lower()
    if len(email_clean) > 254 or len(form_data.password) > 128:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(select(User).where(User.email == email_clean))
    user = result.scalars().first()

    # 1. Check Account Lockout Policy
    if user and user.locked_until:
        if user.locked_until > now:
            diff_mins = int((user.locked_until - now).total_seconds() / 60) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Account is temporarily locked due to multiple failed login attempts. Please try again in {diff_mins} minute(s)."
            )
        else:
            # Lock expired, reset lockout state
            user.locked_until = None
            user.failed_login_attempts = 0
            db.add(user)
            await db.commit()

    # 2. Constant-time password comparison to prevent timing attacks
    password_valid = verify_password(form_data.password, user.hashed_password) if user else False

    if not user or not password_valid:
        if user:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= 5:
                user.locked_until = now + timedelta(minutes=15)
            db.add(user)
            await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Successful login - Reset failure counter & lockout status
    if (user.failed_login_attempts or 0) > 0 or user.locked_until is not None:
        user.failed_login_attempts = 0
        user.locked_until = None
        db.add(user)
        await db.commit()

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been disabled. Please contact support.",
        )

    # Check Multi-Factor Authentication (MFA) & Email Verification
    res = await db.execute(select(SystemConfig).where(SystemConfig.id == 1))
    sys_config = res.scalars().first()
    email_verification_required = sys_config.email_verification_required if sys_config else False
    two_factor_email_enabled = sys_config.two_factor_email_enabled if sys_config else False

    # 1. Require signup email verification if not yet verified
    if email_verification_required and not user.email_verified:
        import pyotp
        if not user.email_verification_secret:
            user.email_verification_secret = pyotp.random_base32()
            db.add(user)
            await db.commit()
            await db.refresh(user)

        totp = pyotp.TOTP(user.email_verification_secret)
        code = totp.now()

        try:
            from app.tasks.email_sender import send_system_email_task
            send_system_email_task.delay(
                recipient_email=user.email,
                subject="🔒 Verify Your Email Address",
                html_body=(
                    f"<h1>Confirm Your Registration</h1>"
                    f"<p>Your verification code is: <strong>{code}</strong></p>"
                    f"<p>Please enter this code on the verification screen to activate your account. The code is valid for 5 minutes.</p>"
                )
            )
        except Exception as e:
            print(f"Error queuing verification email: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="EMAIL_VERIFICATION_REQUIRED"
        )

    # 2. Check 2FA types (Google Auth, Telegram 2FA, Email 2FA)
    if user.two_factor_enabled or user.two_factor_telegram_enabled or two_factor_email_enabled:
        mfa_code = request.headers.get("X-2FA-Code") or request.headers.get("x-2fa-code")
        if not mfa_code:
            # Dispatch codes automatically
            # Telegram 2FA dispatch
            if user.two_factor_telegram_enabled and user.telegram_2fa_secret and user.telegram_chat_id:
                try:
                    import pyotp
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

            # Email 2FA dispatch
            if two_factor_email_enabled:
                try:
                    import pyotp
                    if not user.email_2fa_secret:
                        user.email_2fa_secret = pyotp.random_base32()
                        db.add(user)
                        await db.commit()
                        await db.refresh(user)
                    totp = pyotp.TOTP(user.email_2fa_secret)
                    code = totp.now()
                    from app.tasks.email_sender import send_system_email_task
                    send_system_email_task.delay(
                        recipient_email=user.email,
                        subject="🔒 SmartCampaign Login OTP",
                        html_body=(
                            f"<h1>Security Verification</h1>"
                            f"<p>Your security login OTP code is: <strong>{code}</strong></p>"
                            f"<p>If you did not request this code, please secure your account immediately.</p>"
                        )
                    )
                except Exception as email_err:
                    print(f"Error dispatching login Email OTP: {email_err}")

            # Challenge response depending on config
            # If ONLY Email 2FA is active, indicate EMAIL challenge
            detail_msg = "2FA_EMAIL_REQUIRED" if (two_factor_email_enabled and not user.two_factor_enabled and not user.two_factor_telegram_enabled) else "2FA_REQUIRED"
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=detail_msg
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

        if not verified and two_factor_email_enabled and user.email_2fa_secret:
            totp = pyotp.TOTP(user.email_2fa_secret)
            if totp.verify(mfa_code, valid_window=1):
                verified = True

        if not verified:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect 2FA verification code."
            )

    access_token = create_access_token(subject=user.id, role="user", password_hash=user.hashed_password)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.ENVIRONMENT.lower() == "production",
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    # Set CSRF token cookie for state‑changing requests
    set_csrf_cookie(response)
    return {"access_token": access_token, "token_type": "bearer", "role": "user", "email": user.email}  # nosec


# ─── Current User ─────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ─── Change Password ──────────────────────────────────────────────────

@router.post("/change-password", status_code=status.HTTP_200_OK, dependencies=[Depends(csrf_dependency())])
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


@router.post("/upgrade", response_model=UserResponse, dependencies=[Depends(csrf_dependency())])
async def upgrade_tier(
    payload: UpgradeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Plan upgrades processed via the Billing & Checkout interface."""
    tier_lower = payload.tier.strip().lower()
    billing_cycle_lower = (payload.billing_cycle or "monthly").strip().lower()
    
    plan_res = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.tier == tier_lower))
    plan = plan_res.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Subscription plan not found in catalogs.")
    
    # Calculate amount: (public_price - discount) if configured, else fallback to standard price
    base_amount = plan.price
    if plan.public_price and plan.public_price > 0:
        discount_val = plan.discount or 0
        base_amount = max(0, plan.public_price - discount_val)
        
    if billing_cycle_lower == "yearly":
        upgrade_amount = int(base_amount * 12 * 0.8)  # 20% discount on yearly billing
    else:
        upgrade_amount = base_amount
        
    price_in_dollars = float(upgrade_amount) / 100.0
    gateway_val = payload.payment_method or "Stripe"
    
    from datetime import timedelta
    from app.db.models import utc_now_naive
    
    if billing_cycle_lower == "yearly":
        expiry_date = utc_now_naive() + timedelta(days=365)
        cycle_label = "Yearly"
    else:
        expiry_date = utc_now_naive() + timedelta(days=30)
        cycle_label = "Monthly"
    
    if gateway_val.lower() == "wallet":
        # Compute user's wallet balance securely from database logs
        result = await db.execute(
            select(PaymentLog)
            .where(PaymentLog.user_email == current_user.email)
            .where(PaymentLog.status == "paid")
        )
        payments = result.scalars().all()
        
        balance = 0.00
        for p in payments:
            if p.notes and p.notes.startswith("[OVERDRIVE]"):
                continue
            # Since debit amount is stored as negative, adding it naturally subtracts
            balance += p.amount
            
        if balance < price_in_dollars:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient wallet balance. Required: ${price_in_dollars:.2f}, Available: ${balance:.2f}."
            )
            
        # Create wallet debit transaction
        gateway_val = "Wallet"
        notes_val = f"[DEBIT] {cycle_label} Plan Upgrade to {plan.name} (Wallet Deduction)"
        payment_amount = -price_in_dollars
    else:
        gateway_val = "Stripe"
        notes_val = f"Simulated {cycle_label.lower()} upgrade to {plan.name} plan."
        payment_amount = price_in_dollars

    current_user.subscription_tier = tier_lower
    current_user.quota_limit = plan.quota
    current_user.subscription_expires_at = expiry_date
    current_user.is_active = True
    db.add(current_user)
    
    new_payment = PaymentLog(
        user_id=current_user.id,
        user_email=current_user.email,
        amount=payment_amount,
        currency="USD",
        plan_tier=tier_lower,
        gateway=gateway_val,
        status="paid",
        notes=notes_val
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
            "publicPrice": p.public_price or 0,
            "discount": p.discount or 0,
            "quota": p.quota,
            "smtpLimit": p.smtp_limit,
            "validity": p.validity,
            "throttle": p.throttle,
            "features": p.features.split("\n") if p.features else [],
            "created_at": p.created_at
        })
    return result



class PaymentSubmitRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    amount: float = Field(gt=0, le=1_000_000)
    currency: str = Field(min_length=3, max_length=10)
    plan_tier: str = Field(min_length=1, max_length=32)
    gateway: str = Field(min_length=1, max_length=32)
    txhash: str = Field(default="", max_length=128)
    notes: Optional[str] = None


async def verify_trc20_transaction(db: AsyncSession, tx_hash: str, expected_amount: float) -> tuple[bool, float, str]:
    import os
    import re
    import time
    
    tx_hash = tx_hash.strip().lower()
    
    is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"

    if is_production:
        if not tx_hash:
            return False, 0.0, "Transaction hash cannot be empty."
        if tx_hash.startswith("mock_txn_") or tx_hash.startswith("txn-"):
            return False, 0.0, "Mock transactions are not allowed in production."
    else:
        if tx_hash.startswith("mock_txn_") or tx_hash.startswith("txn-") or not tx_hash:
            return True, expected_amount, "Simulated blockchain receipt accepted."

    # 1. Format check
    if not re.match(r"^[a-fA-F0-9]{64}$", tx_hash):
        return False, 0.0, "Invalid TRON transaction hash format. Must be a 64-character hex string."

    # 2. Duplicate check (case-insensitive)
    from app.db.models import PaymentLog
    stmt = select(PaymentLog).where(PaymentLog.notes.ilike(f"%{tx_hash}%"))
    res = await db.execute(stmt)
    existing = res.scalars().first()
    if existing:
        return False, 0.0, "Duplicate transaction ID. This transaction has already been credited."

    # Redis-based distributed double-spending lock check
    import redis.asyncio as aioredis
    try:
        redis_client = aioredis.from_url(settings.REDIS_URL)
        lock_key = f"tx_lock:{tx_hash}"
        acquired = await redis_client.set(lock_key, "1", ex=60, nx=True)
        await redis_client.close()
        if not acquired:
            return False, 0.0, "This transaction is currently being processed. Please wait a moment."
    except Exception as redis_err:
        import logging
        logging.getLogger("app.api.auth").warning("Redis lock connection failed: %s", redis_err)
        if is_production:
            return False, 0.0, "Payment verification system is busy. Please try again in a moment."

    # Fetch admin configuration
    res = await db.execute(select(SystemConfig).where(SystemConfig.id == 1))
    config = res.scalars().first()
    merchant_address = config.payment_gateway_trc20 if config else ""
    if not merchant_address:
        return False, 0.0, "TRC20 payment gateway address is not configured by the administrator."

    # 3. API Call
    import aiohttp
    import asyncio
    url = f"https://apilist.tronscanapi.com/api/transaction-info?txId={tx_hash}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "application/json"
    }
    tron_key = os.getenv("TRON_PRO_API_KEY")
    if tron_key:
        headers["TRON-PRO-API-KEY"] = tron_key

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=8)) as response:
                if response.status != 200:
                    return False, 0.0, f"TronScan API error (HTTP {response.status})."
                res_data = await response.json()
                if not res_data:
                    return False, 0.0, "Received empty response from TronScan API."
    except Exception as e:
        return False, 0.0, f"Failed to connect to TronScan API: {str(e)}"

    # 4. 5 security checks
    # Check 1: Confirmed
    if not res_data.get("confirmed"):
        return False, 0.0, "Transaction is not yet confirmed on the TRON network."

    # Check 1b: Age check (2 hours)
    block_timestamp_ms = res_data.get("blockTimeStamp")
    if block_timestamp_ms:
        tx_time = block_timestamp_ms / 1000.0
        current_time = time.time()
        if current_time - tx_time > 7200:
            return False, 0.0, "Transaction is older than 2 hours. Please contact the administrator for manual review."

    # Check 2: contractRet
    if res_data.get("contractRet") != "SUCCESS":
        return False, 0.0, "Transaction execution status is not SUCCESS."

    # Check 3: destination address matching admin wallet
    transfer_info = res_data.get("tokenTransferInfo")
    if not transfer_info:
        return False, 0.0, "No TRC20 token transfer information found in this transaction."

    to_address = None
    amount_str = None
    token_id = None

    if isinstance(transfer_info, dict):
        to_address = transfer_info.get("to_address")
        amount_str = transfer_info.get("amount_str")
        token_id = transfer_info.get("tokenId")
    elif isinstance(transfer_info, list) and len(transfer_info) > 0:
        to_address = transfer_info[0].get("to_address")
        amount_str = transfer_info[0].get("amount_str")
        token_id = transfer_info[0].get("tokenId")

    if not token_id or token_id.lower() != "tr7nhqjekqxgtci8q8zy4pl8otszgjlj6t":
        return False, 0.0, "The transferred token is not USDT TRC20."

    if not to_address or to_address.lower() != merchant_address.lower():
        return False, 0.0, f"Recipient address {to_address} does not match configured merchant wallet."

    # Check 4: Amount check
    if not amount_str:
        return False, 0.0, "Could not determine transaction amount."
    try:
        actual_amount = float(amount_str) / 1000000.0
    except (ValueError, TypeError):
        return False, 0.0, "Failed to parse transaction amount."

    if abs(actual_amount - expected_amount) > 0.001:
        return False, 0.0, f"Recharge amount mismatch. Expected: {expected_amount}, Got: {actual_amount}"

    # Check 5: Confirmations >= 20
    confirmations = res_data.get("confirmations")
    if confirmations is not None:
        try:
            confirmations_int = int(confirmations)
            if confirmations_int < 20:
                return False, 0.0, f"Transaction has only {confirmations_int} confirmations. Requires at least 20."
        except (ValueError, TypeError):
            pass

    return True, actual_amount, f"Verified transfer of {actual_amount} USDT TRC20 to {merchant_address}."


async def verify_bep20_transaction(db: AsyncSession, tx_hash: str, expected_amount: float, gateway: str) -> tuple[bool, float, str]:
    import os
    import time
    
    tx_hash = tx_hash.strip().lower()
    
    is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"

    if is_production:
        if not tx_hash:
            return False, 0.0, "Transaction hash cannot be empty."
        if tx_hash.startswith("mock_txn_") or tx_hash.startswith("txn-"):
            return False, 0.0, "Mock transactions are not allowed in production."
    else:
        if tx_hash.startswith("mock_txn_") or tx_hash.startswith("txn-") or not tx_hash:
            return True, expected_amount, "Simulated blockchain receipt accepted."
        
    # Format check for BEP20 transaction hash
    import re
    if not re.match(r"^0x[a-fA-F0-9]{64}$", tx_hash):
        return False, 0.0, "Invalid BEP20 transaction hash format."
        
    # Duplicate check for BEP20 (case-insensitive)
    from app.db.models import PaymentLog
    stmt = select(PaymentLog).where(PaymentLog.notes.ilike(f"%{tx_hash}%"))
    res = await db.execute(stmt)
    existing = res.scalars().first()
    if existing:
        return False, 0.0, "Duplicate transaction ID. This transaction has already been credited."

    # Redis-based distributed double-spending lock check
    import redis.asyncio as aioredis
    try:
        redis_client = aioredis.from_url(settings.REDIS_URL)
        lock_key = f"tx_lock:{tx_hash}"
        acquired = await redis_client.set(lock_key, "1", ex=60, nx=True)
        await redis_client.close()
        if not acquired:
            return False, 0.0, "This transaction is currently being processed. Please wait a moment."
    except Exception as redis_err:
        import logging
        logging.getLogger("app.api.auth").warning("Redis lock connection failed: %s", redis_err)
        if is_production:
            return False, 0.0, "Payment verification system is busy. Please try again in a moment."

    import aiohttp
    import asyncio
    import json
    
    res = await db.execute(select(SystemConfig).where(SystemConfig.id == 1))
    config = res.scalars().first()
    
    gateway_clean = gateway.lower()
    if "usdc" in gateway_clean:
        merchant_address = config.payment_gateway_usdc_bep20 if config else ""
        contract_address = "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d"
        symbol = "USDC"
    else:
        merchant_address = config.payment_gateway_bep20 if config else ""
        contract_address = "0x55d398326f99059ff775485246999027b3197955"
        symbol = "USDT"

    if not merchant_address:
        merchant_address = "0x9399f9bc69f92e025a99d2a794e4db0c42b56751"

    clean_addr = merchant_address.lower().replace("0x", "")
    merchant_topic = f"0x{clean_addr.zfill(64)}"
    
    rpc_urls = [
        "https://bsc-rpc.publicnode.com",
        "https://bsc-dataseed.binance.org"
    ]
    
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
                        if res_data and "result" in res_data:
                            receipt = res_data["result"]
                            if receipt is None:
                                return False, 0.0, "Transaction not found on the blockchain."
                            if receipt.get("status") != "0x1":
                                return False, 0.0, "Transaction was reverted on the blockchain."
                            
                            # Age Check (2 hours)
                            block_number = receipt.get("blockNumber")
                            tx_time = 0
                            try:
                                async with session.post(
                                    url,
                                    json={
                                        "jsonrpc": "2.0",
                                        "method": "eth_getBlockByNumber",
                                        "params": [block_number, False],
                                        "id": 2
                                    },
                                    timeout=aiohttp.ClientTimeout(total=5)
                                ) as block_response:
                                    if block_response.status == 200:
                                        block_data = await block_response.json()
                                        if block_data and "result" in block_data and block_data["result"]:
                                            timestamp_hex = block_data["result"].get("timestamp")
                                            if timestamp_hex:
                                                tx_time = int(timestamp_hex, 16)
                            except Exception as block_err:
                                import logging
                                logging.getLogger("app.api.auth").warning("Failed to fetch block timestamp: %s", block_err)

                            if tx_time == 0:
                                return False, 0.0, "Could not verify block timestamp for transaction age check."
                            
                            if time.time() - tx_time > 7200:
                                return False, 0.0, "Transaction is older than 2 hours. Please contact the administrator for manual review."

                            logs = receipt.get("logs", [])
                            transfer_log = None
                            for log in logs:
                                topics = log.get("topics", [])
                                if (log.get("address", "").lower() == contract_address.lower() and
                                    len(topics) >= 3 and
                                    topics[0] == transfer_topic and
                                    topics[2].lower() == merchant_topic.lower()):
                                    transfer_log = log
                                    break
                            
                            if transfer_log:
                                raw_val = int(transfer_log.get("data", "0x0"), 16)
                                decimals = 18
                                amount = raw_val / (10 ** decimals)
                                
                                if abs(amount - expected_amount) > 0.001:
                                    return False, 0.0, f"Recharge amount mismatch. Expected: {expected_amount}, Got: {amount}"

                                return True, amount, f"Verified transfer of {amount} {symbol}."
                            else:
                                return False, 0.0, f"Transaction does not match merchant address transfer log ({merchant_address})."
        except (aiohttp.ClientError, asyncio.TimeoutError):
            continue
        except Exception as e:
            import logging
            logging.getLogger("app.api.auth").warning("Unexpected transaction check error: %s", e)
            continue
            
    return False, 0.0, "Transaction could not be verified on the BSC network."


@router.post("/my-payments", dependencies=[Depends(csrf_dependency())])
@limiter.limit("5/minute")
async def submit_payment(
    request: Request,
    payload: PaymentSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submits a user payment log. Performs server-side BEP20/TRC20 blockchain validation when applicable."""
    from app.db.models import PaymentLog
    
    status_val = "pending"
    gateway_clean = payload.gateway.lower()
    tx_hash = payload.txhash.strip()
    
    notes_val = f"[ADD_FUND] {payload.notes or ''}".strip()
    
    success = True
    verified_amount = payload.amount
    log_msg = ""
    is_blockchain_tx = False

    if "trc20" in gateway_clean or "tron" in gateway_clean:
        is_blockchain_tx = True
        success, verified_amount, log_msg = await verify_trc20_transaction(db, tx_hash, payload.amount)
    elif "usdt" in gateway_clean or "usdc" in gateway_clean or "bep20" in gateway_clean or "binance" in gateway_clean:
        is_blockchain_tx = True
        success, verified_amount, log_msg = await verify_bep20_transaction(db, tx_hash, payload.amount, payload.gateway)

    if is_blockchain_tx:
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
                  from datetime import timedelta
                  from app.db.models import utc_now_naive
                  current_user.subscription_tier = plan.tier
                  current_user.quota_limit = plan.quota
                  current_user.subscription_expires_at = utc_now_naive() + timedelta(days=30)
                  current_user.is_active = True
                  db.add(current_user)
        else:
            raise HTTPException(status_code=400, detail=log_msg)

        # Redis is only an optimization. Serialize the final credit decision
        # in PostgreSQL and re-check the canonical transaction ID.
        await db.scalar(select(User).where(User.id == current_user.id).with_for_update())
        duplicate = await db.scalar(
            select(PaymentLog.id).where(PaymentLog.transaction_id == tx_hash)
        )
        if duplicate:
            raise HTTPException(status_code=409, detail="This transaction has already been credited.")
            
    new_payment = PaymentLog(
        user_id=current_user.id,
        user_email=current_user.email,
        amount=float(verified_amount),
        currency=payload.currency,
        plan_tier=payload.plan_tier,
        gateway=payload.gateway,
        status=status_val,
        notes=notes_val,
        transaction_id=tx_hash if is_blockchain_tx else None,
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


import time

_public_config_cache = {"val": None, "exp": 0.0}

@router.get("/config")
async def get_public_config(response: Response, db: AsyncSession = Depends(get_db)):
    """Exposes public platform configurations for standard branding and announcement broadcasts."""
    response.headers["Cache-Control"] = "public, max-age=15"
    now = time.time()
    if _public_config_cache["val"] is not None and now < _public_config_cache["exp"]:
        return _public_config_cache["val"]

    res = await db.execute(select(SystemConfig).where(SystemConfig.id == 1))
    config = res.scalars().first()
    if not config:
        data = {
            "site_name": "SmartCampaign",
            "company_name": "ASTRA IT, Inc.",
            "logo_url": None,
            "footer_logo_url": None,
            "favicon_url": None,
            "support_email": "support@smartcampaign.today",
            "announcement_active": False,
            "announcement_message": None,
            "maintenance_mode": False,
            "seo_meta_title": "SmartCampaign - Modern SaaS Email Marketing Platform",
            "seo_meta_description": "Create, personalize, monitor, and scale email marketing campaigns dynamically.",
            "seo_meta_keywords": "email marketing, smtp, celery, dispatch, saas",
            "payment_gateway_trc20": "",
            "payment_gateway_bep20": "",
            "payment_gateway_usdc_bep20": "",
            "payment_gateway_merchant_id": "",
            "payment_gateway_qr_code": "",
            "payment_gateway_trc20_enabled": True,
            "payment_gateway_bep20_enabled": True,
            "payment_gateway_usdc_bep20_enabled": True,
            "payment_gateway_merchant_enabled": True
        }
    else:
        extra_gen = (config.extra_settings or {}).get("general_extra", {})
        data = {
            "site_name": config.site_name,
            "company_name": extra_gen.get("companyName") or "ASTRA IT, Inc.",
            "logo_url": config.logo_url,
            "footer_logo_url": extra_gen.get("footerLogoUrl") or None,
            "favicon_url": extra_gen.get("faviconUrl") or None,
            "support_email": config.support_email,
            "announcement_active": config.announcement_active,
            "announcement_message": config.announcement_message,
            "maintenance_mode": config.maintenance_mode,
            "seo_meta_title": config.seo_meta_title,
            "seo_meta_description": config.seo_meta_description,
            "seo_meta_keywords": config.seo_meta_keywords,
            "payment_gateway_trc20": config.payment_gateway_trc20 or "",
            "payment_gateway_bep20": config.payment_gateway_bep20 or "",
            "payment_gateway_usdc_bep20": config.payment_gateway_usdc_bep20 or "",
            "payment_gateway_merchant_id": config.payment_gateway_merchant_id or "",
            "payment_gateway_qr_code": config.payment_gateway_qr_code or "",
            "payment_gateway_trc20_enabled": config.payment_gateway_trc20_enabled if config.payment_gateway_trc20_enabled is not None else True,
            "payment_gateway_bep20_enabled": config.payment_gateway_bep20_enabled if config.payment_gateway_bep20_enabled is not None else True,
            "payment_gateway_usdc_bep20_enabled": config.payment_gateway_usdc_bep20_enabled if config.payment_gateway_usdc_bep20_enabled is not None else True,
            "payment_gateway_merchant_enabled": config.payment_gateway_merchant_enabled if config.payment_gateway_merchant_enabled is not None else True
        }

    _public_config_cache["val"] = data
    _public_config_cache["exp"] = now + 15.0
    return data


@router.get("/plans")
async def get_public_subscription_plans(db: AsyncSession = Depends(get_db)):
    """
    Public endpoint to fetch all active subscription plans from the database in real-time.
    Auto-seeds default SaaS tiers if no plans exist in the database yet.
    """
    res = await db.execute(select(SubscriptionPlan).order_by(SubscriptionPlan.price.asc()))
    plans = res.scalars().all()

    # Seed default plans if table is empty
    if not plans:
        default_plans = [
            SubscriptionPlan(
                tier="free",
                name="Starter",
                price=0,
                public_price=0,
                quota=1000,
                smtp_limit=1,
                validity="30 Days",
                features="1,000 Verified Contacts\n5,000 Email Sends / month\n1 Active SMTP Server Node\n5 Starter HTML Templates\nBasic Click & Open Analytics\nUnsubscribe Link Management\nStandard Email Support"
            ),
            SubscriptionPlan(
                tier="pro",
                name="Standard",
                price=15,
                public_price=15,
                quota=50000,
                smtp_limit=3,
                validity="30 Days",
                features="10,000 Verified Contacts\n50,000 Email Sends / month\n3 Active SMTP Server Nodes\nA/B Subject Line Split Testing\n20+ Premium Responsive Templates\nSMS Gateway Integration (Twilio/BulkSMS)\nAdvanced Heatmap & Device Analytics\nScheduled & Batch Dispatches\nPriority Support Response"
            ),
            SubscriptionPlan(
                tier="business",
                name="Premium",
                price=35,
                public_price=35,
                quota=200000,
                smtp_limit=5,
                validity="30 Days",
                features="50,000 Verified Contacts\n200,000 Email Sends / month\n5 Active SMTP Server Nodes\nFull Telegram Marketing Suite (IMEI/Bot)\nSMS & WhatsApp Dispatch Gateways\nDedicated IP Warm-up Manager\nCustom Unsubscribe Page Builder\nAutomated PDF Analytics Export\n24/7 Priority VIP Support"
            ),
            SubscriptionPlan(
                tier="enterprise",
                name="Enterprise",
                price=79,
                public_price=79,
                quota=1000000,
                smtp_limit=99,
                validity="30 Days",
                features="Unlimited Verified Contacts\nUnlimited Email Dispatches\nUnlimited Custom SMTP Nodes\nDhru Fusion API & Listener Suite\nDedicated Server Pool Architecture\nTRC20 & BEP20 Crypto Payment Gateways\nCustom Domain & CNAME Tracking\nSLA 99.99% Uptime Guarantee\nDedicated Account Executive"
            ),
        ]
        for p in default_plans:
            db.add(p)
        try:
            await db.commit()
            res = await db.execute(select(SubscriptionPlan).order_by(SubscriptionPlan.price.asc()))
            plans = res.scalars().all()
        except Exception as e:
            await db.rollback()

    output = []
    for p in plans:
        feature_list = [f.strip() for f in p.features.split("\n") if f.strip()] if p.features else []
        tier_lower = p.tier.lower()
        
        badge = "Free Trial"
        popular = False
        cta_text = "Get Started Free"

        if tier_lower in ("pro", "standard"):
            badge = "Most Popular"
            popular = True
            cta_text = "Start Standard Plan"
        elif tier_lower == "business":
            badge = "Best Value"
            cta_text = "Scale With Premium"
        elif tier_lower == "enterprise":
            badge = "Unlimited"
            cta_text = "Contact Enterprise"
        elif tier_lower not in ("free", "starter"):
            badge = f"{p.name} Tier"
            cta_text = f"Select {p.name}"

        # Normalize price to dollars (DB may store cents e.g. 1199, 2499 or dollars e.g. 15, 35)
        raw_price = p.price if p.price is not None else 0
        dollar_price = int(raw_price / 100) if raw_price > 200 else int(raw_price)

        output.append({
            "id": p.id,
            "tier": p.tier,
            "name": p.name,
            "price": dollar_price,
            "monthlyPrice": dollar_price,
            "annualPrice": int(dollar_price * 0.8) if dollar_price > 0 else 0,
            "public_price": dollar_price,
            "publicPrice": dollar_price,
            "discount": p.discount or 0,
            "quota": p.quota,
            "smtp_limit": p.smtp_limit,
            "validity": p.validity or "30 Days",
            "description": f"{p.name} tier plan with {p.quota:,} dispatch quota and {p.smtp_limit} SMTP nodes.",
            "badge": badge,
            "popular": popular,
            "features": feature_list,
            "ctaText": cta_text,
            "btnText": cta_text
        })

    return output


class SettingsUpdateRequest(BaseModel):
    brand_primary_color: Optional[str] = None
    brand_secondary_color: Optional[str] = None
    brand_font_family: Optional[str] = None
    notification_settings: Optional[str] = None
    username: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    phone_number: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None


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
    """Allows standard users to customize brand style tokens, alert preferences, and profile details."""
    if payload.brand_primary_color is not None:
        current_user.brand_primary_color = payload.brand_primary_color
    if payload.brand_secondary_color is not None:
        current_user.brand_secondary_color = payload.brand_secondary_color
    if payload.brand_font_family is not None:
        current_user.brand_font_family = payload.brand_font_family
    if payload.notification_settings is not None:
        current_user.notification_settings = payload.notification_settings
    if payload.username is not None:
        current_user.username = payload.username
    if payload.company is not None:
        current_user.company = payload.company
    if payload.address is not None:
        current_user.address = payload.address
    if payload.country is not None:
        current_user.country = payload.country
    if payload.phone_number is not None:
        current_user.phone_number = payload.phone_number
    if payload.language is not None:
        current_user.language = payload.language
    if payload.timezone is not None:
        current_user.timezone = payload.timezone

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


class EmailVerificationRequest(BaseModel):
    email: EmailStr
    code: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


@router.post("/verify-signup-email", response_model=Token)
@limiter.limit("10/minute")
async def verify_signup_email(
    request: Request,
    response: Response,
    payload: EmailVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    """Verifies the email signup verification OTP and activates the account."""
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.email_verified:
        access_token = create_access_token(subject=user.id, role="user", password_hash=user.hashed_password)
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=settings.ENVIRONMENT.lower() == "production",
            samesite="lax",
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
        return {"access_token": access_token, "token_type": "bearer", "role": "user", "email": user.email}

    if not user.email_verification_secret:
        raise HTTPException(status_code=400, detail="Email verification has not been initiated for this account.")

    import pyotp
    totp = pyotp.TOTP(user.email_verification_secret)
    if not totp.verify(payload.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    user.email_verified = True
    user.email_verification_secret = None
    db.add(user)
    await db.commit()
    await db.refresh(user)

    try:
        from app.tasks.email_sender import send_system_email_task
        send_system_email_task.delay(
            recipient_email=user.email,
            subject="Welcome to our platform!",
            html_body=f"<h1>Welcome to SmartCampaign!</h1><p>Your marketing workspace is ready. You are on the Free tier with {user.quota_limit:,} monthly email sends included.</p>"
        )
    except Exception as e:
        print(f"Error queuing registration welcome email: {e}")

    access_token = create_access_token(subject=user.id, role="user", password_hash=user.hashed_password)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.ENVIRONMENT.lower() == "production",
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    return {"access_token": access_token, "token_type": "bearer", "role": "user", "email": user.email}


@router.post("/resend-verification-email")
@limiter.limit("5/minute")
async def resend_verification_email(
    request: Request,
    payload: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    """Regenerates and resends the signup email verification OTP."""
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.email_verified:
        return {"message": "Email is already verified."}

    import pyotp
    if not user.email_verification_secret:
        user.email_verification_secret = pyotp.random_base32()
        db.add(user)
        await db.commit()
        await db.refresh(user)

    totp = pyotp.TOTP(user.email_verification_secret)
    code = totp.now()

    try:
        from app.tasks.email_sender import send_system_email_task
        send_system_email_task.delay(
            recipient_email=user.email,
            subject="🔒 Verify Your Email Address",
            html_body=(
                f"<h1>Confirm Your Registration</h1>"
                f"<p>Your verification code is: <strong>{code}</strong></p>"
                f"<p>Please enter this code on the verification screen to activate your account.</p>"
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue email task: {str(e)}")

    return {"message": "Verification email dispatched successfully."}


@router.post("/logout")
async def logout_user(response: Response):
    """Logs out the user by deleting the HttpOnly access_token cookie."""
    response.delete_cookie(key="access_token", httponly=True, secure=settings.ENVIRONMENT.lower() == "production", samesite="lax")
    return {"message": "Logged out successfully."}
