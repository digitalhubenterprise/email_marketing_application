import pytest
from app.db.models import User, PaymentLog, SubscriptionPlan
from sqlalchemy import select

pytestmark = pytest.mark.anyio

async def test_auth_registration_and_login(client, db_session):
    # 1. Register User
    reg_payload = {
        "email": "user@example.com",
        "password": "Password123#"
    }
    response = await client.post("/api/auth/register", json=reg_payload)
    assert response.status_code == 201
    res_data = response.json()
    assert res_data["email"] == "user@example.com"
    assert res_data["subscription_tier"] == "trial"

    # 2. Register Duplicate
    response_dup = await client.post("/api/auth/register", json=reg_payload)
    assert response_dup.status_code == 409
    assert "exists" in response_dup.json()["detail"]

    # 3. Register Weak Password
    response_weak = await client.post("/api/auth/register", json={
        "email": "weak@example.com",
        "password": "123"
    })
    assert response_weak.status_code == 422

    # 4. Login User
    login_payload = {
        "username": "user@example.com",
        "password": "Password123#"
    }
    response_login = await client.post(
        "/api/auth/login",
        data=login_payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response_login.status_code == 200
    token_data = response_login.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    token = token_data["access_token"]

    # 5. Fetch Me
    auth_headers = {"Authorization": f"Bearer {token}"}
    response_me = await client.get("/api/auth/me", headers=auth_headers)
    assert response_me.status_code == 200
    me_data = response_me.json()
    assert me_data["email"] == "user@example.com"

    # 6. Change Password
    change_payload = {
        "current_password": "Password123#",
        "new_password": "NewSecurePassword456#"
    }
    response_change = await client.post("/api/auth/change-password", json=change_payload, headers=auth_headers)
    assert response_change.status_code == 200
    assert response_change.json()["message"] == "Password updated successfully."

    # 7. Login with old password (should fail)
    response_login_old = await client.post(
        "/api/auth/login",
        data={"username": "user@example.com", "password": "Password123#"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response_login_old.status_code == 401

    # 8. Login with new password (should succeed)
    response_login_new = await client.post(
        "/api/auth/login",
        data={"username": "user@example.com", "password": "NewSecurePassword456#"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response_login_new.status_code == 200
    new_token = response_login_new.json()["access_token"]
    new_headers = {"Authorization": f"Bearer {new_token}"}

    # 9. Upgrade plan to Pro (Simulated Billing)
    response_upgrade = await client.post(
        "/api/auth/upgrade",
        json={"tier": "pro"},
        headers=new_headers
    )
    assert response_upgrade.status_code == 200
    up_data = response_upgrade.json()
    assert up_data["subscription_tier"] == "pro"
    assert up_data["quota_limit"] == 50000

    # 10. Verify PaymentLog entry created
    res = await db_session.execute(select(PaymentLog).where(PaymentLog.user_email == "user@example.com"))
    payment = res.scalars().first()
    assert payment is not None
    assert payment.plan_tier == "pro"
    assert payment.amount == 11.99
    assert payment.gateway == "Stripe"
    assert payment.status == "paid"


async def test_subscription_expiration_and_yearly_billing(client, db_session):
    # Register user
    reg_payload = {"email": "subscriber@example.com", "password": "Password123#"}
    await client.post("/api/auth/register", json=reg_payload)

    # Login
    response_login = await client.post(
        "/api/auth/login",
        data={"username": "subscriber@example.com", "password": "Password123#"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    token = response_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Upgrade to Yearly Pro
    response_upgrade_yearly = await client.post(
        "/api/auth/upgrade",
        json={"tier": "pro", "billing_cycle": "yearly"},
        headers=headers
    )
    assert response_upgrade_yearly.status_code == 200
    yearly_data = response_upgrade_yearly.json()
    assert yearly_data["subscription_tier"] == "pro"
    assert yearly_data["subscription_expires_at"] is not None
    
    # Check expiry is ~365 days
    from datetime import datetime, timezone
    expiry_dt = datetime.fromisoformat(yearly_data["subscription_expires_at"].replace("Z", "+00:00"))
    if expiry_dt.tzinfo is not None:
        expiry_dt = expiry_dt.astimezone(timezone.utc).replace(tzinfo=None)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    delta_days = (expiry_dt - now).days
    assert 360 <= delta_days <= 366

    # Check payment logs for 20% discount
    res = await db_session.execute(
        select(PaymentLog)
        .where(PaymentLog.user_email == "subscriber@example.com", PaymentLog.notes.ilike("%yearly%"))
    )
    payment = res.scalars().first()
    assert payment is not None
    # Pro monthly = 11.99. Yearly = 11.99 * 12 * 0.8 = 115.10
    assert abs(payment.amount - 115.10) < 0.1

    # Now manually change expiration to the past to test auto-deactivation
    from datetime import timedelta
    from app.db.models import utc_now_naive
    res_user = await db_session.execute(select(User).where(User.email == "subscriber@example.com"))
    db_user = res_user.scalars().first()
    db_user.subscription_expires_at = utc_now_naive() - timedelta(days=1)
    await db_session.commit()

    # Call /api/auth/me to trigger get_current_user middleware/dependency deactivation check
    response_me = await client.get("/api/auth/me", headers=headers)
    assert response_me.status_code == 200
    me_data = response_me.json()
    assert me_data["subscription_tier"] == "expired"

    # Verify that expired users are blocked from functional endpoints (e.g., SMTP config list)
    response_smtp = await client.get("/api/smtp", headers=headers)
    assert response_smtp.status_code == 403
    assert response_smtp.json()["detail"] == "SUBSCRIPTION_EXPIRED"

    # Test background Celery task
    # Setup another user and set their expiry to the past
    await client.post("/api/auth/register", json={"email": "expired-task@example.com", "password": "Password123#"})
    
    res_user2 = await db_session.execute(select(User).where(User.email == "expired-task@example.com"))
    db_user2 = res_user2.scalars().first()
    db_user2.subscription_tier = "business"
    db_user2.quota_limit = 200000
    db_user2.subscription_expires_at = utc_now_naive() - timedelta(hours=2)
    await db_session.commit()

    # Trigger periodic task sweep synchronously
    from app.tasks.email_sender import async_deactivate_expired_subscriptions
    await async_deactivate_expired_subscriptions()

    # Check user state again
    await db_session.refresh(db_user2)
    assert db_user2.subscription_tier == "expired"
