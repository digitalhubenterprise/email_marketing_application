import asyncio
import urllib.request
import urllib.parse
import json
import time

async def main():
    from app.db.session import AsyncSessionLocal
    from app.db.models import AdminUser
    from sqlalchemy import select
    
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(AdminUser).limit(1))
        admin = res.scalars().first()
        if not admin:
            print("No admin user")
            return
        from app.core.security import create_access_token
        token = create_access_token(subject=str(admin.id), role="admin", password_hash=admin.hashed_password)

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Trigger manual full backup
    print("Triggering manual Full Website Backup...")
    req = urllib.request.Request("http://localhost:8000/api/admin/backups/trigger?full_site=true", method="POST", headers=headers)
    try:
        with urllib.request.urlopen(req) as res:
            print(res.read().decode())
    except Exception as e:
        print(f"Trigger failed: {e}")
        return

    # Wait for the backup to complete by listing logs
    print("Waiting for backup to complete...")
    for _ in range(30):
        await asyncio.sleep(2)
        req_logs = urllib.request.Request("http://localhost:8000/api/admin/backups/logs?log_type=backup&limit=1", headers=headers)
        try:
            with urllib.request.urlopen(req_logs) as r:
                logs = json.loads(r.read().decode())
                if logs:
                    log = logs[0]
                    if "uploaded" in log["message"] or "failed" in log["status"]:
                        print(f"Backup completed! Status: {log['status']}, File: {log['filename']}, Msg: {log['message']}")
                        return log["filename"]
        except Exception as e:
            print(f"Polling logs failed: {e}")
    print("Backup did not complete in time.")
    return None

if __name__ == "__main__":
    asyncio.run(main())
