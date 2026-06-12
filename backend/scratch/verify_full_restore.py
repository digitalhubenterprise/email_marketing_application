import asyncio
import os
import sys

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import AsyncSessionLocal, engine
from app.db.models import RemoteBackupLog, User
from app.tasks.backup_tasks import execute_remote_restore
from sqlalchemy import select

async def run_full_restore_verification():
    print("Initializing Full Website Restore System Verification...")
    
    # 1. Get the latest successful full backup filename from logs
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(RemoteBackupLog)
            .where(RemoteBackupLog.status == "success")
            .where(RemoteBackupLog.filename.like("%_full_%"))
            .order_by(RemoteBackupLog.created_at.desc())
            .limit(1)
        )
        log = res.scalars().first()
        if not log:
            print("ERROR: No successful remote full website backup log found to restore from.")
            await engine.dispose()
            return
        
        filename = log.filename
        print(f"Found latest successful full backup file: {filename}")

    # 2. Trigger remote restore (downloads zip, enters maintenance mode, drops schema, restores files and DB)
    print(f"\nTriggering Full Remote Restore of file: {filename} ...")
    try:
        msg = await execute_remote_restore(filename=filename, config_id=1)
        print(f"SUCCESS: {msg}")
    except Exception as e:
        print(f"CRITICAL ERROR during restore execution: {e}")
        await engine.dispose()
        return

    # 3. Verify database tables and schema are back and healthy
    print("\nVerifying database health after restore...")
    try:
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(User).limit(5))
            users = res.scalars().all()
            print(f"Database contains {len(users)} users. Verification check passed!")
            for user in users:
                print(f" - User: {user.email} (Tier: {user.subscription_tier})")
    except Exception as e:
        print(f"ERROR: Database verification failed after restore: {e}")

    # 4. Verify .env configuration was restored
    target_env = "/project_root/.env" if os.path.isdir("/project_root") else "/app/.env"
    print(f"\nVerifying .env file at {target_env}...")
    if os.path.exists(target_env):
        print("SUCCESS: .env file exists.")
        with open(target_env, "r") as f:
            content = f.read()
            print(" - env keys found:")
            for line in content.splitlines():
                if "=" in line and not line.startswith("#"):
                    print(f"   * {line.split('=')[0]}")
    else:
        print("ERROR: .env file was not found after restore.")

    await engine.dispose()
    print("\nFull Restore Verification Completed.")

if __name__ == "__main__":
    asyncio.run(run_full_restore_verification())
