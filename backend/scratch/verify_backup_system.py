import asyncio
import os
import sys

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import AsyncSessionLocal, engine
from app.db.models import RemoteBackupConfig, RemoteBackupLog
from app.tasks.backup_tasks import execute_remote_backup
from app.core.security import encrypt_smtp_password
from sqlalchemy import select, update

async def run_verification():
    print("Initializing Backup System Verification...")
    
    # 1. Update config seed with user FTP credentials
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(RemoteBackupConfig).where(RemoteBackupConfig.id == 1))
        config = res.scalars().first()
        if not config:
            print("ERROR: Seed configuration not found. Creating table and config...")
            # create_db_tables should have run, but let's make sure
            from app.db.session import create_db_tables
            await create_db_tables()
            res = await db.execute(select(RemoteBackupConfig).where(RemoteBackupConfig.id == 1))
            config = res.scalars().first()
            
        print(f"Current Config Provider: {config.provider}")
        
        # Configure user FTP settings for the test
        config.provider = "ftp"
        config.ftp_host = "67.211.221.230"
        config.ftp_port = 21
        config.ftp_username = "smartcampaign@st39582.ispot.cc"
        config.ftp_password = encrypt_smtp_password("FmGMEVP3RGzQtx9s56fj")
        config.ftp_path = "/Remote_Backups_SMartCampains"
        config.ftp_secure = True
        config.schedule_days = 3
        config.is_active = True
        
        db.add(config)
        await db.commit()
        print("Test FTP credentials saved to database config successfully.")

    # 2. Execute remote backup (triggers pg_dump, packaging, uploading, and older backups deletion)
    print("\nExecuting Remote Backup Task...")
    try:
        msg = await execute_remote_backup(config_id=1)
        print(f"SUCCESS: {msg}")
    except Exception as e:
        print(f"CRITICAL ERROR during backup execution: {e}")
        return

    # 3. Check logs
    print("\nChecking Backup Logs...")
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(RemoteBackupLog).order_by(RemoteBackupLog.created_at.desc()).limit(1))
        log = res.scalars().first()
        if log:
            print(f"Log entry found:")
            print(f" - Filename: {log.filename}")
            print(f" - Status: {log.status}")
            print(f" - Size: {log.size_bytes} bytes")
            print(f" - Message: {log.message}")
        else:
            print("ERROR: No backup log entry found.")

    await engine.dispose()
    print("\nVerification Completed.")

if __name__ == "__main__":
    asyncio.run(run_verification())
