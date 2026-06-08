import aiohttp
from typing import Dict, Any

class SMSService:
    """Service layer to encapsulate SMS Gateway API requests (e.g. bulksmsbd.net)."""

    @staticmethod
    async def get_balance(provider: str, api_key: str) -> Dict[str, Any]:
        """
        Fetches the current credit balance from the configured provider.
        """
        if not api_key:
            return {"balance": "0.00", "currency": "BDT"}

        if provider == "bulksmsbd":
            url = f"http://bulksmsbd.net/api/getBalanceApi?api_key={api_key}"
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, timeout=10) as resp:
                        if resp.status == 200:
                            try:
                                data = await resp.json()
                                return {
                                    "balance": str(data.get("balance", "0")), 
                                    "currency": "BDT"
                                }
                            except Exception:
                                # Fallback if text format returned
                                text = await resp.text()
                                return {
                                    "balance": text.strip(), 
                                    "currency": "BDT"
                                }
                        else:
                            raise Exception(f"HTTP status code {resp.status}")
            except Exception as e:
                raise Exception(f"BulkSMSBD connectivity failed: {str(e)}")
        
        # Mock responses for other gateway options
        elif provider == "twilio":
            return {"balance": "85.20", "currency": "USD"}
        elif provider == "vonage":
            return {"balance": "42.10", "currency": "EUR"}
        
        return {"balance": "100.00", "currency": "USD"}

    @staticmethod
    async def send_sms(
        provider: str, 
        api_key: str, 
        sender_id: str, 
        recipient: str, 
        message: str
    ) -> Dict[str, Any]:
        """
        Submits SMS requests to the provider API.
        Supports single and bulk list (comma-separated) recipients.
        """
        if provider == "bulksmsbd":
            url = "http://bulksmsbd.net/api/smsapi"
            params = {
                "api_key": api_key,
                "type": "text",
                "number": recipient.strip(),
                "senderid": sender_id.strip(),
                "message": message
            }
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, params=params, timeout=15) as resp:
                        resp_text = await resp.text()
                        if resp.status == 200:
                            try:
                                data = await resp.json()
                                code = str(data.get("response_code", ""))
                                if code == "202":
                                    return {
                                        "success": True, 
                                        "code": "202", 
                                        "message": "SMS Submitted Successfully"
                                    }
                                else:
                                    err_msg = data.get("error_message", f"Error Code: {code}")
                                    return {
                                        "success": False, 
                                        "code": code, 
                                        "message": err_msg
                                    }
                            except Exception:
                                if "202" in resp_text:
                                    return {
                                        "success": True, 
                                        "code": "202", 
                                        "message": "SMS Submitted Successfully"
                                    }
                                return {
                                    "success": False, 
                                    "code": "failed", 
                                    "message": f"Raw Response: {resp_text}"
                                }
                        else:
                            return {
                                "success": False, 
                                "code": "http_error", 
                                "message": f"Gateway HTTP Error status {resp.status}"
                            }
            except Exception as e:
                return {
                    "success": False, 
                    "code": "connection_error", 
                    "message": f"Connection failed: {str(e)}"
                }
        
        # Mocks for other gateways
        return {
            "success": True, 
            "code": "202", 
            "message": "Mock SMS request submitted successfully"
        }
