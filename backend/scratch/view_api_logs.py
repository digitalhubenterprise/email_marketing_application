import asyncio
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models import DhruApiLog

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(DhruApiLog).order_by(DhruApiLog.id.desc()).limit(20))
        logs = res.scalars().all()
        print(f"=== LATEST {len(logs)} DHRU API LOGS ===")
        for log in logs:
            print(f"[{log.created_at}] Action: {log.action} | User: {log.username} | IP: {log.ip_address} | Status: {log.status}")
            print(f"Msg: {log.message}")
            print("-" * 60)

if __name__ == "__main__":
    asyncio.run(main())
