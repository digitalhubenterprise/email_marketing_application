from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import settings

# Global rate limiter configuration
# Default limit: 10 requests per second per client IP
# Disable limiter in testing environments for speed
limiter = Limiter(
    key_func=get_remote_address,
    enabled=not getattr(settings, "TESTING", False),
    default_limits=["10/second"],
)

def get_limiter() -> Limiter:
    """Return the configured global Limiter instance.
    This helper can be imported by other modules (e.g., main.py) to
    attach the limiter state to the FastAPI app.
    """
    return limiter
