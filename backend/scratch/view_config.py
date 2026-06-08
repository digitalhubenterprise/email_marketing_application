import asyncio
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import AsyncSessionLocal
from app.db.models import SubscriptionPlan
from sqlalchemy.future import select

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(SubscriptionPlan))
        plans = res.scalars().all()
        print("=== Subscription Plans ===")
        for p in plans:
            print(f"id: {p.id}, name: {p.name}, tier: {p.tier}, price: {p.price}, quota: {p.quota}")

if __name__ == "__main__":
    asyncio.run(main())
