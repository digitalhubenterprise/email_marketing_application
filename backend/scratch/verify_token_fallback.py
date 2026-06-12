import asyncio
import urllib.request
import urllib.error
import json
import time

async def test_bearer_fallback():
    # 1. Get auth credentials
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
        # Create a fresh, valid token for the cookie
        valid_token = create_access_token(subject=str(admin.id), role="admin", password_hash=admin.hashed_password)

    # 2. Create an expired token (issued in the past, expired)
    # We will generate a token with a very small/negative expiry offset
    import jwt
    from app.core.config import settings
    expired_payload = {
        "sub": str(admin.id),
        "role": "admin",
        "exp": int(time.time()) - 3600, # Expired 1 hour ago
        "iat": int(time.time()) - 7200,
        "iss": "smartcampaign-api",
        "pws": "dummy"
    }
    expired_token = jwt.encode(expired_payload, settings.JWT_SECRET, algorithm="HS256")

    # We will send the expired token in the header and the valid token in the cookie
    headers = {
        "Authorization": f"Bearer {expired_token}",
        "Cookie": f"admin_token={valid_token}",
        "Content-Type": "application/json"
    }

    url = "http://localhost:8000/api/admin/backups/restore/active"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as res:
            body = json.loads(res.read().decode())
            print(f"Fallback check response code: 200 | Body: {body}")
            print("SUCCESS! The system successfully prioritized the valid cookie token over the expired header token!")
    except urllib.error.HTTPError as e:
        print(f"FAILED with HTTP status code: {e.code}")
        print(e.read().decode())
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(test_bearer_fallback())
