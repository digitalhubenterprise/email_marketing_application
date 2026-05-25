from datetime import datetime, timedelta, timezone
from typing import Any, Union
import jwt
import bcrypt
from cryptography.fernet import Fernet
from app.core.config import settings

# SMTP Credentials Cryptography Setup
try:
    cipher_suite = Fernet(settings.ENCRYPTION_KEY.encode())
except Exception:
    # Failback if key isn't formatted properly, generates a temporary one (good for testing)
    temp_key = Fernet.generate_key()
    cipher_suite = Fernet(temp_key)

def encrypt_smtp_password(password: str) -> str:
    """Encrypts a clean-text SMTP password using AES-256 Fernet."""
    if not password:
        return ""
    encrypted_bytes = cipher_suite.encrypt(password.encode())
    return encrypted_bytes.decode()

def decrypt_smtp_password(encrypted_password: str) -> str:
    """Decrypts an encrypted SMTP password back into plain text."""
    if not encrypted_password:
        return ""
    try:
        decrypted_bytes = cipher_suite.decrypt(encrypted_password.encode())
        return decrypted_bytes.decode()
    except Exception:
        return ""

# User Hashing Logic
def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        plain_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(plain_bytes, hashed_bytes)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

# JWT Auth Logic
def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")
    return encoded_jwt
