import asyncio
import urllib.request
import json

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

    # Fetch files list from the API
    print("Calling /api/admin/backups/files...")
    req = urllib.request.Request("http://localhost:8000/api/admin/backups/files", headers=headers)
    try:
        with urllib.request.urlopen(req) as res:
            files = json.loads(res.read().decode())
            print(f"API Call Succeeded! Returned files count: {len(files)}")
            for f in files:
                print(f" - {f['filename']} ({f['size_bytes']} bytes)")
    except Exception as e:
        print(f"API Call failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
