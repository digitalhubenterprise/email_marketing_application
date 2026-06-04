import pytest
from app.db.models import User, ContactList, Contact
from sqlalchemy import select

pytestmark = pytest.mark.anyio

async def test_csv_upload_functionality_and_oom_protection(client, db_session):
    # 1. Register and Login to get Auth Headers
    reg_payload = {"email": "uploader@example.com", "password": "UploaderPassword123#"}
    await client.post("/api/auth/register", json=reg_payload)
    
    login_res = await client.post(
        "/api/auth/login",
        data={"username": "uploader@example.com", "password": "UploaderPassword123#"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create a Contact List
    list_payload = {"name": "Test Customers List", "description": "Used for testing CSV imports"}
    list_res = await client.post("/api/contacts/lists", json=list_payload, headers=headers)
    assert list_res.status_code == 201
    list_id = list_res.json()["id"]

    # 3. Import standard valid CSV file
    csv_content = (
        "Full Name,Subscriber Email,Location,Phone\n"
        "Alice Smith,alice@example.com,Dhaka,123456\n"
        "Bob Jones,bob@example.com,New York,78910\n"
        "Charlie Bad,invalid-email-address,London,1111\n"
        "Alice Smith,alice@example.com,Dhaka,dup-check\n"  # Internal duplicate
    )
    
    files = {"file": ("contacts.csv", csv_content.encode("utf-8"), "text/csv")}
    upload_res = await client.post(
        f"/api/contacts/lists/{list_id}/upload-csv",
        files=files,
        headers=headers
    )
    assert upload_res.status_code == 200
    res_json = upload_res.json()
    
    # 2 succeeded (Alice, Bob), 1 invalid format failed (Charlie), 1 duplicate skipped (Alice)
    assert res_json["success_count"] == 2
    assert res_json["failed_count"] == 1
    assert res_json["skipped_count"] == 1
    assert len(res_json["errors"]) > 0
    assert "Invalid email" in res_json["errors"][0]

    # Verify contacts were stored and custom fields mapped
    contacts_res = await db_session.execute(
        select(Contact).where(Contact.list_id == list_id).order_by(Contact.id.asc())
    )
    contacts = contacts_res.scalars().all()
    assert len(contacts) == 2
    
    assert contacts[0].name == "Alice Smith"
    assert contacts[0].email == "alice@example.com"
    import json
    custom_0 = json.loads(contacts[0].custom_fields)
    assert custom_0["Location"] == "Dhaka"
    assert custom_0["Phone"] == "123456"

    # 4. Attempt to upload non-CSV content type (should fail with HTTP 400)
    bad_files = {"file": ("test.png", b"fake-binary-data", "image/png")}
    bad_res = await client.post(
        f"/api/contacts/lists/{list_id}/upload-csv",
        files=bad_files,
        headers=headers
    )
    assert bad_res.status_code == 400
    assert "Only CSV files" in bad_res.json()["detail"]

    # 5. OOM Prevention: Upload a file exceeding 5MB (should fail with HTTP 413)
    large_data = b"x" * (6 * 1024 * 1024)
    large_files = {"file": ("large_contacts.csv", large_data, "text/csv")}
    
    large_res = await client.post(
        f"/api/contacts/lists/{list_id}/upload-csv",
        files=large_files,
        headers=headers
    )
    assert large_res.status_code == 413
    assert "exceeds maximum size limit" in large_res.json()["detail"]
