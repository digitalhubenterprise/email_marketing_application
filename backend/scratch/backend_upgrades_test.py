import asyncio
import sys
import os
import json

# Setup import path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import components
from app.db.models import Contact, Campaign, SMTPServer
from app.tasks.email_sender import parse_merge_tags, handle_bounce
from app.api.tracker import is_safe_redirect_url

class MockDB:
    def __init__(self):
        self.committed = False
    async def commit(self):
        self.committed = True

async def run_tests():
    print("--- Running Backend Upgrades Test Suite ---")
    
    # 1. Test Merge Tags Parser
    print("\n[TEST 1] Testing Merge Tags Parser...")
    contact = Contact(
        email="john.doe@gmail.com",
        name="John Doe",
        custom_fields=json.dumps({"company": "Acme Corp", "city": "New York"})
    )
    
    template = "Hello {{first_name | 'Friend'}}, welcome to {{company | 'our website'}} in {{city}}! Email: {{email}}"
    parsed = parse_merge_tags(template, contact)
    expected = "Hello John, welcome to Acme Corp in New York! Email: john.doe@gmail.com"
    print(f"Parsed:   {parsed}")
    print(f"Expected: {expected}")
    assert parsed == expected, "Test 1.1 failed!"
    
    # Test Fallbacks
    contact_blank = Contact(email="blank@gmail.com", name="", custom_fields="{}")
    template_fb = "Hello {{first_name | 'Subscriber'}}, from {{company | 'our company'}}"
    parsed_fb = parse_merge_tags(template_fb, contact_blank)
    expected_fb = "Hello Subscriber, from our company"
    print(f"Parsed:   {parsed_fb}")
    print(f"Expected: {expected_fb}")
    assert parsed_fb == expected_fb, "Test 1.2 failed!"
    print("-> Parser matches specifications.")

    # 2. Test Bounce Handler (Hard & Soft)
    print("\n[TEST 2] Testing Bounce Handler...")
    db = MockDB()
    smtp_server = SMTPServer(reputation_score=100)
    contact_bounce = Contact(email="test@gmail.com", status="active", custom_fields="{}")
    
    # Test Soft Bounce Strike 1
    await handle_bounce(db, contact_bounce, smtp_server, 421)
    custom_data = json.loads(contact_bounce.custom_fields)
    assert custom_data.get("soft_bounces") == 1, "Strike 1 failed!"
    assert contact_bounce.status == "active", "Status should remain active on soft bounce strike 1!"
    assert smtp_server.reputation_score == 99, "Reputation should decrement by 1!"
    
    # Test Soft Bounce Strike 2 and 3 (Trigger block)
    await handle_bounce(db, contact_bounce, smtp_server, 450)
    await handle_bounce(db, contact_bounce, smtp_server, 421)
    custom_data = json.loads(contact_bounce.custom_fields)
    assert custom_data.get("soft_bounces") == 3, "Strike 3 count failed!"
    assert contact_bounce.status == "bounced", "Status should flag as bounced on strike 3!"
    assert contact_bounce.is_unsubscribed is True, "Contact should be unsubscribed!"
    assert smtp_server.reputation_score == 97, "Reputation decrement error!"
    
    # Test Hard Bounce
    contact_hard = Contact(email="hard@gmail.com", status="active")
    smtp_server_hard = SMTPServer(reputation_score=100)
    await handle_bounce(db, contact_hard, smtp_server_hard, 550)
    assert contact_hard.status == "bounced", "Hard bounce should change status to bounced immediately!"
    assert contact_hard.is_unsubscribed is True, "Hard bounce should unsubscribe immediately!"
    assert smtp_server_hard.reputation_score == 95, "Hard bounce reputation decrease should be 5!"
    print("-> Bounce decoders and reputation scoring match specifications.")

    # 3. Test Safe Redirect Validation
    print("\n[TEST 3] Testing Safe Redirect Validation...")
    assert is_safe_redirect_url("https://google.com") is True, "https://google.com should be safe!"
    assert is_safe_redirect_url("http://localhost:3000") is True, "http should be safe!"
    assert is_safe_redirect_url("javascript:alert(1)") is False, "javascript: scheme is unsafe!"
    assert is_safe_redirect_url("data:text/html,abc") is False, "data: scheme is unsafe!"
    print("-> Open redirect protections match specifications.")

    print("\nAll Backend Unit Tests Passed Successfully!")

if __name__ == "__main__":
    asyncio.run(run_tests())
