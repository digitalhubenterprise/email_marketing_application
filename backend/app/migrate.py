"""One-shot database migration entry point for production deployments."""

import asyncio

from app.db.session import create_db_tables, engine


async def main() -> None:
    await create_db_tables()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
