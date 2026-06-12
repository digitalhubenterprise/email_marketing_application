import asyncio
import urllib.request
import urllib.error
import json
import time

async def test_restore_live_logs():
    # 1. Get auth token
    from app.db.session import AsyncSessionLocal
    from app.db.models import AdminUser
    from sqlalchemy import select
    
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(AdminUser).limit(1))
        admin = res.scalars().first()
        if not admin:
            print("No admin user found.")
            return
            
        from app.core.security import create_access_token
        token = create_access_token(subject=str(admin.id), role="admin", password_hash=admin.hashed_password)

    # 2. Get backup filename
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Query backup files list
    req_files = urllib.request.Request("http://localhost:8000/api/admin/backups/files", headers=headers)
    try:
        with urllib.request.urlopen(req_files) as res:
            files = json.loads(res.read().decode())
            if not files:
                print("No remote backup files found on the storage.")
                return
            target_filename = files[0]["filename"]
            print(f"Selected latest backup file for restore: {target_filename}")
    except Exception as e:
        print(f"Failed to fetch files: {e}")
        return

    # 3. Trigger Restore API
    restore_url = f"http://localhost:8000/api/admin/backups/restore?filename={urllib.parse.quote(target_filename)}"
    req_restore = urllib.request.Request(restore_url, method="POST", headers=headers)
    try:
        with urllib.request.urlopen(req_restore) as res:
            body = json.loads(res.read().decode())
            print(f"Restore trigger response: {body['message']}")
    except Exception as e:
        print(f"Restore trigger failed: {e}")
        return

    # 4. Poll restore status live logs
    print("\n--- Live Restoration Progress Console ---")
    status_url = f"http://localhost:8000/api/admin/backups/restore/status?filename={urllib.parse.quote(target_filename)}"
    
    printed_lines = 0
    while True:
        req_status = urllib.request.Request(status_url, headers=headers)
        try:
            with urllib.request.urlopen(req_status) as res:
                data = json.loads(res.read().decode())
                status = data.get("status", "running")
                logs = data.get("logs", [])
                
                # Print new logs
                if len(logs) > printed_lines:
                    for line in logs[printed_lines:]:
                        print(f"  {line}")
                    printed_lines = len(logs)
                
                if status in ("success", "failed"):
                    print(f"\nRestoration completed with status: {status.upper()}")
                    break
        except Exception as e:
            print(f"Failed to fetch status: {e}")
            
        await asyncio.sleep(1.5)

if __name__ == "__main__":
    asyncio.run(test_restore_live_logs())
