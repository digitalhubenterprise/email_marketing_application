# SmartCampaign — Backend Admin Features Documentation

This document describes the administrative features, server configurations, Celery workers, and background task architectures of the **SmartCampaign** platform.

---

## 1. Administrative Portal & Dashboard
The administrator panel allows team members to oversee system health, manage configurations, and audit activities:
* **Administrator Registrations**: Gated behind `ADMIN_REGISTRATION_SECRET` token checks. Only users with the invite code can create admin accounts.
* **Audit Trails**: Records administrative actions (e.g. creating/deleting accounts, editing settings, performing backups) in the `DhruApiLog` and `AdminAuditLog` tables.
* **User Management View**: Administrators can view user emails, roles, subscription details, quotas sent, and toggle account activation status (suspend/unsuspend).

---

## 2. Global System Settings Sync
Configuration fields are synchronized in real-time between the frontend and the PostgreSQL database:
* **Storage**: System settings (localization, site name, support email, SMTP limits, payment thresholds) are persisted inside the `system_configs` table.
* **Security Masking**: Third-party API keys (Google Maps API keys, integration credentials) are masked as `••••••••` in GET API responses, and safely merged on database updates.

---

## 3. Celery Async Task Processing
CELERY is utilized for high-throughput, non-blocking asynchronous operations:
* **Celery Worker**: Spinned up via `celery -A app.tasks.email_sender.celery worker --loglevel=info`. Processes campaign dispatches, contact imports, and SMTP verification diagnostics.
* **Celery Beat**: Spinned up via `celery -A app.tasks.email_sender.celery beat --loglevel=info`. Schedules automated backups and recurrent campaign queue reviews.
* **Eager Testing Mode**: Confirmed during unit tests to run tasks synchronously, bypassing Redis and accelerating test suites.

---

## 4. SMTP Connection Tester
Administrators can check SMTP server integrity from the settings dashboard:
* **Real-time Diagnostics**: Invokes `aiosmtplib` inside Celery tasks to attempt SSL/TLS connection Handshakes.
* **Attribute Safeguards**: Handles empty settings values gracefully without triggering AttributeError crashes on connection tests.

---

## 5. Remote Backup & Database Restore System
Backup tasks run either on schedule (via Celery Beat) or manually triggered by admins:
* **Remote Destinations**: Backups can be archived to AWS S3 buckets or FTP servers.
* **Zip Snapshotting**: Archives database tables (PostgreSQL SQL dumps), project configurations, and `.env` files.
* **Configurable Retention**: Backups automatically prune old files on S3/FTP to respect the `retention_count` limit (minimum 1, maximum 30).
* **Database Restoration**:
  * Drops the database's `public` schema (`DROP SCHEMA public CASCADE`) and recreates it.
  * Restores database tables and records from the sql dump.
  * Ensures target extraction paths are canonicalized to block path traversal attempts.
