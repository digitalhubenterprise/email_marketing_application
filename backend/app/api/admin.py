from datetime import datetime, date, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, update, delete

from app.db.session import get_db
from app.db.models import (
    User,
    AdminUser,
    AdminAuditLog,
    SystemConfig,
    PaymentLog,
    Campaign,
    CampaignLog,
    SMTPServer,
    ContactList,
    EmailTemplate,
    SubscriptionPlan
)
from app.schemas.user import Token
from app.schemas.admin import (
    AdminUserCreate,
    AdminUserResponse,
    AdminUserUpdate,
    SystemConfigResponse,
    SystemConfigUpdate,
    PaymentLogCreate,
    PaymentLogResponse,
    AdminAuditLogResponse,
    AdminDashboardStats,
    SubscriptionPlanCreate,
    SubscriptionPlanUpdate,
    SubscriptionPlanResponse
)
from app.core.config import settings
from app.core.security import get_password_hash, verify_password, create_access_token, encrypt_smtp_password
from app.api.admin_deps import get_current_admin
from app.tasks.email_sender import celery

router = APIRouter()

# ─── Audit Logger Helper ──────────────────────────────────────────────

async def log_audit(
    db: AsyncSession,
    admin_email: str,
    action_type: str,
    target_entity: Optional[str],
    details: Optional[str]
) -> None:
    """Appends a new immutable entry to the platform admin audit trail."""
    new_log = AdminAuditLog(
        admin_email=admin_email,
        action_type=action_type,
        target_entity=target_entity,
        details=details
    )
    db.add(new_log)
    await db.flush()


# ─── Admin Authentication & Invite Signup ─────────────────────────────

@router.post("/register", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
async def register_admin(
    admin_in: AdminUserCreate,
    invite_token: Optional[str] = Query(None),
    x_invite_token: Optional[str] = Header(None, alias="X-Admin-Registration-Secret"),
    db: AsyncSession = Depends(get_db)
):
    """
    Token-protected admin sign-up gateway.
    Requires 'invite_token' query parameter or 'X-Admin-Registration-Secret' header matching our secure key.
    """
    secret = settings.ADMIN_REGISTRATION_SECRET
    provided_token = invite_token or x_invite_token
    if provided_token != secret:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing admin invitation token."
        )

    # Check duplicate
    existing = await db.execute(select(AdminUser).where(AdminUser.email == admin_in.email))
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An administrator with this email address already exists."
        )

    new_admin = AdminUser(
        email=admin_in.email,
        hashed_password=get_password_hash(admin_in.password),
        role=admin_in.role,
        is_active=True
    )
    db.add(new_admin)
    await db.flush()
    await db.commit()  # commit transaction
    await db.refresh(new_admin)

    # Log audit event
    await log_audit(
        db,
        admin_email=new_admin.email,
        action_type="register_admin",
        target_entity=new_admin.email,
        details=f"New administrative profile registered with role: {new_admin.role}."
    )
    await db.commit()

    return new_admin


@router.post("/login", response_model=Token)
async def login_admin(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """Handles administrator secure login and issues bearer JWT tokens."""
    res = await db.execute(select(AdminUser).where(AdminUser.email == form_data.username))
    admin = res.scalars().first()

    if not admin or not verify_password(form_data.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect admin email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative profile is suspended."
        )

    # Log successful login
    await log_audit(
        db,
        admin_email=admin.email,
        action_type="login",
        target_entity=admin.email,
        details="Admin logged in successfully."
    )
    await db.commit()  # commit transaction

    token = create_access_token(subject=admin.id, role="admin")
    return {"access_token": token, "token_type": "bearer"}  # nosec


# ─── Dashboard Overview ───────────────────────────────────────────────

@router.get("/dashboard/stats", response_model=AdminDashboardStats)
async def get_admin_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """Aggregates system-wide financial, throughput, and activity feed metrics."""
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # 1. Total Registered Users
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    new_users_today = (await db.execute(select(func.count(User.id)).where(User.created_at >= today_start))).scalar() or 0

    # 2. Subscription breakdown
    active_subs = (await db.execute(select(func.count(User.id)).where(User.subscription_tier != "free", User.is_active == True))).scalar() or 0
    free_trials = (await db.execute(select(func.count(User.id)).where(User.subscription_tier == "free"))).scalar() or 0
    expired_subs = (await db.execute(select(func.count(User.id)).where(User.is_active == False))).scalar() or 0

    # 3. System-Wide Email Stats
    emails_sent_today = (await db.execute(select(func.count(CampaignLog.id)).where(CampaignLog.status == "sent", CampaignLog.updated_at >= today_start))).scalar() or 0
    emails_sent_month = (await db.execute(select(func.count(CampaignLog.id)).where(CampaignLog.status == "sent", CampaignLog.updated_at >= month_start))).scalar() or 0
    emails_sent_all_time = (await db.execute(select(func.sum(Campaign.sent_count)))).scalar() or 0

    # 4. Monthly Revenues (BDT + USD separately)
    usd_rev = (await db.execute(
        select(func.sum(PaymentLog.amount))
        .where(PaymentLog.status == "paid", PaymentLog.currency == "USD", PaymentLog.created_at >= month_start)
    )).scalar() or 0

    bdt_rev = (await db.execute(
        select(func.sum(PaymentLog.amount))
        .where(PaymentLog.status == "paid", PaymentLog.currency == "BDT", PaymentLog.created_at >= month_start)
    )).scalar() or 0

    # 5. Recent 20 activities
    activity_res = await db.execute(
        select(AdminAuditLog)
        .order_by(AdminAuditLog.created_at.desc())
        .limit(20)
    )
    activities = activity_res.scalars().all()

    return {
        "total_users": total_users,
        "new_users_today": new_users_today,
        "active_subscriptions": active_subs,
        "free_trials": free_trials,
        "expired_subscriptions": expired_subs,
        "emails_sent_today": emails_sent_today,
        "emails_sent_month": emails_sent_month,
        "emails_sent_all_time": emails_sent_all_time,
        "revenue_usd_month": usd_rev,
        "revenue_bdt_month": bdt_rev,
        "recent_activities": activities
    }


# ─── CRM User Management Cockpit ──────────────────────────────────────

@router.get("/users")
async def get_users_list(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    tier: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sort_date: Optional[str] = Query("desc"),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """Fetches paginated user accounts with search and filtering features."""
    offset = (page - 1) * limit
    q = select(User)

    if search:
        q = q.where(User.email.ilike(f"%{search}%"))
    if tier:
        q = q.where(User.subscription_tier == tier.lower())
    if status:
        is_act = status.lower() == "active"
        q = q.where(User.is_active == is_act)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    order_clause = User.created_at.desc() if sort_date == "desc" else User.created_at.asc()
    res = await db.execute(q.order_by(order_clause).offset(offset).limit(limit))
    users = res.scalars().all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "is_active": u.is_active,
                "subscription_tier": u.subscription_tier,
                "quota_limit": u.quota_limit,
                "quota_sent": u.quota_sent,
                "created_at": u.created_at
            } for u in users
        ]
    }


@router.get("/users/{user_id}")
async def get_user_details(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """Fetches deep profile configurations, SMTP setups, and limits for a user."""
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    # Gather additional stats
    smtp_count = (await db.execute(select(func.count(SMTPServer.id)).where(SMTPServer.user_id == user_id))).scalar() or 0
    contacts_count = (await db.execute(
        select(func.count(ContactList.id))
        .where(ContactList.user_id == user_id)
    )).scalar() or 0
    campaigns_count = (await db.execute(select(func.count(Campaign.id)).where(Campaign.user_id == user_id))).scalar() or 0

    # Get payments list
    payment_res = await db.execute(
        select(PaymentLog)
        .where(PaymentLog.user_id == user_id)
        .order_by(PaymentLog.created_at.desc())
    )
    payments = payment_res.scalars().all()

    # Get campaigns list
    campaigns_res = await db.execute(
        select(Campaign)
        .where(Campaign.user_id == user_id)
        .order_by(Campaign.created_at.desc())
        .limit(10)
    )
    campaigns = campaigns_res.scalars().all()

    return {
        "id": user.id,
        "email": user.email,
        "is_active": user.is_active,
        "subscription_tier": user.subscription_tier,
        "quota_limit": user.quota_limit,
        "quota_sent": user.quota_sent,
        "created_at": user.created_at,
        "stats": {
            "smtp_count": smtp_count,
            "lists_count": contacts_count,
            "campaigns_count": campaigns_count
        },
        "payments": [
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
        ],
        "campaigns": [
            {
                "id": c.id,
                "name": c.name,
                "subject": c.subject,
                "status": c.status,
                "total_recipients": c.total_recipients,
                "sent_count": c.sent_count,
                "created_at": c.created_at
            } for c in campaigns
        ]
    }


@router.post("/users/{user_id}/activate")
async def bypass_email_verification(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """Force-activates user account bypassing email verification checks."""
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    user.is_active = True
    await log_audit(
        db,
        admin_email=admin.email,
        action_type="bypass_verification",
        target_entity=user.email,
        details="User account force-activated manually bypassing verification."
    )
    await db.commit()  # commit transaction
    return {"message": f"User {user.email} successfully activated."}


@router.post("/users/{user_id}/suspend")
async def suspend_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """Suspends customer log-in credentials."""
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    user.is_active = False
    await log_audit(
        db,
        admin_email=admin.email,
        action_type="suspend_user",
        target_entity=user.email,
        details="User account suspended."
    )
    await db.commit()  # commit transaction
    return {"message": f"User {user.email} successfully suspended."}


@router.post("/users/{user_id}/unsuspend")
async def unsuspend_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """Lifts block on suspended customer log-in credentials."""
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    user.is_active = True
    await log_audit(
        db,
        admin_email=admin.email,
        action_type="unsuspend_user",
        target_entity=user.email,
        details="User account suspension lifted."
    )
    await db.commit()  # commit transaction
    return {"message": f"User {user.email} successfully unsuspended."}


@router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """GDPR Hard Delete. Purges user profile and all lists, smtp, campaigns, logs from the system."""
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    user_email = user.email

    # SQLAlchemy model delete handles relationships marked with cascade="all, delete-orphan"
    await db.delete(user)
    await log_audit(
        db,
        admin_email=admin.email,
        action_type="delete_user_hard",
        target_entity=user_email,
        details=f"GDPR Hard-Delete completed. Purged all SMTP configs, contacts, campaigns, and logs."
    )
    await db.commit()  # commit transaction
    return {"message": f"User {user_email} and all nested databases deleted completely."}


@router.post("/users/{user_id}/plan")
async def override_user_plan(
    user_id: int,
    tier: str = Query(...),
    quota_limit: int = Query(...),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """Manually overrides client subscription tier and quotas limit."""
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    old_tier = user.subscription_tier
    old_quota = user.quota_limit

    user.subscription_tier = tier.lower()
    user.quota_limit = quota_limit
    user.is_active = True

    await log_audit(
        db,
        admin_email=admin.email,
        action_type="plan_override",
        target_entity=user.email,
        details=f"Tier overridden from {old_tier} ({old_quota}) to {tier} ({quota_limit})."
    )
    await db.commit()  # commit transaction
    return {"message": f"Successfully updated subscription parameters for {user.email}."}


@router.post("/users/{user_id}/extend")
async def extend_user_quota(
    user_id: int,
    quota_add: int = Query(...),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """Extends user's current sending quota limits."""
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.quota_limit += quota_add
    await log_audit(
        db,
        admin_email=admin.email,
        action_type="extend_quota",
        target_entity=user.email,
        details=f"Extended SMTP quota limits by adding +{quota_add} emails capacity."
    )
    await db.commit()  # commit transaction
    return {"message": f"SMTP quota expanded successfully for {user.email}."}


@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """Resets the password on behalf of the user, generating a secure random temporary password."""
    import secrets
    import string
    
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")
        
    alphabet = string.ascii_letters + string.digits
    temp_pass = ''.join(secrets.choice(alphabet) for i in range(12))
    
    user.hashed_password = get_password_hash(temp_pass)
    
    await log_audit(
        db,
        admin_email=admin.email,
        action_type="reset_user_password",
        target_entity=user.email,
        details=f"Admin reset password for user {user.email}. Temporary password generated."
    )
    await db.commit()  # commit transaction
    
    # Queue system Password Reset Email task
    try:
        from app.tasks.email_sender import send_system_email_task
        send_system_email_task.delay(
            recipient_email=user.email,
            subject="Your Account Password Has Been Reset",
            html_body=f"<h1>Password Reset Notification</h1><p>Your password has been reset by an administrator.</p><p>Your temporary password is: <strong>{temp_pass}</strong></p><p>Please log in and update your password immediately for security reasons.</p>"
        )
    except Exception as e:
        print(f"Error queuing password reset notification: {e}")

    return {
        "success": True,
        "email": user.email,
        "temp_password": temp_pass,
        "message": f"Password reset successfully for {user.email}."
    }


@router.post("/users/{user_id}/impersonate")
async def impersonate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """Generates a secure user JWT access token on behalf of the customer for administrative debugging."""
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")
        
    # Generate customer access token
    access_token = create_access_token(subject=user.id)
    
    await log_audit(
        db,
        admin_email=admin.email,
        action_type="impersonate_user",
        target_entity=user.email,
        details=f"Admin impersonated user {user.email} for support and debug diagnostics."
    )
    await db.commit()  # commit transaction
    
    return {
        "access_token": access_token,
        "token_type": "bearer",  # nosec
        "email": user.email
    }


# ─── Subscription & Billing Cash Desk ───────────────────────────────

@router.get("/payments", response_model=List[PaymentLogResponse])
async def get_payments_list(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    gateway: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """Fetches paginated billing transactions ledgers."""
    offset = (page - 1) * limit
    q = select(PaymentLog)

    if gateway:
        q = q.where(PaymentLog.gateway == gateway)
    if status:
        q = q.where(PaymentLog.status == status.lower())

    res = await db.execute(q.order_by(PaymentLog.created_at.desc()).offset(offset).limit(limit))
    return res.scalars().all()


@router.post("/payments", response_model=PaymentLogResponse)
async def create_payment_entry(
    pay_in: PaymentLogCreate,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """Creates a payment log transaction with support for Add Fund, Rebate, and Overdrive actions."""
    # Verify user
    res = await db.execute(select(User).where(User.email == pay_in.user_email))
    user = res.scalars().first()
    user_id = user.id if user else None

    # Determine status and notes
    status_val = pay_in.status.lower() if pay_in.status else "pending"
    action_type = pay_in.action_type.lower() if pay_in.action_type else "add_fund"
    
    # Store dynamic details in notes
    notes_val = f"[{action_type.upper()}] {pay_in.notes or ''}".strip()

    amount_val = pay_in.amount
    if action_type == "rebate":
        amount_val = -abs(amount_val)

    new_payment = PaymentLog(
        user_id=user_id,
        user_email=pay_in.user_email,
        amount=amount_val,
        currency=pay_in.currency,
        plan_tier=pay_in.plan_tier,
        gateway=pay_in.gateway,
        status=status_val,
        notes=notes_val
    )
    db.add(new_payment)
    await db.flush()

    # If transaction is PAID and user exists, apply the changes immediately!
    if status_val == "paid" and user:
        if action_type == "add_fund":
            # Dynamic quota allocation based on plan_tier
            plan_tier_lower = pay_in.plan_tier.lower()
            plan_res = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.tier == plan_tier_lower))
            plan = plan_res.scalars().first()
            
            quota_limit = 5000
            if plan:
                quota_limit = plan.quota
            else:
                if plan_tier_lower == "pro":
                    quota_limit = 50000
                elif plan_tier_lower == "business":
                    quota_limit = 200000
                elif plan_tier_lower == "enterprise":
                    quota_limit = 999999999
            
            user.subscription_tier = plan_tier_lower
            user.quota_limit = quota_limit
            user.is_active = True
            
        elif action_type == "overdrive":
            # Direct quota limit override using the amount field!
            user.subscription_tier = pay_in.plan_tier.lower()
            user.quota_limit = pay_in.amount
            user.is_active = True
            
        elif action_type == "rebate":
            # Rebate option - keep tier but adjust or reset if needed, or simply log it.
            pass

    await db.refresh(new_payment)

    await log_audit(
        db,
        admin_email=admin.email,
        action_type=f"payment_{action_type}",
        target_entity=str(new_payment.id),
        details=f"Recorded {action_type} transaction. Status: {status_val}, User: {pay_in.user_email}, Amount: {pay_in.amount} {pay_in.currency}."
    )
    await db.commit()

    return new_payment


@router.post("/payments/{payment_id}/mark-paid")
async def mark_payment_paid(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """
    Offline payment verification handler.
    Validates physical bKash/Bank Transfer transactions and updates quota/tier immediately.
    Supports Add Fund, Rebate, and Overdrive actions.
    """
    res = await db.execute(select(PaymentLog).where(PaymentLog.id == payment_id))
    payment = res.scalars().first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found.")

    if payment.status == "paid":
        return {"message": "Transaction was already marked paid."}

    payment.status = "paid"

    # Detect action type from notes
    action_type = "add_fund"
    if payment.notes:
        if payment.notes.startswith("[OVERDRIVE]"):
            action_type = "overdrive"
        elif payment.notes.startswith("[REBATE]"):
            action_type = "rebate"
        elif payment.notes.startswith("[ADD_FUND]"):
            action_type = "add_fund"

    # Locate user and update credentials
    user_res = await db.execute(select(User).where(User.email == payment.user_email))
    user = user_res.scalars().first()
    
    quota_limit = 5000
    if user:
        payment.user_id = user.id
        if action_type == "add_fund":
            plan_tier_lower = payment.plan_tier.lower()
            plan_res = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.tier == plan_tier_lower))
            plan = plan_res.scalars().first()
            
            quota_limit = 5000
            if plan:
                quota_limit = plan.quota
            else:
                if plan_tier_lower == "pro":
                    quota_limit = 50000
                elif plan_tier_lower == "business":
                    quota_limit = 200000
                elif plan_tier_lower == "enterprise":
                    quota_limit = 999999999
            
            user.subscription_tier = plan_tier_lower
            user.quota_limit = quota_limit
            user.is_active = True
            
        elif action_type == "overdrive":
            # Direct quota override using the payment amount
            user.subscription_tier = payment.plan_tier.lower()
            user.quota_limit = payment.amount
            user.is_active = True
            quota_limit = payment.amount
            
        elif action_type == "rebate":
            # Rebate option - keeps current tier/quota
            pass

    await log_audit(
        db,
        admin_email=admin.email,
        action_type=f"payment_marked_paid_{action_type}",
        target_entity=str(payment_id),
        details=f"Offline payment marked paid ({action_type}). User: '{payment.user_email}', Quota limit set to: {user.quota_limit if user else 'N/A'}."
    )
    await db.commit()

    return {"message": f"Transaction {payment_id} successfully verified. Quotas adjusted."}


@router.post("/payments/{payment_id}/refund")
async def mark_payment_refunded(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """Bypasses automated payment gateways to log offline refund and resets client quotas."""
    res = await db.execute(select(PaymentLog).where(PaymentLog.id == payment_id))
    payment = res.scalars().first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found.")

    payment.status = "refunded"

    # Downgrade user back to free plan
    user_res = await db.execute(select(User).where(User.email == payment.user_email))
    user = user_res.scalars().first()
    if user:
        user.subscription_tier = "free"
        user.quota_limit = 5000

    await log_audit(
        db,
        admin_email=admin.email,
        action_type="payment_refunded",
        target_entity=str(payment_id),
        details=f"Refund recorded. Downgraded user '{payment.user_email}' to free tiers."
    )
    await db.commit()  # commit transaction

    return {"message": f"Payment {payment_id} successfully refunded and user limits downgraded."}


# ─── System Parameters & Maintenance Settings ───────────────────────────

@router.get("/settings", response_model=SystemConfigResponse)
async def get_system_settings(
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """Fetches core platform branding and security settings."""
    res = await db.execute(select(SystemConfig).where(SystemConfig.id == 1))
    return res.scalars().first()


@router.put("/settings", response_model=SystemConfigResponse)
async def update_system_settings(
    config_in: SystemConfigUpdate,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """Updates branding config and throughput throttles. Encrypts system SMTP password if provided."""
    res = await db.execute(select(SystemConfig).where(SystemConfig.id == 1))
    config = res.scalars().first()

    update_data = config_in.model_dump(exclude_unset=True)

    # Intercept plaintext SMTP password — encrypt before storing
    if "system_smtp_password" in update_data:
        raw_password = update_data.pop("system_smtp_password")
        if raw_password:  # Only encrypt and update if non-empty
            update_data["system_smtp_encrypted_password"] = encrypt_smtp_password(raw_password)

    for field, val in update_data.items():
        setattr(config, field, val)

    await log_audit(
        db,
        admin_email=admin.email,
        action_type="update_settings",
        target_entity="system_configs",
        details="Platform settings updated."
    )
    await db.commit()  # commit transaction
    await db.refresh(config)
    return config


@router.post("/settings/maintenance")
async def toggle_maintenance_mode(
    enabled: bool = Query(...),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """Toggles platform Maintenance Mode state."""
    res = await db.execute(select(SystemConfig).where(SystemConfig.id == 1))
    config = res.scalars().first()

    config.maintenance_mode = enabled
    state = "ENABLED" if enabled else "DISABLED"

    await log_audit(
        db,
        admin_email=admin.email,
        action_type="toggle_maintenance",
        target_entity="maintenance_mode",
        details=f"Global maintenance mode {state} by administrator."
    )
    await db.commit()  # commit transaction

    return {"message": f"Global maintenance mode has been {state}."}


# ─── Queue Monitor & Emergency Campaign Killer ─────────────────────────

@router.get("/campaigns")
async def get_system_campaigns(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """Cross-user read-only panel to review platform dispatches activities."""
    offset = (page - 1) * limit
    total = (await db.execute(select(func.count(Campaign.id)))).scalar() or 0

    # Query queue counts
    queued = (await db.execute(select(func.count(Campaign.id)).where(Campaign.status == "scheduled"))).scalar() or 0
    processing = (await db.execute(select(func.count(Campaign.id)).where(Campaign.status == "sending"))).scalar() or 0
    done = (await db.execute(select(func.count(Campaign.id)).where(Campaign.status.in_(["sent", "failed"])))).scalar() or 0

    res = await db.execute(
        select(Campaign, User.email)
        .join(User, Campaign.user_id == User.id)
        .order_by(Campaign.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    campaigns = res.all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "queue_status": {
            "queued": queued,
            "processing": processing,
            "done": done
        },
        "campaigns": [
            {
                "id": campaign.id,
                "user_email": email,
                "name": campaign.name,
                "subject": campaign.subject,
                "status": campaign.status,
                "total_recipients": campaign.total_recipients,
                "sent_count": campaign.sent_count,
                "open_count": campaign.open_count,
                "click_count": campaign.click_count,
                "is_spam": campaign.is_spam,
                "spam_note": campaign.spam_note,
                "created_at": campaign.created_at
            } for campaign, email in campaigns
        ]
    }


@router.post("/campaigns/{campaign_id}/cancel")
async def force_cancel_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """
    🔴 Emergency Force-Cancel Campaign.
    Updates the database campaign status to 'failed', triggering the internal loops block to stop instant dispatch.
    """
    res = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = res.scalars().first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")

    if campaign.status not in ("sending", "scheduled"):
        raise HTTPException(
            status_code=400,
            detail=f"Only active/scheduled campaigns can be force-canceled. Current status: {campaign.status}"
        )

    # Shift status in DB to fail the loop
    campaign.status = "failed"

    # Revoke active tasks from celery workers pool if possible
    try:
        celery.control.purge()
    except Exception as e:
        import logging
        logging.getLogger("app.api.admin").warning("Failed to purge celery control queue: %s", e)

    await log_audit(
        db,
        admin_email=admin.email,
        action_type="force_cancel_campaign",
        target_entity=str(campaign_id),
        details=f"Emergency halt triggered. Campaign '{campaign.name}' (ID: {campaign_id}) status shifted to failed."
    )
    await db.commit()  # commit transaction

    return {"message": "Emergency force-cancel dispatched. Dispatch queue terminated."}


@router.post("/campaigns/{campaign_id}/spam")
async def flag_campaign_spam(
    campaign_id: int,
    note: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """
    Flag campaign as spam, add abuse handling note, change status to failed, and trigger Celery task purging.
    """
    res = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = res.scalars().first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")

    campaign.is_spam = True
    campaign.spam_note = note
    campaign.status = "failed"  # Emergency stop sending

    # Revoke Celery tasks
    try:
        celery.control.purge()
    except Exception as e:
        import logging
        logging.getLogger("app.api.admin").warning("Failed to purge celery tasks on spam flag: %s", e)

    await log_audit(
        db,
        admin_email=admin.email,
        action_type="flag_campaign_spam",
        target_entity=str(campaign_id),
        details=f"Campaign '{campaign.name}' (ID: {campaign_id}) flagged as SPAM. Note: {note}"
    )
    await db.commit()  # commit transaction

    return {"message": "Campaign flagged as spam and emergency stopped."}


# ─── Immutable Audit Logs grid ────────────────────────────────────────

@router.get("/audits", response_model=List[AdminAuditLogResponse])
async def get_audit_trail_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin_email: Optional[str] = Query(None),
    action_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """Read-only view into administrative history audits."""
    offset = (page - 1) * limit
    q = select(AdminAuditLog)

    if admin_email:
        q = q.where(AdminAuditLog.admin_email.ilike(f"%{admin_email}%"))
    if action_type:
        q = q.where(AdminAuditLog.action_type == action_type)

    res = await db.execute(q.order_by(AdminAuditLog.created_at.desc()).offset(offset).limit(limit))
    return res.scalars().all()


@router.get("/user-logs")
async def get_user_campaign_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """Fetches paginated system-wide campaign logs (User activity dispatches)."""
    offset = (page - 1) * limit
    total = (await db.execute(select(func.count(CampaignLog.id)))).scalar() or 0

    res = await db.execute(
        select(CampaignLog, Campaign.name, User.email)
        .join(Campaign, CampaignLog.campaign_id == Campaign.id)
        .join(User, Campaign.user_id == User.id)
        .order_by(CampaignLog.updated_at.desc())
        .offset(offset)
        .limit(limit)
    )
    logs = res.all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "logs": [
            {
                "id": log.CampaignLog.id,
                "campaign_name": log.name,
                "user_email": log.email,
                "email": log.CampaignLog.email,
                "status": log.CampaignLog.status,
                "opened": log.CampaignLog.opened,
                "clicked": log.CampaignLog.clicked,
                "error_message": log.CampaignLog.error_message,
                "updated_at": log.CampaignLog.updated_at
            } for log in logs
        ]
    }


# ─── System SMTP Diagnostics Handshake ─────────────────────────────────

@router.post("/settings/smtp/test")
async def test_system_smtp(
    recipient_email: str = Query(..., min_length=5),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """
    Triggers a real-time synchronous SMTP diagnostic connection and sends a test email.
    """
    from app.core.security import decrypt_smtp_password
    import aiosmtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    res = await db.execute(select(SystemConfig).where(SystemConfig.id == 1))
    config = res.scalars().first()
    if not config:
        raise HTTPException(status_code=404, detail="System configuration not found.")

    if not config.system_smtp_host:
        raise HTTPException(
            status_code=400,
            detail="System SMTP host is not configured. Please configure credentials first."
        )

    logs = []
    logs.append(f"[{datetime.now(timezone.utc).isoformat()}] SMTP Diagnostic sequence initialized.")
    logs.append(f"Target host: {config.system_smtp_host}:{config.system_smtp_port} (Security: {config.system_smtp_security})")
    logs.append(f"Authentication User: {config.system_smtp_username or 'None'}")
    logs.append(f"Sending test email to: {recipient_email}")

    # Decrypt password
    plain_password = ""  # nosec
    if config.system_smtp_encrypted_password:
        try:
            plain_password = decrypt_smtp_password(config.system_smtp_encrypted_password)
            logs.append("SMTP password decrypted successfully.")
        except Exception as e:
            logs.append(f"Error decrypting SMTP password: {str(e)}")
            return {"success": False, "logs": logs, "error": f"Decryption error: {str(e)}"}
    else:
        logs.append("No saved SMTP password detected.")

    use_tls = config.system_smtp_security.upper() == "SSL"
    start_tls = config.system_smtp_security.upper() == "TLS"

    smtp_client = aiosmtplib.SMTP(
        hostname=config.system_smtp_host,
        port=config.system_smtp_port,
        use_tls=use_tls,
        timeout=15,
    )

    try:
        logs.append("Attempting TCP connection to SMTP host...")
        await smtp_client.connect()
        logs.append("TCP connection established successfully.")

        if start_tls:
            logs.append("Performing STARTTLS cryptographic handshake...")
            await smtp_client.starttls()
            logs.append("STARTTLS handshake completed successfully.")

        if config.system_smtp_username and plain_password:
            logs.append(f"Authenticating as user: {config.system_smtp_username}...")
            await smtp_client.login(config.system_smtp_username, plain_password)
            logs.append("SMTP authentication successful.")

        logs.append("Formulating RFC 822 MIME message container...")
        msg = MIMEMultipart()
        msg["From"] = f"{config.system_smtp_from_name or 'SaaS Admin'} <{config.system_smtp_from_email or config.system_smtp_username}>"
        msg["To"] = recipient_email
        msg["Subject"] = "System SMTP Diagnostics Handshake Verification"

        text_part = MIMEText(
            f"Hello,\n\nThis is an automated system email sent to verify the connection credentials of your SaaS platform.\n\n"
            f"Diagnostic Parameters:\n"
            f"- Host: {config.system_smtp_host}\n"
            f"- Port: {config.system_smtp_port}\n"
            f"- Security: {config.system_smtp_security}\n"
            f"- Handshake Date: {datetime.now(timezone.utc).isoformat()}\n\n"
            f"If you received this message, your system SMTP credentials are valid and live!\n",
            "plain",
            "utf-8"
        )
        msg.attach(text_part)

        logs.append("Dispatching MIME message stream...")
        await smtp_client.send_message(msg)
        logs.append("MIME stream successfully transferred. Message accepted.")

        await smtp_client.quit()
        logs.append("Diagnostic sequence completed successfully. SMTP connection closed cleanly.")

        await log_audit(
            db,
            admin_email=admin.email,
            action_type="smtp_diagnostic_success",
            target_entity=recipient_email,
            details="System SMTP test passed successfully. Delivered test email."
        )
        await db.commit()  # commit transaction

        return {"success": True, "logs": logs}

    except Exception as e:
        error_msg = str(e)
        logs.append(f"❌ DIAGNOSTIC CRITICAL FAILURE: {error_msg}")
        
        await log_audit(
            db,
            admin_email=admin.email,
            action_type="smtp_diagnostic_failure",
            target_entity=recipient_email,
            details=f"System SMTP test failed. Error: {error_msg[:120]}"
        )
        await db.commit()  # commit transaction

        try:
            await smtp_client.quit()
        except Exception as e:
            import logging
            logging.getLogger("app.api.admin").debug("SMTP client connection close error: %s", e)

        return {"success": False, "logs": logs, "error": error_msg}


# ─── Queue & Cluster Diagnostics Dashboard Card ───────────────────────────

@router.get("/dashboard/diagnostics")
async def get_system_diagnostics(
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """
    Fetches real-time diagnostics: Celery cluster state, Redis memory and ping, and system-wide process details.
    """
    import sys
    import os
    import platform
    import redis
    import time

    diagnostics = {
        "celery": {
            "status": "offline",
            "workers": [],
            "registered_tasks_count": 0,
            "error": None
        },
        "redis": {
            "status": "offline",
            "ping_latency_ms": 0,
            "dbsize": 0,
            "error": None
        },
        "system": {
            "python_version": sys.version.split()[0],
            "os": f"{platform.system()} {platform.release()}",
            "process_id": os.getpid(),
        }
    }

    try:
        inspector = celery.control.inspect()
        ping_res = inspector.ping()
        if ping_res:
            diagnostics["celery"]["status"] = "online"
            diagnostics["celery"]["workers"] = list(ping_res.keys())
            reg = inspector.registered()
            if reg:
                all_tasks = set()
                for w, tasks in reg.items():
                    all_tasks.update(tasks)
                diagnostics["celery"]["registered_tasks_count"] = len(all_tasks)
        else:
            diagnostics["celery"]["error"] = "No active Celery worker nodes detected."
    except Exception as e:
        diagnostics["celery"]["error"] = f"Failed to connect to Celery control: {str(e)}"

    try:
        r_client = redis.Redis.from_url(settings.REDIS_URL, socket_timeout=3)
        start_time = time.time()
        redis_online = r_client.ping()
        latency = (time.time() - start_time) * 1000
        
        if redis_online:
            diagnostics["redis"]["status"] = "online"
            diagnostics["redis"]["ping_latency_ms"] = round(latency, 2)
            try:
                diagnostics["redis"]["dbsize"] = r_client.dbsize()
            except Exception as e:
                import logging
                logging.getLogger("app.api.admin").warning("Failed to query Redis dbsize: %s", e)
        else:
            diagnostics["redis"]["error"] = "Redis server ping failed."
    except Exception as e:
        diagnostics["redis"]["error"] = f"Failed to connect to Redis broker: {str(e)}"

    return diagnostics


# ─── Compliance Audit Streamer Exporter ───────────────────────────────

@router.get("/audits/export")
async def export_audit_logs(
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """
    Generates and streams a CSV containing the complete immutable system audit trail.
    """
    from fastapi.responses import StreamingResponse
    import csv
    import io

    res = await db.execute(select(AdminAuditLog).order_by(AdminAuditLog.created_at.desc()))
    logs = res.scalars().all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Admin Email", "Action Type", "Target Entity", "Details", "Timestamp"])
    
    for log in logs:
        writer.writerow([
            log.id,
            log.admin_email,
            log.action_type,
            log.target_entity or "",
            log.details or "",
            log.created_at.isoformat()
        ])
    
    response = StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv"
    )
    response.headers["Content-Disposition"] = "attachment; filename=system_audit_logs.csv"
    return response


# ─── Subscription Plans Admin CRUD ─────────────────────────────────────

@router.get("/plans", response_model=List[SubscriptionPlanResponse])
async def list_admin_plans(
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """Admin-only endpoint to list all subscription plans."""
    res = await db.execute(select(SubscriptionPlan).order_by(SubscriptionPlan.price.asc()))
    plans = res.scalars().all()
    result = []
    for p in plans:
        result.append(
            SubscriptionPlanResponse(
                id=p.id,
                tier=p.tier,
                name=p.name,
                price=p.price,
                quota=p.quota,
                smtp_limit=p.smtp_limit,
                validity=p.validity,
                throttle=p.throttle,
                features=p.features.split("\n") if p.features else [],
                created_at=p.created_at
            )
        )
    return result


@router.post("/plans", response_model=SubscriptionPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_subscription_plan(
    plan_in: SubscriptionPlanCreate,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """Admin-only endpoint to define a new pricing subscription plan."""
    tier_clean = plan_in.tier.strip().lower()
    res = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.tier == tier_clean))
    if res.scalars().first():
        raise HTTPException(
            status_code=400,
            detail=f"Subscription plan with tier code '{tier_clean}' already exists."
        )

    new_plan = SubscriptionPlan(
        tier=tier_clean,
        name=plan_in.name.strip(),
        price=plan_in.price,
        quota=plan_in.quota,
        smtp_limit=plan_in.smtp_limit,
        validity=plan_in.validity,
        throttle=plan_in.throttle,
        features="\n".join(plan_in.features)
    )
    db.add(new_plan)
    await db.commit()
    await db.refresh(new_plan)

    return SubscriptionPlanResponse(
        id=new_plan.id,
        tier=new_plan.tier,
        name=new_plan.name,
        price=new_plan.price,
        quota=new_plan.quota,
        smtp_limit=new_plan.smtp_limit,
        validity=new_plan.validity,
        throttle=new_plan.throttle,
        features=new_plan.features.split("\n") if new_plan.features else [],
        created_at=new_plan.created_at
    )


@router.put("/plans/{tier}", response_model=SubscriptionPlanResponse)
async def update_subscription_plan(
    tier: str,
    plan_in: SubscriptionPlanUpdate,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """Admin-only endpoint to update plan parameters by tier code."""
    res = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.tier == tier.lower()))
    plan = res.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Subscription plan not found.")

    if plan_in.name is not None:
        plan.name = plan_in.name.strip()
    if plan_in.price is not None:
        plan.price = plan_in.price
    if plan_in.quota is not None:
        plan.quota = plan_in.quota
    if plan_in.smtp_limit is not None:
        plan.smtp_limit = plan_in.smtp_limit
    if plan_in.validity is not None:
        plan.validity = plan_in.validity
    if plan_in.throttle is not None:
        plan.throttle = plan_in.throttle
    if plan_in.features is not None:
        plan.features = "\n".join(plan_in.features)

    db.add(plan)
    await db.commit()
    await db.refresh(plan)

    return SubscriptionPlanResponse(
        id=plan.id,
        tier=plan.tier,
        name=plan.name,
        price=plan.price,
        quota=plan.quota,
        smtp_limit=plan.smtp_limit,
        validity=plan.validity,
        throttle=plan.throttle,
        features=plan.features.split("\n") if plan.features else [],
        created_at=plan.created_at
    )


@router.delete("/plans/{tier}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subscription_plan(
    tier: str,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """Admin-only endpoint to delete subscription plan catalog."""
    res = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.tier == tier.lower()))
    plan = res.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Subscription plan not found.")

    await db.delete(plan)
    await db.commit()

