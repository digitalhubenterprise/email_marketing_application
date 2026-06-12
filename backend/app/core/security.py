from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union
import re
import jwt
import bcrypt
# Removed HTMLParser import; bleach provides HTML sanitization
from cryptography.fernet import Fernet
import bleach  # Added bleach for HTML sanitization
from app.core.config import settings

# SMTP Credentials Cryptography Setup (AES-256 Fernet)
try:
    cipher_suite = Fernet(settings.ENCRYPTION_KEY.encode())
except Exception:
    # Failback: generate a temporary key (logs warning — must be fixed in production)
    import warnings
    warnings.warn(
        "ENCRYPTION_KEY is invalid or missing. Generated a temporary key — SMTP passwords will NOT be recoverable after restart!",
        RuntimeWarning
    )
    temp_key = Fernet.generate_key()
    cipher_suite = Fernet(temp_key)


def encrypt_smtp_password(password: str) -> str:
    """Encrypts a plaintext SMTP password using AES-256 Fernet symmetric encryption."""
    if not password:
        return ""
    encrypted_bytes = cipher_suite.encrypt(password.encode("utf-8"))
    return encrypted_bytes.decode("utf-8")


def decrypt_smtp_password(encrypted_password: str) -> str:
    """Decrypts an AES-256 Fernet-encrypted SMTP password back to plaintext."""
    if not encrypted_password:
        return ""
    try:
        decrypted_bytes = cipher_suite.decrypt(encrypted_password.encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
    except Exception:
        return ""


# ---------- Password Strength Validation ----------

PASSWORD_MIN_LENGTH = 8

def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validates password meets enterprise-level complexity requirements.
    Returns (is_valid: bool, error_message: str).
    """
    if len(password) < PASSWORD_MIN_LENGTH:
        return False, f"Password must be at least {PASSWORD_MIN_LENGTH} characters long."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit."
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=\[\]\\\/~`]", password):
        return False, "Password must contain at least one special character (!@#$%^&* etc)."
    return True, ""


# ---------- User Password Hashing (bcrypt) ----------

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a bcrypt hash in constant time."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Hashes a plaintext password using bcrypt with work factor 12."""
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode("utf-8")


# ---------- JWT Token Management ----------

def create_access_token(
    subject: Union[str, Any],
    role: str = "user",
    expires_delta: Optional[timedelta] = None,
    password_hash: Optional[str] = None
) -> str:
    """Creates a signed JWT access token with role, expiry, and issued-at timestamps."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "sub": str(subject),
        "role": role,
        "exp": expire,
        "iat": now,          # Issued-at claim — enables token age checks
        "iss": "smartcampaign-api",  # Issuer claim
    }
    if password_hash is not None:
        to_encode["pws"] = password_hash[-10:]
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")


# Deprecated SafeHTMLParser - removed in favor of bleach for HTML sanitization.


def sanitize_html(html_content: str) -> str:
    """
    Sanitizes raw HTML using bleach to allow only safe tags and attributes,
    preventing XSS attacks.
    """
    if not html_content:
        return ""
    import bleach
    # Use bleach defaults for allowed tags/attributes; strip disallowed content.
    return bleach.clean(html_content, tags=bleach.sanitizer.ALLOWED_TAGS,
                         attributes=bleach.sanitizer.ALLOWED_ATTRIBUTES,
                         strip=True)

