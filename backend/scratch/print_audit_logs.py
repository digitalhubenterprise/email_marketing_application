from app.db.session import AsyncSessionLocal
from app.db.models import AdminAuditLog
from sqlalchemy import select
import asyncio

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(AdminAuditLog).order_by(AdminAuditLog.created_at.desc()).limit(30))
        logs = res.scalars().all()
        for log in logs:
            print(f"ID: {log.id} | Email: {log.admin_email} | Action: {log.action_type} | Target: {log.target_entity} | Details: {log.details} | Created: {log.created_at}")

if __name__ == "__main__":
    asyncio.run(main())
