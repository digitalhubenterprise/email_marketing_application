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
    EmailTemplate
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
    AdminDashboardStats
)
from app.core.security import get_password_hash, verify_password, create_access_token
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
    secret = "supersecretadmininvitekey2026"
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
    await db.commit()
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
    await db.commit()

    token = create_access_token(subject=admin.id)
    return {"access_token": token, "token_type": "bearer"}


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
    res = await db.execute(q.order_by(User.created_at.desc()).offset(offset).limit(limit))
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
    await db.commit()
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
    await db.commit()
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
    await db.commit()
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
    await db.commit()
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
    await db.commit()
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
    await db.commit()
    return {"message": f"SMTP quota expanded successfully for {user.email}."}


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
    """Creates a payment log transaction (supports bKash, Bank transfers)."""
    # Verify user
    res = await db.execute(select(User).where(User.email == pay_in.user_email))
    user = res.scalars().first()
    user_id = user.id if user else None

    new_payment = PaymentLog(
        user_id=user_id,
        user_email=pay_in.user_email,
        amount=pay_in.amount,
        currency=pay_in.currency,
        plan_tier=pay_in.plan_tier,
        gateway=pay_in.gateway,
        status="pending",
        notes=pay_in.notes
    )
    db.add(new_payment)
    await db.flush()
    await db.commit()
    await db.refresh(new_payment)

    await log_audit(
        db,
        admin_email=admin.email,
        action_type="create_payment_log",
        target_entity=str(new_payment.id),
        details=f"Recorded pending transaction. User: {pay_in.user_email}, Amount: {pay_in.amount} {pay_in.currency}."
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
    """
    res = await db.execute(select(PaymentLog).where(PaymentLog.id == payment_id))
    payment = res.scalars().first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found.")

    if payment.status == "paid":
        return {"message": "Transaction was already marked paid."}

    payment.status = "paid"

    # Dynamic quota allocation based on transaction requested plan_tier
    quota_limit = 1000
    if payment.plan_tier.lower() == "pro":
        quota_limit = 10000
    elif payment.plan_tier.lower() == "business":
        quota_limit = 50000
    elif payment.plan_tier.lower() == "enterprise":
        quota_limit = 100000

    # Locate user and update credentials
    user_res = await db.execute(select(User).where(User.email == payment.user_email))
    user = user_res.scalars().first()
    if user:
        user.subscription_tier = payment.plan_tier.lower()
        user.quota_limit = quota_limit
        user.is_active = True
        payment.user_id = user.id

    await log_audit(
        db,
        admin_email=admin.email,
        action_type="payment_marked_paid",
        target_entity=str(payment_id),
        details=f"Offline payment marked paid. Credited '{payment.plan_tier}' quota ({quota_limit} sends) to '{payment.user_email}'."
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
        user.quota_limit = 1000

    await log_audit(
        db,
        admin_email=admin.email,
        action_type="payment_refunded",
        target_entity=str(payment_id),
        details=f"Refund recorded. Downgraded user '{payment.user_email}' to free tiers."
    )
    await db.commit()

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
    """Updates branding config and throughput throttles."""
    res = await db.execute(select(SystemConfig).where(SystemConfig.id == 1))
    config = res.scalars().first()

    for field, val in config_in.model_dump(exclude_unset=True).items():
        setattr(config, field, val)

    await log_audit(
        db,
        admin_email=admin.email,
        action_type="update_settings",
        target_entity="system_configs",
        details="Platform settings updated."
    )
    await db.commit()
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
    await db.commit()

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
        "campaigns": [
            {
                "id": c.Campaign.id,
                "user_email": c.email,
                "name": c.Campaign.name,
                "subject": c.Campaign.subject,
                "status": c.Campaign.status,
                "total_recipients": c.Campaign.total_recipients,
                "sent_count": c.Campaign.sent_count,
                "open_count": c.Campaign.open_count,
                "click_count": c.Campaign.click_count,
                "created_at": c.Campaign.created_at
            } for c in campaigns
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
    except Exception:
        pass

    await log_audit(
        db,
        admin_email=admin.email,
        action_type="force_cancel_campaign",
        target_entity=str(campaign_id),
        details=f"Emergency halt triggered. Campaign '{campaign.name}' (ID: {campaign_id}) status shifted to failed."
    )
    await db.commit()

    return {"message": "Emergency force-cancel dispatched. Dispatch queue terminated."}


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
