import pytest
from app.db.models import SMSMarketingConfig, SMSCampaign, SMSLog
from sqlalchemy import select

pytestmark = pytest.mark.anyio


async def get_auth_headers(client, email="sms_test@example.com"):
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


async def test_sms_config_flow(client, db_session):
    headers = await get_auth_headers(client, "sms_config@example.com")
    
    # 1. Get empty config
    res_get = await client.get("/api/sms-marketing/config", headers=headers)
    assert res_get.status_code == 200
    assert res_get.json()["provider"] == "bulksmsbd"
    assert res_get.json()["api_key"] is None

    # 2. Save config
    payload = {
        "provider": "bulksmsbd",
        "api_key": "IQz2Gpd7Du1LNgfF0AVJ",
        "sender_id": "8809617623864",
        "is_active": True
    }
    res_post = await client.post("/api/sms-marketing/config", json=payload, headers=headers)
    assert res_post.status_code == 200
    assert res_post.json()["api_key"] == "IQz2Gpd7Du1LNgfF0AVJ"
    assert res_post.json()["sender_id"] == "8809617623864"


async def test_sms_test_connection(client, db_session):
    headers = await get_auth_headers(client, "sms_test_conn@example.com")
    payload = {
        "recipient": "8801700000000",
        "message": "Test Message",
        "api_key": "IQz2Gpd7Du1LNgfF0AVJ",
        "sender_id": "8809617623864",
        "provider": "mock"
    }
    res = await client.post("/api/sms-marketing/test-connection", json=payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["success"] is True


async def test_sms_campaign_dispatch(client, db_session):
    headers = await get_auth_headers(client, "sms_campaign@example.com")
    
    # Configure first with mock provider
    config_payload = {
        "provider": "mock",
        "api_key": "mock_key",
        "sender_id": "mock_sender",
        "is_active": True
    }
    await client.post("/api/sms-marketing/config", json=config_payload, headers=headers)

    # Dispatch campaign
    camp_payload = {
        "name": "Promo Campaign",
        "sender_id": "mock_sender",
        "message": "Eid Promo!",
        "recipients": "8801700000001, 8801800000002"
    }
    res = await client.post("/api/sms-marketing/campaigns", json=camp_payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["total_recipients"] == 2
    assert res.json()["sent_count"] == 2
    assert res.json()["status"] == "sent"

    # Verify logs in database
    logs_res = await client.get("/api/sms-marketing/logs", headers=headers)
    assert logs_res.status_code == 200
    assert logs_res.json()["total"] == 2
    assert logs_res.json()["logs"][0]["recipient"] in ["8801700000001", "8801800000002"]


async def test_sms_templates_crud(client, db_session):
    headers = await get_auth_headers(client, "sms_tmpl_test@example.com")

    # 1. List empty templates
    res = await client.get("/api/sms-marketing/templates", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) == 0

    # 2. Create a template
    payload = {
        "title": "Welcome Promo",
        "body": "Hello! Welcome to SmartCampaign. Use code WELCOME10 for 10% off."
    }
    res = await client.post("/api/sms-marketing/templates", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["title"] == "Welcome Promo"
    assert data["body"] == "Hello! Welcome to SmartCampaign. Use code WELCOME10 for 10% off."
    template_id = data["id"]

    # 3. List templates and verify
    res = await client.get("/api/sms-marketing/templates", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["id"] == template_id

    # 4. Update template
    update_payload = {
        "title": "Welcome Promo Updated",
        "body": "Hello! Welcome to SmartCampaign. Use code WELCOME20 for 20% off."
    }
    res = await client.put(f"/api/sms-marketing/templates/{template_id}", json=update_payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["title"] == "Welcome Promo Updated"
    assert res.json()["body"] == "Hello! Welcome to SmartCampaign. Use code WELCOME20 for 20% off."

    # 5. Delete template
    res = await client.delete(f"/api/sms-marketing/templates/{template_id}", headers=headers)
    assert res.status_code == 204

    # 6. Verify empty again
    res = await client.get("/api/sms-marketing/templates", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) == 0
