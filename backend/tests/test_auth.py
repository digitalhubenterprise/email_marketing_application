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
    assert res_data["subscription_tier"] == "free"

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
    assert payment.amount == 1199
    assert payment.gateway == "Stripe"
    assert payment.status == "paid"
