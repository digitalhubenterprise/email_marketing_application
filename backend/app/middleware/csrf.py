import secrets
import typing
from fastapi import Depends, HTTPException, Request, Response, status

CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "X-CSRF-Token"

def generate_csrf_token() -> str:
    """Generate a URL‑safe CSRF token."""
    return secrets.token_urlsafe(32)

async def set_csrf_cookie(response: Response) -> None:
    """Set the CSRF cookie on the response. The cookie is readable by JavaScript.
    It is marked Secure and SameSite=Lax for safety.
    """
    token = generate_csrf_token()
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=token,
        httponly=False,
        secure=True,
        samesite="lax",
    )
    # Also expose token in a response header for convenience.
    response.headers[CSRF_HEADER_NAME] = token

async def verify_csrf(request: Request) -> None:
    """Dependency to verify CSRF token on state‑changing requests.
    It expects the `X‑CSRF‑Token` header to match the `csrf_token` cookie.
    """
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        cookie_token = request.cookies.get(CSRF_COOKIE_NAME)
        header_token = request.headers.get(CSRF_HEADER_NAME)
        if not cookie_token or not header_token or cookie_token != header_token:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token missing or invalid",
            )

def csrf_dependency() -> typing.Callable:
    """Convenient dependency for FastAPI routers."""
    return Depends(verify_csrf)
