# 🚀 SmartCampaign — Premium Email & Telegram Marketing SaaS (Version 1.4)

SmartCampaign is an enterprise-grade, high-performance Email & Telegram AI Marketing SaaS platform designed to support robust mass email broadcasts, automated drip campaigns, and scheduled AI Telegram rotations. Equipped with an interactive glassmorphic dashboard, multi-SMTP load rotation, CSV imports, jinja-style dynamic templates, and pixel-perfect real-time engagement tracking, SmartCampaign is fully hardened for production-ready deployments.

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

For full auditing specifics, references, and scanning configurations, check the [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md) ledger.

| Security Control | Implementation Detail | Purpose |
|------------------|-----------------------|---------|
| **OOM Protection** | Stream files in **1MB chunks**; immediate termination if file > 5MB before buffering payload. | Prevents memory exhaustion attacks (OOM) via massive CSV lists. |
| **Brute-Force Shield** | SlowAPI per-IP rate limits: Login (20/min), Register (10/min), Change PW (5/min). | Blocks automated credential stuffing and bot registrations. |
| **Data Encryption** | AES-256 Fernet symmetric encryption at rest. | Encrypts external custom SMTP credentials before writing to DB. |
| **JWT Compliance** | Explicit claims enforcement (`exp`, `sub`, `iat`, `iss`). | Blocks forged or modified authentication tokens. |
| **HTTP Security Headers** | `HSTS`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`. | Mitigates XSS, clickjacking, MIME sniffing, and MITM. |
| **API Shielding** | Swagger UI (`/api/docs`), openapi JSON, and ReDoc disabled when `ENVIRONMENT=production`. | Prevents bad actors from scanning the backend API schema. |
| **Strict CORS Gateways** | Explicit domain allowlist (localhost filters automatically disabled in production). | Prevents browser-based cross-origin credential stealing. |
| **IDOR Signature Guard** | HMAC-SHA256 tokens using system `JWT_SECRET` for unsubscribe redirection. | Blocks sequential key enumeration/unauthorized subscriber opt-outs. |
| **Fail-Safe Key Guard** | Regex parser screening generated AI posts before telegram delivery. | Prevents leakage of DB URLs, JWT secrets, and Telegram tokens to public channels. |

---

## 🧪 Running Automated Verification Tests

SmartCampaign includes a comprehensive unit and integration testing suite utilizing **Pytest**, **pytest-asyncio**, and **HTTPX** against an async, in-memory **SQLite database (`aiosqlite`)** to ensure test isolations from development or production environments.

### Setup and Running Tests Natively:
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Activate your virtual environment and install test dependencies (if not already installed):
   ```bash
   venv\Scripts\activate
   pip install pytest httpx pytest-asyncio aiosqlite
   ```
3. Execute the full test runner:
   ```bash
   python -m pytest tests/
   ```

### Tested Components:
* **Authentication & Upgrades (`test_auth.py`)**: Tests account creation, duplicate constraints, login handlers, secure token parsing, password updates, and billing upgrades logs.
* **Contacts & CSV Imports (`test_contacts_csv.py`)**: Tests mailing list creations, CSV parsing mapping, deduplication validation, and OOM 5MB payload block limits.
* **Queuing & Dispatch Tasks (`test_email_dispatch.py`)**: Tests merge tag interpolation fallbacks, link click wrap redirects, tracking pixel insertions, open-redirect verification, and Celery worker bounce handler triggers.

---

## ⏰ Celery Beat Periodic Scheduler Actions

SmartCampaign uses a database-driven background Celery Beat daemon to run mission-critical cron loops:

1. **Scheduled Campaign Dispatch Engine (Every 10 seconds)**:
   - Queries Postgres for any campaign marked as `"scheduled"` whose target date has arrived (`scheduled_at <= now`).
   - Automatically transitions status to `"sending"` and spawns worker threads, ensuring scheduled email blasts execute even if servers or workers restart.
2. **Monthly User Quota Reset (1st of every month at 00:00 UTC)**:
   - Resets all users' `quota_sent` counters back to `0`, renewing monthly subscription allocations atomically.
3. **Telegram AI Marketing Dispatch Daemon (Every 60 seconds)**:
   - Evaluates active setups to run posts based on category rotation rules (2 IMEI -> 3 Server -> 2 Remote). Calls LLaMA-3 dynamically via Groq Cloud API, checks output against credential filters, and sends content to Telegram.

---

## ⚡ Quick Start: Running the Platform Locally

To spin up the entire container orchestration (FastAPI API server, PostgreSQL Database, Redis broker, Celery worker, Celery beat daemon, and Nginx hosting React) with a single command:

```bash
# Start all local containers
docker compose up -d --build
```

### Access Portals:
- **Client Console & Dashboard**: [http://localhost](http://localhost) (Proxy port 80)
- **FastAPI Documentation (Swagger UI)**: [http://localhost:8000/api/docs](http://localhost:8000/api/docs) (Only available in development environment)
- **Email Tracking Node**: [http://localhost:8000/api/track](http://localhost:8000/api/track)

---

## 📊 Live Email Analytics & Campaigns

- **Blast Campaigns Wizard**: Select SMTP routing profiles, contact lists, templates, and configure:
  - **Schedule Time**: Precise delivery dates (automatically parsed to UTC to prevent timezone warnings).
  - **Auto-Resend Hours**: Define drip reminders or resends for un-engaged lists.
  - **Sending Mode**: Toggle between **Auto (automated Celery dispatch)** and **Manual (requires trigger)**.
- **Open Tracking**: Appends a transparent `1x1.gif` pixel before the `</body>` tag of HTML emails. Mail clients request `/api/track/open/{log_id}`, atomically logging reads.
- **Click Tracking**: HTML links are parsed in Celery threads and rewritten to route through `/api/track/click/{log_id}?url={target_url}`, logging engagement before safe redirecting.
- **SaaS Credit Wallet**: Fund mock accounts in the `Billing Wallet` page using Binance Pay / USDT, upgrade plans, and deduct balance persistently via the `/api/auth/upgrade` database gateway.

---

## 🤖 Telegram AI Marketing Dispatcher

The **Telegram Marketing Console** enables users to automate marketing rotations using AI LLM generation directly into Telegram channels:

- **AI Post Generator**: Integrates LLaMA-3 models on Groq Cloud via async connections. Generates posts containing group headings, service lists, promotional text, urgency call-to-actions, order buttons, and footers automatically.
- **Service Pools**: CRUD interfaces to manage service topics sorted by categories (IMEI Service, Server Service, Remote Service).
- **Group Categorization**: Organize services under folders (groups) with dynamic selection dropdowns and autocomplete.
- **Category Rotation Cycle**: Sequential dispatcher alternates dispatches by category modulo index loops: `2 IMEI Service -> 3 Server Service -> 2 Remote Service` runs. Graces to fallback categories if a target segment is empty.
- **Settings Configuration & Validation**: Masked bot tokens and API keys with visibility toggles and active `✓ Configured` status checkmarks.
- **Flexible Scheduling Intervals**: Supports delivery check intervals in both **Minutes** and **Hours** (1 to 60).
- **Audit Console Logs**: Real-time log monitoring screen showing timestamp details, service topics, and raw generation contents.
- **Dynamic Campaign Website URL**: Allows users to configure custom target landing pages injected dynamically into generated posts.
