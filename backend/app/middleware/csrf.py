import secrets
import typing
from fastapi import Depends, HTTPException, Request, Response, status

CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "X-CSRF-Token"

def generate_csrf_token() -> str:
    """Generate a URL‑safe CSRF token."""
    return secrets.token_urlsafe(32)

def set_csrf_cookie(response: Response) -> None:
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


async def enforce_csrf_for_cookie_auth(request: Request) -> None:
    """Apply CSRF protection to every unsafe request authenticated by a browser cookie.

    Bearer-token API clients are not subject to CSRF, while one-click unsubscribe
    requests remain intentionally unauthenticated as required by RFC 8058.
    """
    if request.method not in ("POST", "PUT", "PATCH", "DELETE"):
        return
    public_paths = {
        "/api/auth/login",
        "/api/auth/register",
        "/api/admin/login",
        "/api/admin/register",
    }
    if request.url.path.startswith("/api/track/unsubscribe/") or request.url.path in public_paths:
        return
    # Explicit bearer authentication is not automatically attached by browsers,
    # so it is not susceptible to cookie-based CSRF even if an old session cookie
    # also happens to be present.
    if request.headers.get("Authorization", "").lower().startswith("bearer "):
        return
    if request.cookies.get("access_token") or request.cookies.get("admin_token"):
        await verify_csrf(request)

def csrf_dependency() -> typing.Callable:
    """Convenient dependency for FastAPI routers."""
    return verify_csrf
