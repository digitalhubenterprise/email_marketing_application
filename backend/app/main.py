from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.db.session import create_db_tables
from app.api import auth, smtp, contacts, templates, campaigns, tracker

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Database Tables automatically (highly convenient for both local PG and remote Supabase setup)
    await create_db_tables()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# Set up CORS middleware to allow connection from our React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, restrict this to your actual frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(smtp.router, prefix=f"{settings.API_V1_STR}/smtp", tags=["SMTP Servers"])
app.include_router(contacts.router, prefix=f"{settings.API_V1_STR}/contacts", tags=["Contacts & Mailing Lists"])
app.include_router(templates.router, prefix=f"{settings.API_V1_STR}/templates", tags=["Email Templates"])
app.include_router(campaigns.router, prefix=f"{settings.API_V1_STR}/campaigns", tags=["Campaigns & Analytics"])
# Track router does not have API version string prefix to keep tracking links short and clean
app.include_router(tracker.router, prefix="/api/track", tags=["Email Tracking"])

@app.get("/")
async def root():
    return {"message": "Welcome to SmartCampaign API version 1.0! All systems go."}
