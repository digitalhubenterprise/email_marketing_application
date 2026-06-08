import asyncio
import urllib.request
import urllib.parse
import json
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models import SystemConfig

async def check_remote():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(SystemConfig).where(SystemConfig.id == 1))
        config = res.scalars().first()
        if not config:
            print("No SystemConfig found in local DB.")
            return
        
        username = config.api_listener_username
        access_key = config.api_listener_access_key
        print(f"Local DB Config: Username='{username}', Access Key='{access_key}'")

        url = "https://beta.smartcampaign.today/api/dhru"
        
        def send_post(action, format_type):
            payload = {
                "username": username,
                "apiaccesskey": access_key,
                "action": action,
                "requestformat": format_type
            }
            data = urllib.parse.urlencode(payload).encode("utf-8")
            req = urllib.request.Request(
                url, 
                data=data, 
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            )
            try:
                with urllib.request.urlopen(req, timeout=10) as response:
                    print(f"\n--- {action} ({format_type}) ---")
                    body = response.read().decode("utf-8")
                    print(body)
            except Exception as e:
                print(f"Error for {action} ({format_type}):", e)

        send_post("imeiservicelist", "XML")
        send_post("serverservicelist", "XML")

asyncio.run(check_remote())
