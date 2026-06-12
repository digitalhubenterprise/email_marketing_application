from app.db.session import AsyncSessionLocal
from app.db.models import RemoteBackupConfig
from app.core.security import decrypt_smtp_password
from sqlalchemy import select
import asyncio

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(RemoteBackupConfig))
        configs = res.scalars().all()
        for config in configs:
            print(f"ID: {config.id}")
            print(f"Provider: {config.provider}")
            print(f"FTP Host: {config.ftp_host}")
            print(f"FTP Port: {config.ftp_port}")
            print(f"FTP User: {config.ftp_username}")
            decrypted = decrypt_smtp_password(config.ftp_password) if config.ftp_password else None
            print(f"FTP Password (encrypted): {config.ftp_password}")
            print(f"FTP Password (decrypted): {decrypted}")
            print(f"FTP Path: {config.ftp_path}")
            print(f"FTP Secure: {config.ftp_secure}")
            print(f"S3 Endpoint: {config.s3_endpoint}")
            print(f"S3 Bucket: {config.s3_bucket}")

if __name__ == "__main__":
    asyncio.run(main())
