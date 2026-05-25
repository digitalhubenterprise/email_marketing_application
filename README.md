# SmartCampaign — Premium Email Marketing SaaS (Version 1.0)

SmartCampaign is an enterprise-grade, high-performance Email Marketing SaaS product designed to support up to 250 active subscribers. It comes equipped with a modern dashboard visualizer, multi-SMTP configuration, CSV list importing, custom templates with jinja replacements, async email broadcasts, and real-time open and click deliverability analytics.

---

## 🏗️ Technical Architecture & Stack

1. **Frontend**:
   - Framework: React.js (Vite + TypeScript)
   - Styling: Tailwind CSS (with bespoke glassmorphism & glows)
   - Analytics Engine: Recharts (trends visualizations)
   - Icons: Lucide React

2. **Backend**:
   - Server: FastAPI (Python 3.12, Asyncpg engine)
   - Database ORM: SQLAlchemy (Asynchronous sessions)
   - Task Scheduler: Celery background workers
   - Message Broker & Cache: Redis key-store
   - Email Engine: Asynchronous SMTP clients via `aiosmtplib`

3. **Infrastructure**:
   - Coordination: Docker & Docker Compose
   - Web Server / Proxy: Nginx reverse-proxypass routing

---

## ⚡ Quick Start: Running the Platform

To spin up the entire local infrastructure (FastAPI API server, PostgreSQL Database, Redis broker, Celery worker, and Nginx serving React) with a single command:

```bash
docker-compose up --build
```

### Access Portals:
- **Client Panel & Dashboard**: [http://localhost](http://localhost) (Proxy port 80)
- **FastAPI Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Email Tracking Node**: [http://localhost:8000/api/track](http://localhost:8000/api/track)

---

## 🔌 Connecting to Supabase (Production Swap)

The database layers are configured dynamically using SQLAlchemy Async. Transitioning from local Docker PostgreSQL to your **Supabase** instance is seamless:

1. Open your `.env` configuration file in the root directory.
2. Retrieve your connection string from the Supabase Dashboard (`Settings -> Database`). Make sure to select the **Transaction** or **Session** pooler URL and swap the driver from `postgresql://` to `postgresql+asyncpg://` for async compatibility.
3. Replace the `DATABASE_URL` value:
   ```env
   # Example Supabase Async Connection URL:
   DATABASE_URL=postgresql+asyncpg://postgres:[your-password]@[your-supabase-reference].supabase.co:5432/postgres
   ```
4. Restart your docker containers. FastAPI will automatically initialize all required relational database tables in your Supabase schema upon system startup!

---

## 📊 Live Email Analytics Features

- **Open Tracking**: When campaigns are sent, a transparent `1x1.gif` pixel is dynamically appended to the bottom of the HTML email body. When external mail clients render the mail, the browser requests the endpoint `/api/track/open/{log_id}`, instantly logging delivery reads.
- **Click Tracking**: All HTML links are parsed dynamically in the worker threads using regular expression mapping. They are rewritten to route through the tracking endpoint `/api/track/click/{log_id}?url={target_url}`, recording engagement before redirecting subscribers to their destinations.
- **Simulated Stripe Upgrades**: Visit the `Billing & Plans` tab to mock Stripe checkout gateways. Click checkout to trigger instant account upgrades and scale sending quotas.
