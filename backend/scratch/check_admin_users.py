import asyncio
import sys
import os
from sqlalchemy.future import select

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import AsyncSessionLocal
from app.db.models import AdminUser

async def check_admins():
    print("Checking admin users in database...")
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(AdminUser))
        admins = res.scalars().all()
        print(f"Total admin users: {len(admins)}")
        for admin in admins:
            print(f"- ID: {admin.id} | Email: {admin.email} | Active: {admin.is_active} | Role: {admin.role} | Hashed PW: {admin.hashed_password}")

if __name__ == "__main__":
    asyncio.run(check_admins())
