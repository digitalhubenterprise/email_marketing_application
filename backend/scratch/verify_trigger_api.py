import asyncio
import os
import sys
import urllib.request
import json

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import AsyncSessionLocal, engine
from app.db.models import RemoteBackupLog, AdminUser
from sqlalchemy import select

async def get_admin_token():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(AdminUser).limit(1))
        admin = res.scalars().first()
        if not admin:
            raise ValueError("No admin user found in database.")
        
        from app.core.security import create_access_token
        token = create_access_token(subject=str(admin.id), role="admin", password_hash=admin.hashed_password)
        return token

async def test_trigger_api():
    print("Testing Backup Trigger API via urllib...")
    token = await get_admin_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    url = "http://localhost:8000/api/admin/backups/trigger?full_site=true"
    print(f"Sending POST to {url}...")
    
    req = urllib.request.Request(
        url,
        headers=headers,
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            print(f"Response code: {response.status}")
            body = response.read().decode("utf-8")
            print(f"Response body: {body}")
    except Exception as e:
        print(f"Request failed: {e}")
        await engine.dispose()
        return
        
    print("\nWaiting 10 seconds for Celery worker to finish task in background...")
    await asyncio.sleep(10)
    
    print("\nChecking database logs for new backup execution entry...")
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(RemoteBackupLog)
            .order_by(RemoteBackupLog.created_at.desc())
            .limit(1)
        )
        log = res.scalars().first()
        if log:
            print(f"Latest Backup Log ID {log.id}:")
            print(f" - Filename: {log.filename}")
            print(f" - Status: {log.status}")
            print(f" - Size: {log.size_bytes} bytes ({log.size_bytes / 1024 / 1024:.2f} MB)")
            print(f" - Message: {log.message}")
            print(f" - Created: {log.created_at}")
        else:
            print("ERROR: No logs found.")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_trigger_api())
