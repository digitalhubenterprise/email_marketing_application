from app.db.session import AsyncSessionLocal
from app.db.models import RemoteBackupLog
from sqlalchemy import select
import asyncio

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(RemoteBackupLog).order_by(RemoteBackupLog.created_at.desc()).limit(10))
        logs = res.scalars().all()
        for log in logs:
            print(f"ID: {log.id} | File: {log.filename} | Status: {log.status} | Size: {log.size_bytes} bytes | Message: {log.message} | Created: {log.created_at}")

if __name__ == "__main__":
    asyncio.run(main())
