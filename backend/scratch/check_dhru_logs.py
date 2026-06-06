import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models import DhruApiLog

async def test():
    async with AsyncSessionLocal() as db:
        try:
            res = await db.execute(select(DhruApiLog).order_by(DhruApiLog.created_at.desc()).limit(10))
            for log in res.scalars():
                print(f"Action: {log.action} | IP: {log.ip_address} | Status: {log.status} | Msg: {log.message}")
        except Exception as e:
            print("Error querying database:", e)

asyncio.run(test())
