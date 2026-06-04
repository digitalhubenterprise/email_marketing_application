# Telegram Marketing Integration Verification Suite
import os
import sys
import asyncio
from datetime import datetime, timezone

# Add backend directory to path to enable local module imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../Work/Development_Projects/email_marketing_application/backend")))

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
        # IMEI Services:
        imei1 = TelegramService(title="iPhone IMEI Unlock", category="IMEI Service", active=True)
        imei2 = TelegramService(title="Samsung IMEI Unlock", category="IMEI Service", active=True)
        # Server Services:
        server1 = TelegramService(title="Octoplus Credits", category="Server Service", active=True)
        server2 = TelegramService(title="Chimera Credits", category="Server Service", active=True)
        # Remote Services:
        remote1 = TelegramService(title="TeamViewer Rental", category="Remote Service", active=True)
        remote2 = TelegramService(title="FlexiHub Rental", category="Remote Service", active=True)
        
        active_services = [imei1, imei2, server1, server2, remote1, remote2]

        class MockResult:
            def __init__(self, item=None, count_val=0):
                self.item = item
                self.count_val = count_val
            def scalars(self):
                return self
            def first(self):
                return self.item
            def scalar(self):
                return self.count_val

        class MockSession:
            def __init__(self, last_log=None, total_success=0):
                self.last_log = last_log
                self.total_success = total_success
            async def execute(self, query):
                q_str = str(query).lower()
                if "count" in q_str:
                    return MockResult(count_val=self.total_success)
                else:
                    return MockResult(item=self.last_log)

        # Scenario A: 0 success posts. Primary target IMEI Service.
        # Alphabetically sorted IMEI Services: imei1 ("iPhone IMEI Unlock") first.
        # No last log. Should return imei1.
        session_0 = MockSession(last_log=None, total_success=0)
        next_svc = await get_next_service(session_0, 1, active_services)
        assert next_svc == imei1, f"Scenario A failed: expected {imei1.title}, got {next_svc.title if next_svc else 'None'}"

        # Scenario B: 1 success post. Primary target IMEI Service.
        # Last log for IMEI Service was imei1 ("iPhone IMEI Unlock").
        # Should rotate to next IMEI: imei2 ("Samsung IMEI Unlock").
        last_imei_log = TelegramLog(service_title="iPhone IMEI Unlock", category="IMEI Service", status="Success")
        session_1 = MockSession(last_log=last_imei_log, total_success=1)
        next_svc = await get_next_service(session_1, 1, active_services)
        assert next_svc == imei2, f"Scenario B failed: expected {imei2.title}, got {next_svc.title if next_svc else 'None'}"

        # Scenario C: 2 success posts. Primary target Server Service.
        # Alphabetically sorted Server Services: server2 ("Chimera Credits") first.
        # No last log. Should return server2.
        session_2 = MockSession(last_log=None, total_success=2)
        next_svc = await get_next_service(session_2, 1, active_services)
        assert next_svc == server2, f"Scenario C failed: expected {server2.title}, got {next_svc.title if next_svc else 'None'}"

        # Scenario D: 5 success posts. Primary target Remote Service.
        # Alphabetically sorted Remote Services: remote2 ("FlexiHub Rental") first.
        # No last log. Should return remote2.
        session_5 = MockSession(last_log=None, total_success=5)
        next_svc = await get_next_service(session_5, 1, active_services)
        assert next_svc == remote2, f"Scenario D failed: expected {remote2.title}, got {next_svc.title if next_svc else 'None'}"

        # Scenario E: Fallback logic check.
        # If there are no IMEI services, and we are at total_success = 0 (Normally IMEI Service),
        # it should fall back to the next available category in sequence: Server Service.
        # Should return the first Server service: server2 ("Chimera Credits").
        services_no_imei = [server1, server2, remote1, remote2]
        session_fallback = MockSession(last_log=None, total_success=0)
        next_svc = await get_next_service(session_fallback, 1, services_no_imei)
        assert next_svc == server2, f"Scenario E failed: expected {server2.title}, got {next_svc.title if next_svc else 'None'}"

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
