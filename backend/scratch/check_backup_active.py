from app.db.session import AsyncSessionLocal
from app.db.models import RemoteBackupConfig
from sqlalchemy import select
import asyncio

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(RemoteBackupConfig))
        config = res.scalars().first()
        if config:
            print(f"Provider: {config.provider}")
            print(f"Is Active: {config.is_active}")
            print(f"Last Run: {config.last_run}")
            print(f"Next Run: {config.next_run}")
            print(f"Schedule Days: {config.schedule_days}")

if __name__ == "__main__":
    asyncio.run(main())
