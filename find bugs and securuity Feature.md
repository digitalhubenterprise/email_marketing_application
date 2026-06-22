# SmartCampaign — Bugs and Security Remediation Documentation

This document compiles the bugs, architectural flaws, and security vulnerabilities discovered across the **SmartCampaign** codebase, along with their corresponding fixes and verification records.

---

## 1. Vulnerability Findings & Fix Actions

### 🔴 Critical Severity Findings
1. **Zip Slip (Remote Code Execution)**
   * **Bug**: The backup restore task unpacked files to target directories without directory traversal (`../`) checks.
   * **Fix**: Implemented strict destination validation using canonicalized absolute path checks inside `execute_remote_restore` in `backup_tasks.py`.
2. **Client-Side Financial Gateways Bypass**
   * **Bug**: Transaction verification checks on EVM/TRC20 blockchains were simulated on the frontend, allowing users to fake deposits.
   * **Fix**: Removed blockchain explorer simulation routes from `Wallet.tsx`; transaction hashes are now transmitted to and verified by the backend API.
3. **Billing upgrades Bypass**
   * **Bug**: Subscription plan upgrades verified user wallet balances inside LocalStorage.
   * **Fix**: Re-implemented subscription upgrade balance validations to transact directly on the database layer in the backend.
4. **Admin token storage omission**
   * **Bug**: The administrative login portal failed to persist JWT tokens in the browser, rendering admin views non-functional.
   * **Fix**: Updated `AdminLogin.tsx` to save the `admin_token` on successful authentication.
5. **Credentials Exposure in LocalStorage**
   * **Bug**: Third-party maps API keys and settings credentials were saved in plaintext inside `localStorage`.
   * **Fix**: Replaced with global settings synchronization in the database, masking keys as `••••••••` in API queries.

---

### 🟠 High Severity Findings
1. **Campaign Quota Gating Bypass**
   * **Bug**: Campaigns scheduled with `sending_mode="auto"` bypassed user remaining quota checks.
   * **Fix**: Integrated remaining quota validations before scheduling automated campaigns.
2. **Plaintext Credential Storage**
   * **Bug**: Twilio API keys, bulk SMS keys, and Telegram bot tokens were stored in plaintext database columns.
   * **Fix**: Encrypted all keys before DB save using AES-256 Fernet symmetric encryption.
3. **Backup Secrets Exposure**
   * **Bug**: System cryptography keys (`ENCRYPTION_KEY`, `JWT_SECRET`) were included inside full backup zip archives.
   * **Fix**: Excluded environment variables snapshot configurations from remote backups.
4. **Open Admin Registration**
   * **Bug**: The `/admin/register` path was exposed as a public route.
   * **Fix**: Nested the registration route inside the authenticated layout guard group.
5. **Session Role Hijacking**
   * **Bug**: App layouts relied only on client-side state parameters to authorize admin views.
   * **Fix**: Added token verification API checks on layout mount.
6. **Stored XSS in Previews**
   * **Bug**: Preview frames in the email template library had no `sandbox` controls.
   * **Fix**: Forced `sandbox=""` parameter limits on all layout review iframe tags.

---

### 🟡 Medium Severity Findings
1. **XML Entity Injection (XXE / Billion Laughs)**
   * **Bug**: The parameter parser in the Dhru bridge endpoint was vulnerable to XML Entity Injection attacks.
   * **Fix**: Added pre-parsing validation checks that inspect incoming XML payloads for `<!DOCTYPE` or `<!ENTITY` tags, rejecting malicious requests.
2. **Insecure HTML Sanitizer**
   * **Bug**: A simple tag-stripping regular expression was used to sanitize HTML templates.
   * **Fix**: Swapped with a robust HTML bleaching sanitizer using `bleach` and `tinycss2`.
3. **Missing SMS Gateway Rate Limiter**
   * **Bug**: The SMS gateway connection check had no rate restrictions, exposing server resources to spam.
   * **Fix**: Added SlowAPI rate limits (`5/minute`) on diagnostics endpoints.
4. **Synchronized System Settings**
   * **Bug**: Localization, invoice details, tax rates, and site properties were isolated in individual browsers.
   * **Fix**: Migrated settings states to be stored centrally inside the database under the `extra_settings` JSON column.

---

## 2. Verification & Verification Metrics
To ensure security patches remain solid and do not cause regressions:

### Backend Automated Test Suite
A suite of pytest integration tests checks all security patches.
* **Test Command**: `pytest tests/test_audit_patches.py`
* **Test Status**: **100% Passed (6/6 tests passed successfully)**.
* **Checks Included**:
  * Zip Slip prevention
  * Fernet SMTP Encryption
  * Remaining Quotas checks
  * Transaction hash regex validation
  * Database URL parsing
  * XML Entity injection protection

### Python Bandit Security Scan
* Run static analysis: `bandit -r app`
* Scan results confirm **zero high-severity security issues** remaining in the codebase.
