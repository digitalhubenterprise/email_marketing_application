# SmartCampaign — Security Layer Features Documentation

This document describes the security protocols, cryptography implementations, session protection layers, and validation mechanisms of the **SmartCampaign** platform.

---

## 1. Password Security & Cryptography
* **Enterprise Password Validator**: The backend enforces password strength validation check rules requiring:
  * Minimum length of 8 characters.
  * At least one uppercase letter.
  * At least one lowercase letter.
  * At least one numerical digit.
  * At least one special symbol.
* **Bcrypt Password Hashing**: Passwords are saved as bcrypt hashes using a work factor of 12. Password comparisons are performed using bcrypt checks.
* **Credentials Cryptography**: Third-party SMS gateways and email sender credentials (Twilio, BulkSMSBD, SMTP server passwords) are encrypted in the database using symmetric AES-256 Fernet encryption (`cryptography.fernet.Fernet`), and decrypted only at execution time.

---

## 2. Session Integrity & Access Control
* **JWT Access Tokens**: Bearer JWT tokens authorize sessions with user details and roles.
* **Session Role Hijacking Guards**: Layout components perform backend session validation queries (`GET /api/admin/verify`) on mounting. Bypassing layouts by spoofing client LocalStorage tokens is blocked.
* **Gated Admin Routes**: Admin signups (`/admin/register`) are nested inside protected views and checked against invite secrets.

---

## 3. Input Validation & Content Sanitization
* **HTML Sanitizer**: Email templates are cleaned using a parser-driven HTML sanitizer (`bleach` & `tinycss2` integrations). It strips `<script>`, `<iframe>`, `<meta>`, and `<object>` elements, deletes all `on*` event handlers, and blocks `javascript:` or `data:` URI schemes while preserving CSS styles.
* **XML Entity Guards**: The Dhru API listener scans XML parameter payloads to block DTD and entity declarations (`<!DOCTYPE`, `<!ENTITY`). This protects the server from XML External Entity (XXE) and Billion Laughs DoS attacks.
* **Transaction Hash Validation**: Incoming payment hashes are validated using regex (`^0x[a-fA-F0-9]{64}$`) before database queries, blocking SQL wildcards.
* **Zip Slip Prevention**: The backup restoration task inspects all zip file entry paths to ensure no target path exits the boundaries of `/app` or `/project_root`.

---

## 4. API Rate Limiting & Throttling
* **SlowAPI Throttling**: The backend integrates SlowAPI rate limiters on endpoints vulnerable to scraping or denial-of-service:
  * Connection diagnostic tests: limited to `5/minute`.
  * Dhru integration endpoints: limited to `120/minute`.
* **Timing-Attack Countermeasures**: Credentials validation on Dhru API endpoints utilizes `secrets.compare_digest` to prevent timing analysis of API tokens.
