from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union
import re
import jwt
import bcrypt
from html.parser import HTMLParser
from cryptography.fernet import Fernet
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


class SafeHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.result = []
        self.dangerous_tags = {"script", "iframe", "object", "embed", "applet", "meta"}
        self.nesting_level = 0

    def handle_starttag(self, tag, attrs):
        tag_lower = tag.lower()
        if tag_lower in self.dangerous_tags:
            self.nesting_level += 1
            return
        if self.nesting_level > 0:
            return
            
        cleaned_attrs = []
        for name, value in attrs:
            name_lower = name.lower()
            if name_lower.startswith("on"):
                continue
            if value:
                val_lower = value.strip().lower()
                if val_lower.startswith(("javascript:", "data:")):
                    continue
            cleaned_attrs.append((name, value))
            
        import html
        attr_str = ""
        if cleaned_attrs:
            attr_str = " " + " ".join(f'{k}="{html.escape(v)}"' if v is not None else k for k, v in cleaned_attrs)
        self.result.append(f"<{tag}{attr_str}>")

    def handle_endtag(self, tag):
        tag_lower = tag.lower()
        if tag_lower in self.dangerous_tags:
            self.nesting_level = max(0, self.nesting_level - 1)
            return
        if self.nesting_level > 0:
            return
        self.result.append(f"</{tag}>")

    def handle_data(self, data):
        if self.nesting_level > 0:
            return
        self.result.append(data)

    def handle_entityref(self, name):
        if self.nesting_level > 0:
            return
        self.result.append(f"&{name};")

    def handle_charref(self, name):
        if self.nesting_level > 0:
            return
        self.result.append(f"&#{name};")


def sanitize_html(html_content: str) -> str:
    """
    Sanitizes raw HTML to block XSS execution vectors.
    Strips out script/iframe/object/embed/applet/meta tags, inline on* events, and javascript:/data: links.
    """
    if not html_content:
        return ""
    from html.parser import HTMLParser
    parser = SafeHTMLParser()
    parser.feed(html_content)
    return "".join(parser.result)

