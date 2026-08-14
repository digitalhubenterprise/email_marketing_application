import os
import re
import zipfile
import tempfile
import subprocess
import ftplib
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse
import boto3
from botocore.client import Config
from sqlalchemy import select, update, text

from app.core.config import settings
from app.db.session import AsyncSessionLocal, engine
from app.db.models import RemoteBackupConfig, RemoteBackupLog, SystemConfig, Base
from app.core.security import decrypt_smtp_password
from app.core.celery_app import celery, run_async

def parse_database_url():
    """Parses DATABASE_URL into dictionary of connection details suitable for pg_dump/psql.
    Uses a robust custom parser to handle passwords with special characters (@, :) and prevent ValueErrors.
    """
    db_url = settings.DATABASE_URL
    
    # Strip scheme prefix
    for prefix in ["postgresql+asyncpg://", "postgresql://", "postgres://"]:
        if db_url.startswith(prefix):
            db_url = db_url[len(prefix):]
            break
            
    # Default values
    user = "postgres"
    password = ""
    host = "localhost"
    port = 5432
    database = "smartcampaign"
    
    # Split userinfo and hostinfo using the right-most '@'
    if "@" in db_url:
        userinfo, hostinfo = db_url.rsplit("@", 1)
        
        # Parse userinfo (split by first ':')
        if ":" in userinfo:
            user, password = userinfo.split(":", 1)
        else:
            user = userinfo
            
        # Parse hostinfo (format: host:port/database or host/database)
        if "/" in hostinfo:
            host_port, database = hostinfo.split("/", 1)
            database = database.lstrip("/")
        else:
            host_port = hostinfo
            database = ""
            
        # Parse host and port (split by right-most ':')
        if ":" in host_port:
            host, port_str = host_port.rsplit(":", 1)
            try:
                port = int(port_str)
            except ValueError:
                port = 5432
        else:
            host = host_port
    else:
        # No '@' present, parse as userinfo or hostinfo
        if "/" in db_url:
            host_port, database = db_url.split("/", 1)
            database = database.lstrip("/")
            if ":" in host_port:
                host, port_str = host_port.rsplit(":", 1)
                try:
                    port = int(port_str)
                except ValueError:
                    port = 5432
            else:
                host = host_port
        else:
            if ":" in db_url:
                user, password = db_url.split(":", 1)
            else:
                user = db_url

    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "database": database
    }

async def execute_remote_backup(config_id: int = 1, full_site: bool = False) -> str:
    """
    Main backup orchestrator.
    Creates a PostgreSQL database dump and bundles server settings snapshots into a zip archive,
    uploads it to S3 or FTP, and safely cleans up old remote backups if successful.
    """
    await engine.dispose()
    try:
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(RemoteBackupConfig).where(RemoteBackupConfig.id == config_id))
            config = res.scalars().first()
            if not config:
                raise ValueError("Remote backup configuration not found.")
            
            # Capture current config state to log success/failure
            provider = config.provider
            is_ftp = provider == "ftp"

        # 1. Create temporary working folder
        with tempfile.TemporaryDirectory() as temp_dir:
            prefix = "smartcampaign_backup_full_" if full_site else "smartcampaign_backup_"
            zip_filename = f"{prefix}{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
            zip_path = os.path.join(temp_dir, zip_filename)
            sql_path = os.path.join(temp_dir, "smartcampaign_db.sql")
            env_path = os.path.join(temp_dir, ".env")
            
            # 2. Database plain SQL dump using pg_dump
            db_details = parse_database_url()
            pg_cmd = [
                "pg_dump",
                "-h", db_details["host"],
                "-p", str(db_details["port"]),
                "-U", db_details["user"],
                "-d", db_details["database"],
                "-F", "p",  # Plain text SQL commands
                "-b",       # Include large objects (lo_compat)
                "-f", sql_path
            ]
            
            try:
                # Execute subprocess dump
                result = subprocess.run(
                    pg_cmd,
                    env={"PGPASSWORD": db_details["password"]},
                    capture_output=True,
                    text=True,
                    check=True
                )
            except subprocess.CalledProcessError as err:
                error_msg = f"Database dump execution failed (pg_dump): {err.stderr or str(err)}"
                await log_backup_run(zip_filename, "failed", 0, error_msg)
                raise RuntimeError(error_msg)
            except FileNotFoundError:
                error_msg = "Database dump execution failed: 'pg_dump' utility executable is not installed or not in system PATH."
                await log_backup_run(zip_filename, "failed", 0, error_msg)
                raise RuntimeError(error_msg)
            except Exception as err:
                error_msg = f"Database dump failed: {str(err)}"
                await log_backup_run(zip_filename, "failed", 0, error_msg)
                raise RuntimeError(error_msg)

            # 3. Create active .env parameters file snapshot
            try:
                with open(env_path, "w") as fp:
                    fp.write("# SmartCampaign Backup Environment Settings Snapshot\n")
                    fp.write(f"# Timestamp: {datetime.now(timezone.utc).isoformat()}\n\n")
                    keys_to_store = [
                        "TRACKING_BASE_URL", "ENVIRONMENT", "TZ"
                    ]
                    for key in keys_to_store:
                        val = os.getenv(key, getattr(settings, key, ""))
                        fp.write(f"{key}={val}\n")
            except Exception as err:
                error_msg = f"Failed to build env configurations snapshot: {str(err)}"
                await log_backup_run(zip_filename, "failed", 0, error_msg)
                raise RuntimeError(error_msg)

            # 4. Zip SQL dump, env file, and code if full_site is enabled
            try:
                with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
                    zipf.write(sql_path, "smartcampaign_db.sql")
                    zipf.write(env_path, ".env")
                    
                    if full_site:
                        source_root = "/project_root" if os.path.isdir("/project_root") else "/app"
                        exclude_dirs = { "node_modules", "venv", ".venv", "__pycache__", ".git", ".pytest_cache", "pgdata", "dist", "build" }
                        for root, dirs, files in os.walk(source_root):
                            # Skip excluded directories in-place
                            dirs[:] = [d for d in dirs if d not in exclude_dirs]
                            for file in files:
                                # Skip zip files and existing backups
                                if file.endswith(".zip") or file.startswith("smartcampaign_backup_"):
                                    continue
                                file_path = os.path.join(root, file)
                                # Store with a relative path inside the zip file's "code" folder
                                rel_path = os.path.relpath(file_path, source_root)
                                archive_name = os.path.join("code", rel_path)
                                zipf.write(file_path, archive_name)
                                
                size_bytes = os.path.getsize(zip_path)
            except Exception as err:
                error_msg = f"Failed to package backup zip archive: {str(err)}"
                await log_backup_run(zip_filename, "failed", 0, error_msg)
                raise RuntimeError(error_msg)

            # 5. Remote Upload based on provider
            try:
                if is_ftp:
                    await upload_ftp(config, zip_path, zip_filename)
                else:
                    await upload_s3(config, zip_path, zip_filename)
            except Exception as err:
                error_msg = f"Remote upload failed to {provider.upper()}: {str(err)}"
                await log_backup_run(zip_filename, "failed", size_bytes, error_msg)
                raise RuntimeError(error_msg)

            # 6. Safety Retention Policy Cleanup (Only after verified successful upload)
            cleanup_msg = ""
            try:
                if is_ftp:
                    cleanup_msg = await cleanup_old_backups_ftp(config, zip_filename)
                else:
                    cleanup_msg = await cleanup_old_backups_s3(config, zip_filename)
            except Exception as err:
                cleanup_msg = f"Backup upload succeeded, but retention cleanup had issues: {str(err)}"

            success_msg = f"Backup successfully uploaded to remote {provider.upper()} storage. {cleanup_msg}".strip()
            await log_backup_run(zip_filename, "success", size_bytes, success_msg)
            return success_msg
    finally:
        await engine.dispose()

async def upload_s3(config: RemoteBackupConfig, zip_path: str, zip_filename: str):
    """Handles file uploads to S3-compatible cloud storage."""
    if not config.s3_endpoint or not config.s3_bucket or not config.s3_access_key:
        raise ValueError("S3 configuration is incomplete. Please set Endpoint API URL, Bucket, and Access Key in storage settings.")
    
    s3_secret = decrypt_smtp_password(config.s3_secret_key) if config.s3_secret_key else ""
    s3 = boto3.client(
        "s3",
        endpoint_url=config.s3_endpoint,
        aws_access_key_id=config.s3_access_key,
        aws_secret_access_key=s3_secret,
        region_name=config.s3_region or None,
        config=Config(signature_version="s3v4")
    )
    folder = (config.s3_folder or "backups").strip().strip("/")
    target_key = f"{folder}/{zip_filename}" if folder else zip_filename
    s3.upload_file(zip_path, config.s3_bucket, target_key)

async def upload_ftp(config: RemoteBackupConfig, zip_path: str, zip_filename: str):
    """Handles file uploads to FTP/FTPS servers."""
    if not config.ftp_host or not config.ftp_username:
        raise ValueError("FTP configuration is incomplete. Please set FTP Host IP and FTP Username in storage settings.")
        
    ftp_pass = decrypt_smtp_password(config.ftp_password) if config.ftp_password else ""
    ftp_class = ftplib.FTP_TLS if config.ftp_secure else ftplib.FTP
    
    ftp = ftp_class()
    ftp.connect(config.ftp_host, config.ftp_port or 21, timeout=30)
    if config.ftp_secure:
        ftp.auth()
    ftp.login(config.ftp_username, ftp_pass)
    if config.ftp_secure:
        ftp.prot_p()

    # Change to target directory, create subdirectories if not present
    target_path = (config.ftp_path or "/").strip()
    if target_path and target_path != "/":
        parts = [p for p in target_path.split("/") if p]
        ftp.cwd("/")
        for part in parts:
            try:
                ftp.cwd(part)
            except Exception:
                ftp.mkd(part)
                ftp.cwd(part)

    with open(zip_path, "rb") as fp:
        ftp.storbinary(f"STOR {zip_filename}", fp)
    ftp.quit()

async def cleanup_old_backups_s3(config: RemoteBackupConfig, keep_filename: str) -> str:
    """Lists files on S3 and deletes backups older than the newly created one (retains configurable count of the same type)."""
    s3_secret = decrypt_smtp_password(config.s3_secret_key) if config.s3_secret_key else ""
    s3 = boto3.client(
        "s3",
        endpoint_url=config.s3_endpoint,
        aws_access_key_id=config.s3_access_key,
        aws_secret_access_key=s3_secret,
        region_name=config.s3_region or None,
        config=Config(signature_version="s3v4")
    )
    folder = (config.s3_folder or "backups").strip().strip("/")
    prefix = f"{folder}/" if folder else ""
    
    objects = s3.list_objects_v2(Bucket=config.s3_bucket, Prefix=prefix)
    deleted_count = 0
    if "Contents" in objects:
        is_full = keep_filename.startswith("smartcampaign_backup_full_")
        
        filtered_files = []
        for obj in objects["Contents"]:
            key = obj["Key"]
            basename = key.split("/")[-1] if "/" in key else key
            if basename.endswith(".zip"):
                if is_full:
                    if basename.startswith("smartcampaign_backup_full_"):
                        filtered_files.append(obj)
                else:
                    if basename.startswith("smartcampaign_backup_") and not basename.startswith("smartcampaign_backup_full_"):
                        filtered_files.append(obj)
                        
        files = sorted(filtered_files, key=lambda x: x["LastModified"])
        # Retain only the most recent successful backups of this type, delete older ones
        retention_limit = getattr(config, "retention_count", 5) or 5
        if len(files) > retention_limit:
            for f in files[:-retention_limit]:
                s3.delete_object(Bucket=config.s3_bucket, Key=f["Key"])
                deleted_count += 1
    return f"Retention cleanup: deleted {deleted_count} older backups." if deleted_count > 0 else ""

async def cleanup_old_backups_ftp(config: RemoteBackupConfig, keep_filename: str) -> str:
    """Lists files on FTP and deletes backups older than the newly created one (retains configurable count of the same type)."""
    ftp_pass = decrypt_smtp_password(config.ftp_password) if config.ftp_password else ""
    ftp_class = ftplib.FTP_TLS if config.ftp_secure else ftplib.FTP
    
    ftp = ftp_class()
    ftp.connect(config.ftp_host, config.ftp_port or 21, timeout=30)
    if config.ftp_secure:
        ftp.auth()
    ftp.login(config.ftp_username, ftp_pass)
    if config.ftp_secure:
        ftp.prot_p()

    # Go to directory
    target_path = (config.ftp_path or "/").strip()
    if target_path and target_path != "/":
        ftp.cwd(target_path)

    # Get file list and filter/sort
    ftp_files = ftp.nlst()
    
    is_full = keep_filename.startswith("smartcampaign_backup_full_")
    
    backup_files = []
    for f in ftp_files:
        basename = os.path.basename(f)
        if basename.endswith(".zip"):
            if is_full:
                if basename.startswith("smartcampaign_backup_full_"):
                    backup_files.append(f)
            else:
                if basename.startswith("smartcampaign_backup_") and not basename.startswith("smartcampaign_backup_full_"):
                    backup_files.append(f)
    
    # Sort chronologically by timestamp in filename (YYYYMMDD_HHMMSS)
    def get_timestamp(filename: str):
        match = re.search(r"(\d{8}_\d{6})", os.path.basename(filename))
        return match.group(1) if match else ""
    backup_files.sort(key=get_timestamp)
    
    deleted_count = 0
    retention_limit = getattr(config, "retention_count", 5) or 5
    if len(backup_files) > retention_limit:
        for f in backup_files[:-retention_limit]:
            try:
                ftp.delete(f)
                deleted_count += 1
            except Exception:
                pass
    ftp.quit()
    return f"Retention cleanup: deleted {deleted_count} older backups." if deleted_count > 0 else ""

async def log_backup_run(filename: str, status: str, size_bytes: int, message: str):
    """Inserts a run record into remote_backup_logs."""
    async with AsyncSessionLocal() as db:
        log_entry = RemoteBackupLog(
            filename=filename,
            status=status,
            size_bytes=size_bytes,
            message=message
        )
        db.add(log_entry)
        
        # Update schedule next run timestamps if success
        if status == "success":
            res = await db.execute(select(RemoteBackupConfig).where(RemoteBackupConfig.id == 1))
            config = res.scalars().first()
            if config:
                config.last_run = datetime.now(timezone.utc).replace(tzinfo=None)
                config.next_run = config.last_run + timedelta(days=config.schedule_days)
                db.add(config)
                
        await db.commit()

async def execute_remote_restore(filename: str, config_id: int = 1) -> str:
    """
    Downloads backup file, activates maintenance overlay mode, drops DB public schema,
    restores database schemas/records via psql, and lifts maintenance mode.
    """
    import re
    if not re.match(r"^smartcampaign_backup_(?:full_)?\d{8}_\d{6}\.zip$", filename):
        raise ValueError("Invalid backup filename format.")
        
    import redis
    import json
    
    def log_restore_progress(status: str, message: str):
        try:
            r = redis.from_url(settings.REDIS_URL, decode_responses=True)
            key = f"restore_status:{filename}"
            existing = r.get(key)
            if existing:
                data = json.loads(existing)
            else:
                data = {"status": "running", "logs": []}
            data["status"] = status
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            data["logs"].append(f"[{timestamp}] {message}")
            r.set(key, json.dumps(data), ex=3600)
        except Exception:
            pass

    log_restore_progress("running", "Initializing remote restoration process...")
    await engine.dispose()
    
    async with AsyncSessionLocal() as db:
        # 1. Enable Maintenance Mode to block standard dashboard reads/writes
        await db.execute(update(SystemConfig).where(SystemConfig.id == 1).values(maintenance_mode=True))
        await db.commit()
        
        res = await db.execute(select(RemoteBackupConfig).where(RemoteBackupConfig.id == config_id))
        config = res.scalars().first()
        if not config:
            log_restore_progress("failed", "Configuration error: backup config not found.")
            raise ValueError("Remote backup configuration not found.")
        
        provider = config.provider
        is_ftp = provider == "ftp"

    # 2. Download ZIP
    log_restore_progress("running", f"Downloading backup zip from remote {provider.upper()} storage...")
    with tempfile.TemporaryDirectory() as temp_dir:
        local_zip = os.path.join(temp_dir, "restore.zip")
        sql_path = os.path.join(temp_dir, "smartcampaign_db.sql")
        
        try:
            if is_ftp:
                await download_ftp(config, filename, local_zip)
            else:
                await download_s3(config, filename, local_zip)
            log_restore_progress("running", "Backup zip archive downloaded successfully.")
        except Exception as err:
            # Restore normal site status on failure
            log_restore_progress("failed", f"Download failed: {str(err)}")
            async with AsyncSessionLocal() as db:
                await db.execute(update(SystemConfig).where(SystemConfig.id == 1).values(maintenance_mode=False))
                await db.commit()
            raise RuntimeError(f"Failed to download archive for restore: {str(err)}")

        # 3. Unzip SQL script, .env, and optional code
        log_restore_progress("running", "Extracting files from archive...")
        try:
            import shutil
            with zipfile.ZipFile(local_zip, "r") as zipf:
                # Always extract database dump
                zipf.extract("smartcampaign_db.sql", temp_dir)
                
                # Check for and restore .env snapshot
                if ".env" in zipf.namelist():
                    zipf.extract(".env", temp_dir)
                    # Attempt to write to both /project_root/.env and /app/.env
                    for target_path in ["/project_root/.env", "/app/.env"]:
                        try:
                            parent_dir = os.path.dirname(target_path)
                            if os.path.isdir(parent_dir):
                                shutil.copy(os.path.join(temp_dir, ".env"), target_path)
                        except Exception as e:
                            print(f"Non-critical: Failed to write env config to {target_path}: {e}")
                
                # Check for and restore full site code
                # Determine best writable directory for code
                target_root = "/app"
                if os.path.isdir("/project_root") and os.access("/project_root", os.W_OK):
                    target_root = "/project_root"
                
                resolved_target = os.path.abspath(target_root)
                for name in zipf.namelist():
                    if name.startswith("code/"):
                        rel_path = name.replace("code/", "", 1)
                        if rel_path:
                            dest_path = os.path.abspath(os.path.join(target_root, rel_path))
                            # Zip Slip Guard: Ensure destination path is strictly within target_root
                            if not dest_path.startswith(resolved_target + os.path.sep) and dest_path != resolved_target:
                                raise ValueError(f"Security Warning: Path traversal attempt detected in archive file: {name}")
                            try:
                                os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                                with zipf.open(name) as source, open(dest_path, "wb") as target:
                                    shutil.copyfileobj(source, target)
                            except Exception as e:
                                print(f"Non-critical: Failed to write file {rel_path} to {target_root}: {e}")
            log_restore_progress("running", "Archive extracted successfully.")
        except Exception as err:
            log_restore_progress("failed", f"Archive extraction error: {str(err)}")
            async with AsyncSessionLocal() as db:
                await db.execute(update(SystemConfig).where(SystemConfig.id == 1).values(maintenance_mode=False))
                await db.commit()
            raise RuntimeError(f"Invalid backup zip archive formatting or extraction error: {str(err)}")

        # 4. DB Clean Drop and Load Restore
        log_restore_progress("running", "Clearing database schema and applying backup SQL dump...")
        try:
            db_details = parse_database_url()
            # Clean public schema first (Cascades all tables, views, triggers)
            async with engine.begin() as conn:
                await conn.execute(text("DROP SCHEMA public CASCADE;"))
                await conn.execute(text("CREATE SCHEMA public;"))
                await conn.execute(text(f'GRANT ALL ON SCHEMA public TO "{db_details["user"]}";'))
                await conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
            
            # Load SQL dump using psql client
            psql_cmd = [
                "psql",
                "-h", db_details["host"],
                "-p", str(db_details["port"]),
                "-U", db_details["user"],
                "-d", db_details["database"],
                "-f", sql_path
            ]
            
            # Execute restore command
            result = subprocess.run(
                psql_cmd,
                env={"PGPASSWORD": db_details["password"]},
                capture_output=True,
                text=True,
                check=True
            )
            log_restore_progress("running", "Database SQL dump imported successfully.")
        except Exception as err:
            # Try to restore public schema and structure to prevent bricking the host
            log_restore_progress("failed", f"Database schema restoration failed: {str(err)}")
            try:
                async with engine.begin() as conn:
                    await conn.run_sync(Base.metadata.create_all)
            except Exception:
                pass
            
            # Disable maintenance so admin can debug
            async with AsyncSessionLocal() as db:
                await db.execute(update(SystemConfig).where(SystemConfig.id == 1).values(maintenance_mode=False))
                await db.commit()
            raise RuntimeError(f"Critical error during database schema restoration: {str(err)}")

        # 5. Lift maintenance mode and add success log to DB
        async with AsyncSessionLocal() as db:
            await db.execute(update(SystemConfig).where(SystemConfig.id == 1).values(maintenance_mode=False))
            db.add(RemoteBackupLog(
                filename=f"[RESTORE] {filename}",
                status="success",
                size_bytes=0,
                message="Full database and website snapshot restored successfully."
            ))
            await db.commit()
            
    await engine.dispose()
    log_restore_progress("success", "Full database and website snapshot restored successfully.")
    return "Full database snapshot restoration completed successfully."

async def download_s3(config: RemoteBackupConfig, filename: str, local_path: str):
    """Downloads archive file from S3."""
    s3_secret = decrypt_smtp_password(config.s3_secret_key) if config.s3_secret_key else ""
    s3 = boto3.client(
        "s3",
        endpoint_url=config.s3_endpoint,
        aws_access_key_id=config.s3_access_key,
        aws_secret_access_key=s3_secret,
        region_name=config.s3_region or None,
        config=Config(signature_version="s3v4")
    )
    folder = (config.s3_folder or "backups").strip().strip("/")
    target_key = f"{folder}/{filename}" if folder else filename
    s3.download_file(config.s3_bucket, target_key, local_path)

async def download_ftp(config: RemoteBackupConfig, filename: str, local_path: str):
    """Downloads archive file from FTP/FTPS."""
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
        ftp.cwd(target_path)

    with open(local_path, "wb") as fp:
        ftp.retrbinary(f"RETR {filename}", fp.write)
    ftp.quit()

async def async_check_scheduled_backups() -> None:
    """Invoked periodically by Celery Beat. Triggers a backup if scheduled next_run time is reached."""
    await engine.dispose()
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(RemoteBackupConfig).where(RemoteBackupConfig.id == 1, RemoteBackupConfig.is_active == True))
        config = res.scalars().first()
        if not config:
            return
        
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        if config.next_run is None or now >= config.next_run:
            # Set next run temporarily to prevent multiple triggers in close intervals
            config.next_run = now + timedelta(hours=1)
            await db.commit()
            
            # Fire backup task
            run_remote_backup_task.delay()
    await engine.dispose()


# ─── Celery Task Wrappers ──────────────────────────────────────────

@celery.task(name="app.tasks.backup_tasks.run_remote_backup_task")
def run_remote_backup_task(full_site: bool = False) -> str:
    """Celery task to execute remote backup asynchronously."""
    try:
        msg = run_async(execute_remote_backup(full_site=full_site))
        return msg
    except Exception as exc:
        print(f"Celery remote backup task failed: {exc}")
        raise

@celery.task(name="app.tasks.backup_tasks.run_remote_restore_task")
def run_remote_restore_task(filename: str) -> str:
    """Celery task to restore database snapshot from S3/FTP file."""
    import redis
    r = redis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        msg = run_async(execute_remote_restore(filename))
        r.delete("active_restore_filename")
        return msg
    except Exception as exc:
        r.delete("active_restore_filename")
        print(f"Celery remote restore task failed: {exc}")
        raise

@celery.task(name="app.tasks.backup_tasks.check_scheduled_backups_task")
def check_scheduled_backups_task() -> None:
    """Celery periodic beat wrapper to check scheduled backups."""
    try:
        run_async(async_check_scheduled_backups())
    except Exception as exc:
        print(f"Celery check scheduled backups task failed: {exc}")
