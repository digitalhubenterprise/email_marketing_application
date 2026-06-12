from app.db.session import AsyncSessionLocal
from app.db.models import RemoteBackupLog
from sqlalchemy import select
import asyncio

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(RemoteBackupLog).order_by(RemoteBackupLog.created_at.desc()).limit(10))
        logs = res.scalars().all()
        for log in logs:
            print(f"Log ID: {log.id}, Created At: {log.created_at}, File: {log.filename}, Status: {log.status}, Msg: {log.message}")

if __name__ == "__main__":
    asyncio.run(main())
