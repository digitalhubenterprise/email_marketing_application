import os
import uuid
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import settings
from app.db.session import create_db_tables
from app.api import auth, smtp, contacts, templates, campaigns, tracker, admin, telegram_marketing, dhru


# ─── Environment detection ───────────────────────────────────────────
IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"


# ─── Application lifespan ────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Runs DB table creation on startup."""
    await create_db_tables()
    yield


# ─── Rate limiter state ──────────────────────────────────────────────
from app.api.auth import limiter

# ─── FastAPI app ──────────────────────────────────────────────────────

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    # Swagger/ReDoc disabled in production — prevents API schema exposure
    docs_url=None if IS_PRODUCTION else "/api/docs",
    redoc_url=None if IS_PRODUCTION else "/api/redoc",
    openapi_url=None if IS_PRODUCTION else "/api/openapi.json",
)


# ─── CORS ─────────────────────────────────────────────────────────────

ALLOWED_ORIGINS = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:80",
    "http://127.0.0.1:3000",
    "http://beta.smartcampaign.today",
    "https://beta.smartcampaign.today",
    "http://betaapi.smartcampaign.today",
    "https://betaapi.smartcampaign.today",
]

# In production, only allow the real domain
if IS_PRODUCTION:
    ALLOWED_ORIGINS = [
        origin for origin in ALLOWED_ORIGINS
        if "localhost" not in origin and "127.0.0.1" not in origin
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
    expose_headers=["X-Request-ID"],
    max_age=600,
)

# Attach rate limiter — handles 429 Too Many Requests automatically
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ─── Maintenance Mode Middleware ─────────────────────────────────────

@app.middleware("http")
async def check_maintenance_mode(request: Request, call_next) -> Response:
    """Interceptors all public client requests when maintenance mode is active."""
    path = request.url.path
    is_bypass = (
        path == "/"
        or path == "/api/health"
        or path.startswith("/api/admin")
        or path.startswith("/api/track")
        or path.startswith("/api/dhru")
        or path == f"{settings.API_V1_STR}/auth/config"
    )
    if not is_bypass:
        from app.db.session import AsyncSessionLocal
        from app.db.models import SystemConfig
        from sqlalchemy.future import select
        async with AsyncSessionLocal() as db:
            try:
                res = await db.execute(select(SystemConfig.maintenance_mode).where(SystemConfig.id == 1))
                maintenance_mode = res.scalar() or False
                if maintenance_mode:
                    return JSONResponse(
                        status_code=503,
                        content={
                            "detail": "System is currently undergoing scheduled maintenance. Please try again shortly.",
                            "maintenance": True
                        }
                    )
            except Exception as e:
                # Fallback to normal behavior if DB connection fails during check
                _ = e

    return await call_next(request)

# ─── Security Headers + Request ID middleware ─────────────────────────

@app.middleware("http")
async def add_security_headers(request: Request, call_next) -> Response:
    """
    Adds enterprise-level HTTP security headers to every response.
    Prevents XSS, clickjacking, MIME sniffing, and information disclosure.
    Also injects a unique X-Request-ID for distributed tracing.
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
        "img-src 'self' data: http: https:;"
    )
    response.headers["X-Request-ID"] = request_id

    # Remove server fingerprinting header safely
    try:
        del response.headers["server"]
    except KeyError:
        pass

    return response


# ─── Routers ──────────────────────────────────────────────────────────

app.include_router(auth.router,      prefix=f"{settings.API_V1_STR}/auth",      tags=["Authentication"])
app.include_router(smtp.router,      prefix=f"{settings.API_V1_STR}/smtp",      tags=["SMTP Servers"])
app.include_router(contacts.router,  prefix=f"{settings.API_V1_STR}/contacts",  tags=["Contacts & Lists"])
app.include_router(templates.router, prefix=f"{settings.API_V1_STR}/templates", tags=["Email Templates"])
app.include_router(campaigns.router, prefix=f"{settings.API_V1_STR}/campaigns", tags=["Campaigns"])
app.include_router(tracker.router,   prefix="/api/track",                        tags=["Email Tracking"])
app.include_router(admin.router,     prefix="/api/admin",                        tags=["Super Admin"])
app.include_router(telegram_marketing.router, prefix=f"{settings.API_V1_STR}/telegram-marketing", tags=["Telegram Marketing"])
app.include_router(dhru.router, prefix="/api/dhru", tags=["Dhru Fusion API Standards"])



# ─── Root & Health ────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
async def root():
    return {"status": "ok", "service": settings.PROJECT_NAME, "version": settings.VERSION}


@app.get("/api/health", include_in_schema=False)
async def health_check():
    """Health check endpoint for Docker, load balancers, and uptime monitors."""
    return {"status": "healthy"}
