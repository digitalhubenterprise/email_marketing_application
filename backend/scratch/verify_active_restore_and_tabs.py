import asyncio
import urllib.request
import urllib.error
import json
import time

async def test_active_restore_and_tabs():
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

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # 2. Check active restore endpoint when idle
    print("Checking active restore status when idle...")
    req_active = urllib.request.Request("http://localhost:8000/api/admin/backups/restore/active", headers=headers)
    try:
        with urllib.request.urlopen(req_active) as res:
            active_info = json.loads(res.read().decode())
            print(f"Idle active status: {active_info}")
            assert active_info["active"] is False, "Active restore should be false when idle"
    except Exception as e:
        print(f"Failed to check active restore: {e}")
        return

    # 3. Get backup filename
    req_files = urllib.request.Request("http://localhost:8000/api/admin/backups/files", headers=headers)
    try:
        with urllib.request.urlopen(req_files) as res:
            files = json.loads(res.read().decode())
            if not files:
                print("No remote backup files found.")
                return
            target_filename = files[0]["filename"]
    except Exception as e:
        print(f"Failed to fetch files: {e}")
        return

    # 4. Trigger Restore API
    print(f"\nTriggering restore for: {target_filename}")
    restore_url = f"http://localhost:8000/api/admin/backups/restore?filename={urllib.parse.quote(target_filename)}"
    req_restore = urllib.request.Request(restore_url, method="POST", headers=headers)
    try:
        with urllib.request.urlopen(req_restore) as res:
            body = json.loads(res.read().decode())
            print(f"Trigger response: {body['message']}")
    except Exception as e:
        print(f"Restore trigger failed: {e}")
        return

    # 5. Check active restore endpoint immediately after trigger
    print("Checking active restore status right after triggering...")
    try:
        with urllib.request.urlopen(req_active) as res:
            active_info = json.loads(res.read().decode())
            print(f"Active status: {active_info}")
            assert active_info["active"] is True, "Active restore should be true while running"
            assert active_info["filename"] == target_filename, "Active filename should match"
    except Exception as e:
        print(f"Active check failed: {e}")

    # 6. Wait for restore completion
    print("\nWaiting for restore task to complete...")
    status_url = f"http://localhost:8000/api/admin/backups/restore/status?filename={urllib.parse.quote(target_filename)}"
    while True:
        req_status = urllib.request.Request(status_url, headers=headers)
        try:
            with urllib.request.urlopen(req_status) as res:
                data = json.loads(res.read().decode())
                status = data.get("status", "running")
                if status in ("success", "failed"):
                    print(f"Restore finished with status: {status.upper()}")
                    break
        except Exception as e:
            print(f"Status poll failed: {e}")
        await asyncio.sleep(2)

    # 7. Check active restore after completion
    print("\nChecking active restore status after completion...")
    try:
        with urllib.request.urlopen(req_active) as res:
            active_info = json.loads(res.read().decode())
            print(f"Post-completion active status: {active_info}")
            assert active_info["active"] is False, "Active restore should be false after completion"
    except Exception as e:
        print(f"Active check failed: {e}")

    # 8. Check restore logs via API
    print("\nFetching restore logs via GET /backups/logs?log_type=restore...")
    logs_url = "http://localhost:8000/api/admin/backups/logs?log_type=restore&page=1&limit=5"
    req_logs = urllib.request.Request(logs_url, headers=headers)
    try:
        with urllib.request.urlopen(req_logs) as res:
            logs = json.loads(res.read().decode())
            print(f"Fetched {len(logs)} restore logs:")
            for log in logs:
                print(f" - Log ID: {log['id']}, File: {log['filename']}, Status: {log['status']}, Msg: {log['message']}")
    except Exception as e:
        print(f"Logs check failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_active_restore_and_tabs())
