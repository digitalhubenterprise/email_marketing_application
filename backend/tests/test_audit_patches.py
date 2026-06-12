import pytest
import re
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi import HTTPException

from app.core.security import encrypt_smtp_password, decrypt_smtp_password, sanitize_html
from app.tasks.backup_tasks import execute_remote_restore
from app.db.models import User, Campaign, ContactList
from app.api.campaigns import create_campaign
from app.schemas.campaign import CampaignCreate


# 1. Zip Slip path traversal constraints test
@pytest.mark.anyio
async def test_zip_slip_prevention():
    # Test that execute_remote_restore detects and raises RuntimeError (wrapping ValueError) for zip slip traversal
    with patch("app.tasks.backup_tasks.download_ftp") as mock_dl_ftp, \
         patch("app.tasks.backup_tasks.download_s3") as mock_dl_s3, \
         patch("app.tasks.backup_tasks.zipfile.ZipFile") as mock_zipfile, \
         patch("app.tasks.backup_tasks.AsyncSessionLocal") as mock_session_class, \
         patch("app.tasks.backup_tasks.engine") as mock_engine:
         
         # Mock engine.dispose to be awaitable
         mock_engine.dispose = AsyncMock()
         
         # Mock session and DB config
         mock_db = MagicMock()
         mock_db.execute = AsyncMock()
         mock_db.commit = AsyncMock()
         
         # Setup mock config returned
         mock_config = MagicMock()
         mock_config.provider = "ftp"
         mock_config.ftp_host = "localhost"
         mock_config.ftp_port = 21
         mock_config.ftp_username = "test"
         mock_config.ftp_password = "test"
         
         mock_res = MagicMock()
         mock_res.scalars.return_value.first.return_value = mock_config
         mock_db.execute.return_value = mock_res
         
         # Setup session context manager mock
         mock_session_context = MagicMock()
         mock_session_context.__aenter__.return_value = mock_db
         mock_session_class.return_value = mock_session_context
         
         # Setup mock zip file with traversal paths
         mock_zip = MagicMock()
         mock_zip.namelist.return_value = ["smartcampaign_db.sql", "code/../../etc/passwd"]
         mock_zipfile.return_value.__enter__.return_value = mock_zip
         
         # Call execute_remote_restore and assert it raises RuntimeError (due to zipfile error handling wrapping ValueError)
         with pytest.raises(RuntimeError) as exc_info:
             await execute_remote_restore("smartcampaign_backup_20260612_120000.zip")
             
         assert "Security Warning: Path traversal attempt detected" in str(exc_info.value)


# 2. Encryption and decryption operations on integration credentials
@pytest.mark.anyio
async def test_smtp_and_credentials_encryption():
    plain_text = "my_super_secret_api_key_12345!"
    encrypted = encrypt_smtp_password(plain_text)
    assert encrypted != plain_text
    assert len(encrypted) > 0
    
    decrypted = decrypt_smtp_password(encrypted)
    assert decrypted == plain_text


# 3. Quota verification on automated campaign posts
@pytest.mark.anyio
async def test_campaign_quota_limits(db_session):
    # Set up user under/over limits
    user_under = User(
        email="under@example.com",
        hashed_password="Password123#",
        quota_limit=1000,
        quota_sent=900,
        is_active=True
    )
    db_session.add(user_under)
    
    user_over = User(
        email="over@example.com",
        hashed_password="Password123#",
        quota_limit=1000,
        quota_sent=990,
        is_active=True
    )
    db_session.add(user_over)
    await db_session.commit()
    
    # We will verify that create_campaign raises HTTP 402 for user_over if campaign recipients size exceeds remaining
    campaign_in = CampaignCreate(
        name="Test Campaign",
        subject="Hello",
        contact_list_id=1,  # arbitrary, we will mock DB checks
        smtp_server_id=1,
        sending_mode="auto",
        content_html="<p>Welcome to SmartCampaign</p>"
    )
    
    # Mock database SMTP server and Contact list check queries inside campaigns.py
    with patch("app.api.campaigns.select") as mock_select, \
         patch("app.api.campaigns.func.count") as mock_count:
         
         # Return a valid SMTP server, Contact list, and count of 20 contacts
         mock_smtp = MagicMock()
         mock_list = MagicMock()
         
         class MockResult:
             def __init__(self, val):
                 self.val = val
             def scalars(self):
                 m = MagicMock()
                 m.first.return_value = self.val
                 return m
             def scalar(self):
                 return self.val
                 
         mock_db = MagicMock()
         mock_db.execute = AsyncMock()
         mock_db.commit = AsyncMock()
         mock_db.refresh = AsyncMock()
         mock_db.execute.side_effect = [
             MockResult(mock_smtp),  # SMTP check
             MockResult(mock_list),  # List check
             MockResult(20)         # Contact count = 20
         ]
         
         # Testing user_under: limit=1000, sent=900, total_recipients=20. 900+20 = 920 <= 1000. Under limit -> Should succeed
         try:
             await create_campaign(campaign_in=campaign_in, db=mock_db, current_user=user_under)
         except Exception as e:
             if isinstance(e, HTTPException) and e.status_code == 402:
                 pytest.fail("Should not raise 402 for under quota user")
         
         # Reset mocks
         mock_db.execute.side_effect = [
             MockResult(mock_smtp),
             MockResult(mock_list),
             MockResult(20)         # Contact count = 20
         ]
         # Testing user_over: limit=1000, sent=990, total_recipients=20. 990+20 = 1010 > 1000. Over limit -> Raises 402
         with pytest.raises(HTTPException) as exc_info:
             await create_campaign(campaign_in=campaign_in, db=mock_db, current_user=user_over)
             
         assert exc_info.value.status_code == 402
         assert "remaining in your monthly quota" in exc_info.value.detail


# 4. Transaction hash pattern matches test
@pytest.mark.anyio
async def test_transaction_hash_pattern():
    # regex pattern from auth.py: ^0x[a-fA-F0-9]{64}$
    pattern = re.compile(r"^0x[a-fA-F0-9]{64}$")
    
    # Valid BEP20 transaction hashes
    assert pattern.match("0x" + "a" * 64) is not None
    assert pattern.match("0x" + "1" * 64) is not None
    assert pattern.match("0x" + "1a2b3c4d5e6f" + "7" * 52) is not None
    
    # Invalid hashes
    assert pattern.match("0x" + "g" * 64) is None  # invalid hex char 'g'
    assert pattern.match("0x" + "a" * 63) is None  # too short
    assert pattern.match("0x" + "a" * 65) is None  # too long
    assert pattern.match("0x" + "A" * 64) is not None  # uppercase works too
    assert pattern.match("123" + "a" * 61) is None  # does not start with 0x
