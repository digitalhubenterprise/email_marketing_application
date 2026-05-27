# 🚀 SmartCampaign — Premium Email Marketing SaaS (Version 1.0)

SmartCampaign is an enterprise-grade, high-performance Email Marketing SaaS platform designed to support robust mass broadcast sequences, drip automations, and CRM segments. Equipped with an interactive glassmorphic dashboard, multi-SMTP load rotation, CSV imports, jinja-style dynamic templates, and pixel-perfect real-time engagement tracking, SmartCampaign is fully hardened for production-ready deployments.

---

## 🏗️ Technical Architecture & Stack

### 1. Frontend Console
- **Framework**: React.js (Vite + TypeScript)
- **Styling**: Vanilla CSS (Harmonious glassmorphic theme, responsive flex grids, custom glows)
- **Analytics Visualization**: Recharts (real-time send volume, CTR, and open-rate curves)
- **Iconography**: Lucide React
- **Client Storage & Sync**: Persistent SaaS wallet ledger stored inside `localStorage`

### 2. FastAPI Backend Services
- **API Engine**: FastAPI (Python 3.12, fully async lifespan)
- **Database ORM**: SQLAlchemy (Asynchronous transaction sessions & connection pools)
- **Distributed Queue**: Celery background task workers
- **Message Broker & Cache**: Redis key-value store (secure, password-protected)
- **Time Zone Sync**: System-wide containers clocks locked to **Dhaka Time (GMT+6)**
- **Brute-Force Shield**: SlowAPI (per-IP rate limiting applied to auth gateways)
- **Security Middleware**: Auto-injected security headers (HSTS, nosniff, DENY frames, CSP validation)

### 3. Production Infrastructure
- **Orchestration**: Docker & Docker Compose
- **Reverse Proxy**: Nginx (configured with aggressive static caching, TLS 1.3 paths, and Let's Encrypt support)

---

## 🔐 Enterprise-Grade Security Implementation

| Security Control | Implementation Detail | Purpose |
|------------------|-----------------------|---------|
| **Brute-Force Shield** | SlowAPI per-IP rate limits: Login (20/min), Register (10/min), Change PW (5/min). | Blocks automated credential stuffing and bot registrations. |
| **Data Encryption** | AES-256 Fernet symmetric encryption at rest. | Encrypts external custom SMTP credentials before writing to DB. |
| **JWT Compliance** | Explicit claims enforcement (`exp`, `sub`, `iat`, `iss`). | Blocks forged or modified authentication tokens. |
| **HTTP Security Headers** | `HSTS`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`. | Mitigates XSS, clickjacking, MIME sniffing, and MITM. |
| **API Shielding** | Swagger UI (`/api/docs`), openapi JSON, and ReDoc disabled when `ENVIRONMENT=production`. | Prevents bad actors from scanning the backend API schema. |
| **Strict CORS Gateways** | Explicit domain allowlist (localhost filters automatically disabled in production). | Prevents browser-based cross-origin credential stealing. |

---

## ⏰ Celery Beat Periodic Scheduler Actions

SmartCampaign uses a database-driven background Celery Beat daemon to run mission-critical cron loops:

1. **Scheduled Campaign Dispatch Engine (Every 10 seconds)**:
   - Queries Postgres for any campaign marked as `"scheduled"` whose target date has arrived (`scheduled_at <= now`).
   - Automatically transitions status to `"sending"` and spawns worker threads, ensuring scheduled email blasts execute even if servers or workers restart.
2. **Monthly User Quota Reset (1st of every month at 00:00 UTC)**:
   - Resets all users' `quota_sent` counters back to `0`, renewing monthly subscription allocations atomically.

---

## ⚡ Quick Start: Running the Platform Locally

To spin up the entire container orchestration (FastAPI API server, PostgreSQL Database, Redis broker, Celery worker, Celery beat daemon, and Nginx hosting React) with a single command:

```bash
# Start all local containers
docker-compose up -d --build
```

### Access Portals:
- **Client Panel & Dashboard**: [http://localhost](http://localhost) (Proxy port 80)
- **FastAPI Documentation (Swagger UI)**: [http://localhost:8000/api/docs](http://localhost:8000/api/docs) (Only available in development environment)
- **Email Tracking Node**: [http://localhost:8000/api/track](http://localhost:8000/api/track)

---

## 📊 Live Email Analytics & Campaigns

- **Blast Campaigns Wizard**: Select SMTP routing profiles, contact lists, templates, and configure:
  - **Schedule Time**: Precise delivery dates (automatically parsed to naive UTC to prevent timezone offset warnings).
  - **Auto-Resend Hours**: Define drip reminders or resends for un-engaged lists.
  - **Sending Mode**: Toggle between **Auto (automated Celery dispatch)** and **Manual (requires trigger)**.
- **Open Tracking**: Appends a transparent `1x1.gif` pixel before the `</body>` tag of HTML emails. Mail clients request `/api/track/open/{log_id}`, atomically logging reads.
- **Click Tracking**: HTML links are parsed in Celery threads and rewritten to route through `/api/track/click/{log_id}?url={target_url}`, logging engagement before safe redirecting.
- **SaaS Credit Wallet**: Fund mock accounts in the `Billing Wallet` page using Binance Pay / USDT, upgrade plans, and deduct balance persistently via the `/api/auth/upgrade` database gateway.
