import asyncio
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.db.models import User, AdminUser

# Connect using localhost port mapping
DATABASE_URL = "postgresql+asyncpg://postgres:password123@localhost:5432/smartcampaign"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

async def check():
    async with AsyncSessionLocal() as db:
        res_admins = await db.execute(select(AdminUser.email, AdminUser.role))
        admins = res_admins.all()
        print("--- ADMIN USERS ---")
        for a in admins:
            print(f"Email: {a[0]}, Role: {a[1]}")
            
        res_users = await db.execute(select(User.email))
        users = res_users.all()
        print("\n--- STANDARD USERS ---")
        for u in users:
            print(f"Email: {u[0]}")

if __name__ == "__main__":
    asyncio.run(check())
