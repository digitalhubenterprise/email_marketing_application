import asyncio
import sys
import os
import json
from unittest.mock import MagicMock, AsyncMock

# Add app parent directory to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.api.dhru import handle_dhru_api_impl

class MockRequest:
    def __init__(self, query_params=None, form_data=None, headers=None):
        self.query_params = query_params or {}
        self._form_data = form_data or {}
        self.headers = headers or {}
        self.client = MagicMock()
        self.client.host = "127.0.0.1"

    async def form(self):
        return self._form_data

    async def json(self):
        return self._form_data

class MockConfig:
    id = 1
    api_listener_enabled = True
    api_listener_username = "ipsabdurrazzak"
    api_listener_access_key = "Amin@1234"

async def test_json_structure():
    print("Testing accountinfo JSON response format with mocked DB...")
    
    # Mock database session
    db = AsyncMock()
    
    # Mock config query execution
    mock_scalars = MagicMock()
    mock_scalars.first.return_value = MockConfig()
    
    mock_execute_res = MagicMock()
    mock_execute_res.scalars.return_value = mock_scalars
    
    db.execute.return_value = mock_execute_res
    
    # Mock request with requestformat: JSON
    mock_req = MockRequest(
        form_data={
            "username": "ipsabdurrazzak",
            "apiaccesskey": "Amin@1234",
            "action": "accountinfo",
            "requestformat": "JSON"
        }
    )
    context = {"requestformat": None}
    res = await handle_dhru_api_impl(mock_req, db, context)
    
    # We enrich with lowercase keys inside send_response, so let's import it to mimic the final serialization
    from app.api.dhru import enrich_with_lowercase_keys
    final_res = enrich_with_lowercase_keys(res)
    
    print("\n--- Raw Handler Result ---")
    print(json.dumps(res, indent=2))
    
    print("\n--- Final Enriched Result ---")
    print(json.dumps(final_res, indent=2))
    
    # Assertions
    assert final_res["status"].lower() == "success"
    assert isinstance(final_res["SUCCESS"], dict)
    assert final_res["SUCCESS"]["EMAIL"] == "ipsabdurrazzak@gmail.com"
    assert final_res["SUCCESS"]["email"] == "ipsabdurrazzak@gmail.com"
    
    # Assert array-like index 0 is present
    assert final_res["SUCCESS"]["0"]["EMAIL"] == "ipsabdurrazzak@gmail.com"
    assert final_res["SUCCESS"]["0"]["email"] == "ipsabdurrazzak@gmail.com"
    
    # Assert root fields are present
    assert final_res["EMAIL"] == "ipsabdurrazzak@gmail.com"
    assert final_res["email"] == "ipsabdurrazzak@gmail.com"
    
    print("\n[+] JSON Response format verification PASSED successfully!")

if __name__ == "__main__":
    asyncio.run(test_json_structure())
