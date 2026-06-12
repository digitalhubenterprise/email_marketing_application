import asyncio
from celery import Celery
from app.core.config import settings

# Initialize Celery app instance
celery = Celery(
    "smartcampaign_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

def run_async(coro):
    """Runs a coroutine synchronously, handles cases where an event loop is already running."""
    try:
        return asyncio.run(coro)
    except RuntimeError:
        # Loop is already running (e.g. in tests/uvicorn); close the coroutine to prevent warnings
        coro.close()
