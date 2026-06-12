import asyncio
import os
import sys
import ftplib
import re
from sqlalchemy import select

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import AsyncSessionLocal, engine
from app.db.models import RemoteBackupConfig
from app.tasks.backup_tasks import execute_remote_backup
from app.core.security import decrypt_smtp_password

async def clear_ftp_backups(config):
    print("Clearing FTP remote backup directory...")
    ftp_pass = decrypt_smtp_password(config.ftp_password) if config.ftp_password else ""
    ftp_class = ftplib.FTP_TLS if config.ftp_secure else ftplib.FTP
    
    ftp = ftp_class()
    ftp.connect(config.ftp_host, config.ftp_port or 21, timeout=30)
    if config.ftp_secure:
        ftp.auth()
    ftp.login(config.ftp_username, ftp_pass)
    if config.ftp_secure:
        ftp.prot_p()

    target_path = (config.ftp_path or "/").strip()
    if target_path and target_path != "/":
        try:
            ftp.cwd(target_path)
        except Exception:
            ftp.quit()
            return

    ftp_files = ftp.nlst()
    deleted_count = 0
    for f in ftp_files:
        basename = os.path.basename(f)
        if basename.endswith(".zip") and basename.startswith("smartcampaign_backup"):
            try:
                ftp.delete(f)
                deleted_count += 1
            except Exception as e:
                print(f"Failed to delete {f}: {e}")
    ftp.quit()
    print(f"Deleted {deleted_count} files.")

async def list_ftp_backups(config):
    ftp_pass = decrypt_smtp_password(config.ftp_password) if config.ftp_password else ""
    ftp_class = ftplib.FTP_TLS if config.ftp_secure else ftplib.FTP
    
    ftp = ftp_class()
    ftp.connect(config.ftp_host, config.ftp_port or 21, timeout=30)
    if config.ftp_secure:
        ftp.auth()
    ftp.login(config.ftp_username, ftp_pass)
    if config.ftp_secure:
        ftp.prot_p()

    target_path = (config.ftp_path or "/").strip()
    if target_path and target_path != "/":
        try:
            ftp.cwd(target_path)
        except Exception:
            ftp.quit()
            return []

    ftp_files = ftp.nlst()
    ftp.quit()
    return sorted([os.path.basename(f) for f in ftp_files if os.path.basename(f).endswith(".zip")])

async def run_verification():
    print("=== STARTING RETENTION VERIFICATION ===")
    
    # 1. Fetch remote config
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(RemoteBackupConfig).where(RemoteBackupConfig.id == 1))
        config = res.scalars().first()
        if not config:
            print("ERROR: Remote config with ID 1 not found.")
            return

        print(f"Loaded config: ID={config.id}, Provider={config.provider}, FTP Host={config.ftp_host}")
        
        # Clear existing remote files to start fresh
        await clear_ftp_backups(config)

        # Update retention count to 3
        print("Setting retention_count to 3 in database...")
        config.retention_count = 3
        db.add(config)
        await db.commit()

    # 2. Trigger 4 database-only backups sequentially
    print("\n--- Triggering 4 Database-Only Backups ---")
    for i in range(1, 5):
        print(f"Running database backup {i}/4...")
        msg = await execute_remote_backup(config_id=1, full_site=False)
        print(f"Result: {msg}")
        # brief sleep to ensure timestamp separation in filenames
        await asyncio.sleep(1)

    # Verify remote backups list
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(RemoteBackupConfig).where(RemoteBackupConfig.id == 1))
        config = res.scalars().first()
        
    db_backups = await list_ftp_backups(config)
    print("\nBackups currently on remote FTP:")
    for f in db_backups:
        print(f" - {f}")
        
    db_only = [f for f in db_backups if f.startswith("smartcampaign_backup_") and not f.startswith("smartcampaign_backup_full_")]
    print(f"Total database-only backups: {len(db_only)}")
    assert len(db_only) == 3, f"Expected exactly 3 database-only backups, found {len(db_only)}"
    print("SUCCESS: Database-only backup retention count is exactly 3!")

    # 3. Trigger 4 full backups sequentially
    print("\n--- Triggering 4 Full (Files + Database) Backups ---")
    for i in range(1, 5):
        print(f"Running full backup {i}/4...")
        msg = await execute_remote_backup(config_id=1, full_site=True)
        print(f"Result: {msg}")
        await asyncio.sleep(1)

    db_backups_after_full = await list_ftp_backups(config)
    print("\nBackups currently on remote FTP after full backups:")
    for f in db_backups_after_full:
        print(f" - {f}")

    db_only_final = [f for f in db_backups_after_full if f.startswith("smartcampaign_backup_") and not f.startswith("smartcampaign_backup_full_")]
    full_backups = [f for f in db_backups_after_full if f.startswith("smartcampaign_backup_full_")]

    print(f"Final database-only backups: {len(db_only_final)}")
    print(f"Final full backups: {len(full_backups)}")

    assert len(db_only_final) == 3, f"Expected 3 database-only backups, found {len(db_only_final)}"
    assert len(full_backups) == 3, f"Expected 3 full backups, found {len(full_backups)}"
    print("SUCCESS: Both backup types are separately capped at their retention count (3)!")

    # 4. Cleanup and restore retention count to 5
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(RemoteBackupConfig).where(RemoteBackupConfig.id == 1))
        config = res.scalars().first()
        config.retention_count = 5
        db.add(config)
        await db.commit()
    print("Restored retention_count to default of 5 in database.")
    
    await engine.dispose()
    print("\n=== RETENTION VERIFICATION COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    asyncio.run(run_verification())
