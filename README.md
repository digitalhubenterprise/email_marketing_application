# 🚀 SmartCampaign — Premium Email, Telegram & SMS Marketing SaaS (Version 2.0)

SmartCampaign is an enterprise-grade, high-performance Email, Telegram, and SMS AI Marketing SaaS platform designed to support robust mass email broadcasts, SMS campaigns, automated drip schedules, and scheduled AI Telegram rotations. Equipped with an interactive glassmorphic dashboard, multi-SMTP load rotation, CSV imports, jinja-style dynamic templates, and pixel-perfect real-time engagement tracking, SmartCampaign is fully hardened for production-ready deployments.

---

## 🏗️ Technical Architecture & Stack

### 1. Frontend Console
- **Framework**: React.js (Vite + TypeScript)
- **Styling**: Vanilla CSS (Harmonious glassmorphic theme, responsive layouts, high-contrast light/dark modes, custom glows)
- **Analytics Visualization**: Recharts (real-time send volume, CTR, and open-rate curves)
- **Iconography**: Lucide React
- **Client Storage & Sync**: Persistent SaaS wallet ledger and dynamic active user session configs.

### 2. FastAPI Backend Services
- **API Engine**: FastAPI (Python 3.12, fully async lifespan)
- **Database ORM**: SQLAlchemy (Asynchronous transaction sessions & connection pools: `pool_size=10`, `max_overflow=20`)
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
| **JWT Compliance** | Explicit claims enforcement (`exp`, `sub`, `iat`, `iss`, `pws`). | Blocks forged or modified authentication tokens. |
| **Token Rotation** | JWT contains `"pws"` hash signature. Password change invalidates all stateless active tokens. | Forces active session termination on password resets. |
| **SSRF Gatekeeper** | Loopback/Private IP DNS mapping checks at SMTP configs setup. | Blocks Server-Side Request Forgery (SSRF) against internal services. |
| **Anti-XSS Sanitizer** | HTML entity unescaping before regex scanning filters (`<object>`, `javascript:` URIs). | Prevents obfuscated XSS payload injection bypasses in templates. |
| **HTTP Security Headers** | `HSTS`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Content-Security-Policy`. | Mitigates XSS, clickjacking, MIME sniffing, and MITM. |
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
   $env:PYTHONPATH="."
   venv\Scripts\pytest tests/
   ```

### Tested Components:
* **Authentication & Upgrades (`test_auth.py`)**: Tests account creation, duplicate constraints, login handlers, secure token parsing, password updates, billing upgrades, 15-day trial, and expired 403 API lockouts.
* **Contacts & CSV Imports (`test_contacts_csv.py`)**: Tests mailing list creations, CSV parsing mapping, deduplication validation, and OOM 5MB payload block limits.
* **Queuing & Dispatch Tasks (`test_email_dispatch.py`)**: Tests merge tag interpolation fallbacks, link click wrap redirects, tracking pixel insertions, open-redirect verification, and Celery worker bounce handler triggers.
* **SMS Marketing CRUD (`test_sms_marketing.py`)**: Verifies template structures, SMS campaigns creations, delivery logs pagination, and group number management.

---

## ⏰ Celery Beat Periodic Scheduler Actions

SmartCampaign uses a database-driven background Celery Beat daemon to run mission-critical cron loops:

1. **Scheduled Campaign Dispatch Engine (Every 10 seconds)**:
   - Queries Postgres for any campaign marked as `"scheduled"` whose target date has arrived (`scheduled_at <= now`).
   - Automatically transitions status to `"sending"` and spawns worker threads, ensuring scheduled email blasts execute even if servers or workers restart.
2. **Subscription Expiration Sweeper (Every 10 minutes)**:
   - Scans database for users whose subscription or trial expiration has passed (`subscription_expires_at < now`).
   - Dynamically downgrades active accounts to the `"expired"` tier, locking all functional operations.
3. **Telegram AI Marketing Dispatch Daemon (Every 60 seconds)**:
   - Evaluates active setups to run posts based on category rotation rules (2 IMEI -> 3 Server -> 2 Remote). Calls LLaMA-3 dynamically via Groq Cloud API, checks output against credential filters, and sends content to Telegram.
4. **API Log Pruning (Every 24 hours at midnight UTC)**:
   - Prunes/deletes external API log entries older than 30 days to protect disk storage against depletion attacks.

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

## 💬 SMS Marketing Suite (BulkSMSBD Integration)

SmartCampaign contains a full-featured SMS suite using BulkSMSBD API integration:

- **Credit Balance Inquiries**: Dynamic real-time balance queries directly communicating with `bulksmsbd.net` displaying credits in BDT.
- **SMS Template Builder**: Full template CRUD layout. Templates can be dynamically selected in the campaigns composer to autofill message bodies.
- **Manage Numbers & Groups**: Sub-menus allowing users to organize numbers into specific Groups and view list datagrids.
- **Single & Bulk SMS Campaigns**:
  - **Single SMS Mode**: Instantly dispatches a text to a specific phone number.
  - **Bulk SMS Mode**: Submits a comma-separated list of group recipients to BulkSMSBD API gateway in **one single API call** (< 2s delivery speed) and bulk writes delivery logs in Postgres database in **0.13 seconds**.
- **Multi-Sender ID Support**: Parses comma-separated Sender IDs in Settings to automatically map to a dynamic select dropdown during campaign composition.

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

---

## ⏳ 15-Day Free Trial & Subscription Lockout

To align with modern SaaS growth operations, SmartCampaign incorporates a robust trial and subscription lockout gate:

- **15-Day Trial**: New user signups default to the `"trial"` tier, giving them **5,000 email quota** valid for **15 days**.
- **Automatic Deactivation**: Real-time API dependency checks (`get_current_user`) and a background Celery Beat sweeper task dynamically switch expired accounts to the `"expired"` tier.
- **System Lockout ("All System Off")**: Users in the `"expired"` tier are blocked from all functional endpoints (SMTP configs, campaigns creation, contacts, templates, SMS, and Telegram marketing APIs). All requests return an `HTTP 403 Forbidden` response.
- **Gated Frontend Client UI**:
  - Global fetch interceptor detects the 403 expiration response and automatically redirects the user to `/billing?expired=true`.
  - Side navigation links for restricted tabs are locked with 🔒 icons and set to 40% opacity. Clicking them displays a warning prompt.
  - A red warning banner is displayed at the top of the Billing screen guiding the user to renew.
- **Seamless Renewal**: Renewing or upgrading plans via the wallet ledger instantly resets the tier, quota, and expiration date, restoring access to all locked functionalities.
