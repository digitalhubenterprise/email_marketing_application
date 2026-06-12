import asyncio
import os
import sys

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import AsyncSessionLocal, engine
from app.db.models import RemoteBackupLog, RemoteBackupConfig
from app.tasks.backup_tasks import execute_remote_restore
from sqlalchemy import select

async def run_restore_verification():
    print("Initializing Restore System Verification...")
    
    # 1. Find the latest backup filename from the logs
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(RemoteBackupLog)
            .where(RemoteBackupLog.status == "success")
            .order_by(RemoteBackupLog.created_at.desc())
            .limit(1)
        )
        log = res.scalars().first()
        if not log or not log.filename.endswith(".zip"):
            print("ERROR: No successful backup file found in logs to restore.")
            await engine.dispose()
            return
        
        filename = log.filename
        print(f"Target backup zip for restoration: {filename}")

    # 2. Execute restore
    print("\nExecuting Remote Restore Task...")
    try:
        msg = await execute_remote_restore(filename=filename, config_id=1)
        print(f"SUCCESS: {msg}")
    except Exception as e:
        print(f"CRITICAL ERROR during restore execution: {e}")
        await engine.dispose()
        return

    # 3. Check logs to see if restore log was created
    print("\nChecking Backup Logs for Restore Entry...")
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(RemoteBackupLog)
            .where(RemoteBackupLog.filename.like("%[RESTORE]%"))
            .order_by(RemoteBackupLog.created_at.desc())
            .limit(1)
        )
        log = res.scalars().first()
        if log:
            print(f"Restore log entry found:")
            print(f" - Filename: {log.filename}")
            print(f" - Status: {log.status}")
            print(f" - Message: {log.message}")
        else:
            print("ERROR: No restore log entry found.")

    await engine.dispose()
    print("\nRestore Verification Completed.")

if __name__ == "__main__":
    asyncio.run(run_restore_verification())
