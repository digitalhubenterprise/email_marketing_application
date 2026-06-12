from fastapi import Request, Response
import uuid

async def security_headers_middleware(request: Request, call_next) -> Response:
    """Add enterprise‑level security headers to every response.
    Includes CSP, HSTS, X‑Frame‑Options, etc., and injects a unique
    X‑Request‑ID for tracing.
    """
    request_id = str(uuid.uuid4())
    response = await call_next(request)
    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: http: https:; "
        "frame-ancestors 'self'; "
        "form-action 'self';"
    )
    response.headers["X-Request-ID"] = request_id
    if "server" in response.headers:
        del response.headers["server"]
    return response
