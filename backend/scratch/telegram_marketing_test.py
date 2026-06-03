# Telegram Marketing Integration Verification Suite
import os
import sys
import asyncio
from datetime import datetime, timezone

# Add backend directory to path to enable local module imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

async def main():
    print("====================================================")
    print("RUNNING TELEGRAM MARKETING INTEGRATION LOCAL TESTS")
    print("====================================================")

    # 1. Verify Imports
    try:
        from app.db.models import TelegramMarketingConfig, TelegramService, TelegramLog
        from app.schemas.telegram_marketing import TelegramMarketingConfigResponse, TelegramServiceCreate
        from app.tasks.telegram_tasks import contains_leakage, get_next_service
        print("[PASS] Imports of database models, schemas, and tasks succeeded.")
    except Exception as e:
        print(f"[FAIL] Imports check failed: {e}")
        return

    # 2. Test Credential Leakage Guard
    try:
        print("[INFO] Testing Credential Guard (Leakage checks)...")
        # Prepare a mock config
        config = TelegramMarketingConfig(
            telegram_bot_token="123456789:ABC-DEF12345ghijk-lmnopqrstuvwx",
            groq_api_key="gsk_1234567890abcdef1234567890abcdef12"
        )
        
        # Test clean copy
        clean_text = "Check out our new remote server unlocked pricing! Visit our portal today."
        leak, name = contains_leakage(clean_text, config)
        assert not leak, f"False positive detected: {name}"
        
        # Test generic Groq Key pattern leak
        leaky_text_groq = "Here is the key gsk_abcdef1234567890abcdef1234567890abc for API access."
        leak, name = contains_leakage(leaky_text_groq, config)
        assert leak and name == "Groq Cloud API Key", f"Failed to detect Groq Key leak: {name}"
        
        # Test config-specific bot token leak
        leaky_text_token = "Make sure to connect via 123456789:ABC-DEF12345ghijk-lmnopqrstuvwx on telegram."
        leak, name = contains_leakage(leaky_text_token, config)
        assert leak and name == "Active Telegram Bot Token", f"Failed to detect Bot Token leak: {name}"

        # Test Database URL leak
        leaky_text_db = "Our server is located at postgres://user:pass@localhost:5432/dbname"
        leak, name = contains_leakage(leaky_text_db, config)
        assert leak and name == "Database URL", f"Failed to detect Database URL leak: {name}"

        print("[PASS] Credential Guard successfully blocked all leakage test scenarios.")
    except Exception as e:
        print(f"[FAIL] Credential Guard test failed: {e}")
        return

    # 3. Test Service Rotation Logic (get_next_service)
    try:
        print("[INFO] Testing Service Rotation matching...")
        
        # Mock services list
        svc1 = TelegramService(title="GSM Carrier Unlock", category="GSM Unlocks", active=True)
        svc2 = TelegramService(title="Server Tool Credits", category="Server Credits", active=True)
        svc3 = TelegramService(title="Remote Rental", category="Remote Rentals", active=True)
        active_services = [svc1, svc2, svc3]

        # Scenario A: No previous logs, should return first service
        class MockResult:
            def __init__(self, item=None):
                self.item = item
            def scalars(self):
                return self
            def first(self):
                return self.item

        class MockSession:
            def __init__(self, last_log=None):
                self.last_log = last_log
            async def execute(self, query):
                return MockResult(self.last_log)

        session_no_log = MockSession(last_log=None)
        next_svc = await get_next_service(session_no_log, 1, active_services)
        assert next_svc == svc1, f"Expected first service title {svc1.title}, got {next_svc.title if next_svc else 'None'}"

        # Scenario B: Last log was GSM Carrier Unlock, should rotate to Server Tool Credits (index 1)
        log1 = TelegramLog(service_title="GSM Carrier Unlock", category="GSM Unlocks", status="Success")
        session_log1 = MockSession(last_log=log1)
        next_svc = await get_next_service(session_log1, 1, active_services)
        assert next_svc == svc2, f"Expected second service title {svc2.title}, got {next_svc.title if next_svc else 'None'}"

        # Scenario C: Last log was Remote Rental (index 2), should wrap around to GSM Carrier Unlock (index 0)
        log3 = TelegramLog(service_title="Remote Rental", category="Remote Rentals", status="Success")
        session_log3 = MockSession(last_log=log3)
        next_svc = await get_next_service(session_log3, 1, active_services)
        assert next_svc == svc1, f"Expected wrap-around to {svc1.title}, got {next_svc.title if next_svc else 'None'}"

        print("[PASS] Service Rotation helper rotates and wraps around categories successfully.")
    except Exception as e:
        print(f"[FAIL] Service Rotation test failed: {e}")
        return

    # 4. Schema Validations
    try:
        print("[INFO] Testing Pydantic validation rules...")
        from pydantic import ValidationError
        
        # Test creation schema with invalid length
        try:
            TelegramServiceCreate(title="", category="GSM Unlocks", focus="Clean unlocks", angle="Best angle")
            assert False, "Validation should have failed for empty title"
        except ValidationError:
            pass

        # Test valid configuration values
        valid_create = TelegramServiceCreate(
            title="Premium bypass tool",
            category="Server Credits",
            focus="All iOS devices",
            angle="Official server api connection"
        )
        assert valid_create.title == "Premium bypass tool"

        print("[PASS] Schemas validated correctly.")
    except Exception as e:
        print(f"[FAIL] Schema validation check failed: {e}")
        return

    print("====================================================")
    print("ALL TELEGRAM MARKETING VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("====================================================")

if __name__ == "__main__":
    asyncio.run(main())
