import os
import pytest
from app.db.models import User, SubscriptionPlan, SystemConfig, PaymentLog
from sqlalchemy import select

pytestmark = pytest.mark.anyio


async def get_auth_headers(client, email="audit_user@example.com"):
    # Register a user
    reg_payload = {
        "email": email,
        "password": "Password123#"
    }
    await client.post("/api/auth/register", json=reg_payload)

    # Login
    login_payload = {
        "username": email,
        "password": "Password123#"
    }
    response_login = await client.post(
        "/api/auth/login",
        data=login_payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    token = response_login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def test_payment_mock_hash_blocks_in_production(client, db_session, monkeypatch):
    headers = await get_auth_headers(client, "prod_payment@example.com")

    # 1. Production Mode check
    monkeypatch.setenv("ENVIRONMENT", "production")

    payment_payload = {
        "amount": 11.99,
        "currency": "USD",
        "plan_tier": "pro",
        "gateway": "USDT BEP20",
        "txhash": "MOCK_TXN_12345",
        "notes": "Testing payment"
    }

    # Should reject mock transaction in production
    response = await client.post("/api/auth/my-payments", json=payment_payload, headers=headers)
    assert response.status_code == 400
    assert "Mock transactions are not allowed in production" in response.json()["detail"]

    # Empty transaction hash should also be blocked
    payment_payload["txhash"] = ""
    response_empty = await client.post("/api/auth/my-payments", json=payment_payload, headers=headers)
    assert response_empty.status_code == 400
    assert "Transaction hash cannot be empty" in response_empty.json()["detail"]


async def test_payment_mock_hash_allows_in_dev(client, db_session, monkeypatch):
    headers = await get_auth_headers(client, "dev_payment@example.com")

    # Ensure plan is in db first to avoid plan tier mismatch
    res_plan = await db_session.execute(select(SubscriptionPlan).where(SubscriptionPlan.tier == "pro"))
    plan = res_plan.scalars().first()
    if not plan:
        plan = SubscriptionPlan(
            tier="pro",
            name="Pro",
            price=1199,
            quota=50000,
            smtp_limit=5,
            features="Test"
        )
        db_session.add(plan)
        await db_session.commit()

    # 2. Non-production / Dev Mode check
    monkeypatch.setenv("ENVIRONMENT", "development")

    payment_payload = {
        "amount": 11.99,
        "currency": "USD",
        "plan_tier": "pro",
        "gateway": "USDT BEP20",
        "txhash": "MOCK_TXN_12345",
        "notes": "Testing payment"
    }

    response = await client.post("/api/auth/my-payments", json=payment_payload, headers=headers)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    assert res_data["payment"]["status"] == "paid"


async def test_payment_plan_tier_validation(client, db_session, monkeypatch):
    headers = await get_auth_headers(client, "tier_validation@example.com")
    monkeypatch.setenv("ENVIRONMENT", "development")

    payment_payload = {
        "amount": 11.99,
        "currency": "USD",
        "plan_tier": "non_existent_tier_xyz",
        "gateway": "USDT BEP20",
        "txhash": "MOCK_TXN_12345",
        "notes": "Testing plan validation"
    }

    # Should return 400 because non_existent_tier_xyz is not in the db
    response = await client.post("/api/auth/my-payments", json=payment_payload, headers=headers)
    assert response.status_code == 400
    assert "plan tier does not exist" in response.json()["detail"].lower()


async def test_smtp_ssrf_defense_in_production(client, db_session, monkeypatch):
    headers = await get_auth_headers(client, "smtp_ssrf@example.com")

    # Set to production
    monkeypatch.setenv("ENVIRONMENT", "production")

    smtp_payload = {
        "host": "127.0.0.1",
        "port": 25,
        "username": "test",
        "password": "pwd",
        "security": "TLS",
        "from_email": "test@example.com"
    }

    # Loopback IP should be blocked
    response = await client.post("/api/smtp/test-connection", json=smtp_payload, headers=headers)
    assert response.status_code == 400
    assert "Testing connections to private or loopback IP ranges is not allowed" in response.json()["detail"]

    # Localhost hostname should be blocked
    smtp_payload["host"] = "localhost"
    response_host = await client.post("/api/smtp/test-connection", json=smtp_payload, headers=headers)
    assert response_host.status_code == 400
    assert "Testing connections to private or loopback IP ranges is not allowed" in response_host.json()["detail"]


async def test_smtp_ssrf_allows_in_dev(client, db_session, monkeypatch):
    headers = await get_auth_headers(client, "smtp_ssrf_dev@example.com")

    # Set to development
    monkeypatch.setenv("ENVIRONMENT", "development")

    smtp_payload = {
        "host": "127.0.0.1",
        "port": 9999, # non-existent port to fail connection fast
        "username": "test",
        "password": "pwd",
        "security": "TLS",
        "from_email": "test@example.com"
    }

    # Should not trigger 400 error; instead, it should attempt connection and return 200 with success=False
    response = await client.post("/api/smtp/test-connection", json=smtp_payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["success"] is False


async def test_dhru_parsing_fallback(client, db_session):
    # Configure Dhru in system config
    config_res = await db_session.execute(select(SystemConfig).where(SystemConfig.id == 1))
    config = config_res.scalars().first()
    if not config:
        config = SystemConfig(
            id=1,
            api_listener_username="dhru_user",
            api_listener_access_key="dhru_key_123456",
            api_listener_enabled=True
        )
        db_session.add(config)
    else:
        config.api_listener_username = "dhru_user"
        config.api_listener_access_key = "dhru_key_123456"
        config.api_listener_enabled = True
        db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    # Malformed base64 parameters string that cannot be decoded
    payload = {
        "username": "dhru_user",
        "apiaccesskey": "dhru_key_123456",
        "action": "accountinfo",
        "parameters": "!!!invalid_base64!!!",
        "requestformat": "JSON"
    }

    # Should fallback gracefully without 500 error
    response = await client.post("/api/dhru", data=payload)
    assert response.status_code == 200
    assert "SUCCESS" in response.json()


async def test_dhru_xml_response(client, db_session):
    config_res = await db_session.execute(select(SystemConfig).where(SystemConfig.id == 1))
    config = config_res.scalars().first()
    if not config:
        config = SystemConfig(
            id=1,
            api_listener_username="dhru_user",
            api_listener_access_key="dhru_key_123456",
            api_listener_enabled=True
        )
        db_session.add(config)
    else:
        config.api_listener_username = "dhru_user"
        config.api_listener_access_key = "dhru_key_123456"
        config.api_listener_enabled = True
        db_session.add(config)
    await db_session.commit()

    payload = {
        "username": "dhru_user",
        "apiaccesskey": "dhru_key_123456",
        "action": "accountinfo",
        "requestformat": "XML"
    }

    response = await client.post("/api/dhru", data=payload)
    assert response.status_code == 200
    assert response.headers.get("content-type") == "application/xml"
    body = response.text
    assert "<RESPONSE>" in body
    assert "<SUCCESS>" in body
    assert "<BALANCE>999999.00</BALANCE>" in body
    assert "<CURRENCY>USD</CURRENCY>" in body
    assert "<balance>" not in body
    assert "<currency>" not in body


async def test_dhru_form_array_parameter_parsing(client, db_session):
    # Register the user
    reg_payload = {
        "email": "gsmrajusatkhira@gmail.com",
        "password": "Password123#"
    }
    await client.post("/api/auth/register", json=reg_payload)

    # Configure Dhru
    config_res = await db_session.execute(select(SystemConfig).where(SystemConfig.id == 1))
    config = config_res.scalars().first()
    if not config:
        config = SystemConfig(
            id=1,
            api_listener_username="dhru_user",
            api_listener_access_key="dhru_key_123456",
            api_listener_enabled=True
        )
        db_session.add(config)
    else:
        config.api_listener_username = "dhru_user"
        config.api_listener_access_key = "dhru_key_123456"
        config.api_listener_enabled = True
        db_session.add(config)
    await db_session.commit()

    # Get a valid plan ID
    plan_res = await db_session.execute(select(SubscriptionPlan).limit(1))
    plan = plan_res.scalars().first()
    assert plan is not None

    payload = {
        "username": "dhru_user",
        "apiaccesskey": "dhru_key_123456",
        "action": "placeimeiorder",
        "parameters[ID]": str(plan.id),
        "parameters[customfield]": "gsmrajusatkhira@gmail.com",
        "requestformat": "JSON"
    }

    response = await client.post("/api/dhru", data=payload)
    assert response.status_code == 200
    res_json = response.json()
    assert "SUCCESS" in res_json
    assert "REFERENCEID" in res_json["SUCCESS"][0]

