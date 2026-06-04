import pytest
import json
from app.db.models import Contact, SMTPServer
from app.tasks.email_sender import (
    parse_merge_tags,
    wrap_links_with_tracking,
    inject_open_pixel,
    handle_bounce
)
from app.api.tracker import is_safe_redirect_url

pytestmark = pytest.mark.anyio

# 1. Test Merge Tags Parser
async def test_merge_tags_parser():
    contact = Contact(
        email="john.doe@gmail.com",
        name="John Doe",
        custom_fields=json.dumps({"company": "Acme Corp", "city": "Dhaka"})
    )
    
    template = "Hello {{first_name | 'Subscriber'}}, welcome to {{company | 'our site'}} in {{city | 'world'}}! Contact: {{email}}"
    parsed = parse_merge_tags(template, contact)
    expected = "Hello John, welcome to Acme Corp in Dhaka! Contact: john.doe@gmail.com"
    assert parsed == expected

    blank_contact = Contact(email="blank@gmail.com", name="", custom_fields="{}")
    template_fb = "Dear {{first_name | 'Friend'}}, we invite you to {{company | 'our store'}}"
    parsed_fb = parse_merge_tags(template_fb, blank_contact)
    assert parsed_fb == "Dear Friend, we invite you to our store"


# 2. Test Link Tracking Wrapping
async def test_link_tracking_wrapping():
    html_content = (
        'Check out <a href="https://google.com/search?q=fastapi">FastAPI docs</a>. '
        'Don\'t touch <a href="#section-1">anchors</a> or <a href="mailto:info@domain.com">mailto</a>.'
    )
    wrapped = wrap_links_with_tracking(html_content, log_id=42)
    
    assert "api/track/click/42?url=https" in wrapped
    assert "https%3A%2F%2Fgoogle.com%2Fsearch%3Fq%3Dfastapi" in wrapped
    
    assert 'href="#section-1"' in wrapped
    assert 'href="mailto:info@domain.com"' in wrapped


# 3. Test Open Pixel Injection
async def test_open_pixel_injection():
    html_with_body = "<html><head></head><body><h1>Hello World</h1></body></html>"
    injected_body = inject_open_pixel(html_with_body, "http://tracker.com/pixel/99")
    
    assert 'src="http://tracker.com/pixel/99"' in injected_body
    assert injected_body.endswith('style="display:none !important;border:0;outline:0;padding:0;margin:0;" /></body></html>')

    html_simple = "<h1>No body tag here</h1>"
    injected_simple = inject_open_pixel(html_simple, "http://tracker.com/pixel/99")
    assert injected_simple.endswith('style="display:none !important;border:0;outline:0;padding:0;margin:0;" />')


# 4. Test Safe Redirect Validation
async def test_safe_redirect_url_validation():
    assert is_safe_redirect_url("https://google.com") is True
    assert is_safe_redirect_url("http://localhost:3000") is True
    assert is_safe_redirect_url("javascript:alert(1)") is False
    assert is_safe_redirect_url("data:text/html;base64,123") is False


# 5. Test SMTP Bounce Handler
class MockDBSession:
    def __init__(self):
        self.committed = False
    async def commit(self):
        self.committed = True

async def test_bounce_handler():
    db = MockDBSession()
    smtp = SMTPServer(reputation_score=100)
    contact = Contact(email="bounce@example.com", status="active", custom_fields="{}")

    # Soft Bounce Strike 1
    await handle_bounce(db, contact, smtp, 421)
    custom = json.loads(contact.custom_fields)
    assert custom["soft_bounces"] == 1
    assert contact.status == "active"
    assert smtp.reputation_score == 99
    assert db.committed is True

    # Soft Bounce Strike 2
    db.committed = False
    await handle_bounce(db, contact, smtp, 450)
    custom = json.loads(contact.custom_fields)
    assert custom["soft_bounces"] == 2
    assert contact.status == "active"
    assert smtp.reputation_score == 98

    # Soft Bounce Strike 3
    await handle_bounce(db, contact, smtp, 421)
    custom = json.loads(contact.custom_fields)
    assert custom["soft_bounces"] == 3
    assert contact.status == "bounced"
    assert contact.is_unsubscribed is True
    assert smtp.reputation_score == 97

    # Hard Bounce
    smtp2 = SMTPServer(reputation_score=100)
    contact2 = Contact(email="hardbounce@example.com", status="active", custom_fields="{}")
    await handle_bounce(db, contact2, smtp2, 550)
    assert contact2.status == "bounced"
    assert contact2.is_unsubscribed is True
    assert smtp2.reputation_score == 95
