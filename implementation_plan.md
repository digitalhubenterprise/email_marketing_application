# Implementation Plan - Advanced Security Hardening

This plan outlines the implementation of security patches addressing the advanced vulnerabilities identified in the Deep Security Level Audit Report.

## User Review Required

> [!WARNING]
> These changes enforce immediate session invalidation when a user's password changes by introducing a password hash signature check inside the JWT verification dependency.
> 
> Consequently, **all existing active user and administrator sessions will be invalidated**, requiring them to log in again. This is a secure best-practice to enforce token rotation.

---

## Proposed Changes

### Component: Backend Security & Credentials Management

#### [MODIFY] [security.py](file:///e:/Work/Development_Projects/email_marketing_application/backend/app/core/security.py)
- Update `create_access_token` to accept an optional `password_hash: str = None` argument.
- If provided, store the last 10 characters of the password hash in the JWT payload under the claim `"pws"`.
- Upgrade `sanitize_html(html_content: str) -> str`:
  - Unescape HTML entities using `html.unescape` first to prevent character obfuscation bypasses (e.g. `&#x6A;...` for `javascript:`).
  - Strip `<object>`, `<embed>`, `<applet>`, and `<meta>` tags.
  - Strip inline event handlers and `javascript:` / `data:` URI links using case-insensitive, newline-tolerant regex on the unescaped content.

#### [MODIFY] [deps.py](file:///e:/Work/Development_Projects/email_marketing_application/backend/app/api/deps.py)
- Import `secrets`.
- In `get_current_user`, extract `"pws"` from the token payload.
- Verify that `"pws"` is present and matches the last 10 characters of `user.hashed_password` in the database. Raise an unauthorized exception if it doesn't match or is missing.

#### [MODIFY] [admin_deps.py](file:///e:/Work/Development_Projects/email_marketing_application/backend/app/api/admin_deps.py)
- In `get_current_admin`, extract `"pws"` from the token payload.
- Verify that `"pws"` is present and matches the last 10 characters of `admin.hashed_password` in the database. Raise an unauthorized exception if it doesn't match or is missing.

---

### Component: Backend API Endpoints

#### [MODIFY] [smtp.py](file:///e:/Work/Development_Projects/email_marketing_application/backend/app/api/smtp.py)
- Implement `validate_ssrf_host(host: str) -> None` which resolves the host to an IP address and raises a `400 Bad Request` if it falls in loopback, link-local, multicast, or private IP ranges in production.
- Call `validate_ssrf_host` inside `create_smtp_server` before saving the SMTP configuration to the database.
- Update `test_smtp_connection` to use `validate_ssrf_host` for connection checks.

#### [MODIFY] [admin.py](file:///e:/Work/Development_Projects/email_marketing_application/backend/app/api/admin.py)
- **Time-Safe Invitation Gate**: Modify `register_admin` to compare `provided_token` and `secret` using `secrets.compare_digest` instead of `!=`.
- **Pass Hash Token Verification**: When calling `create_access_token` on admin login or user impersonation, pass the user/admin password hash as `password_hash`.

#### [MODIFY] [auth.py](file:///e:/Work/Development_Projects/email_marketing_application/backend/app/api/auth.py)
- **Pass Hash Token Verification**: When calling `create_access_token` on user login and email verification flows, pass the user password hash as `password_hash`.

---

### Component: Task Workers & Security Headers

#### [MODIFY] [main.py](file:///e:/Work/Development_Projects/email_marketing_application/backend/app/main.py)
- **CSP Headers**: Add a secure `Content-Security-Policy` header in `add_security_headers` middleware:
  `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: http: https:;`

#### [MODIFY] [email_sender.py](file:///e:/Work/Development_Projects/email_marketing_application/backend/app/tasks/email_sender.py)
- **Dhru API Log Purge**: Create `async_prune_old_dhru_logs()` and the wrapper celery task `prune_old_dhru_logs_task()`.
- Register it in `setup_periodic_tasks` to run once a day at midnight UTC (`crontab(hour="0", minute="0")`).

---

## Verification Plan

### Automated Tests
- Run backend tests locally:
  `$env:PYTHONPATH="backend"; backend\venv\Scripts\pytest backend\tests`
- Write unit tests in `backend/tests/test_user_audit.py` to assert:
  - Stored SMTP server SSRF validation block.
  - HTML sanitization against entity-encoded payload bypass.
  - Password change token invalidation flow.

### Manual Verification
- Check admin settings page connection tests and invitation gateways.
- Perform a simulated template creation containing an obfuscated entity link and check that it is fully sanitized.
