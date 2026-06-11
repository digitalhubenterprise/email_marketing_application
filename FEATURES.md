# SmartCampaign SaaS — Complete Feature Ledger

SmartCampaign is an enterprise-grade, high-performance, multi-channel AI Marketing Automation SaaS platform. Hardened for production-ready deployments, it features an interactive glassmorphic interface, multi-channel broadcast layers, dynamic billing engines, and advanced security architectures.

---

## 1. Multi-Channel Asynchronous Broadcast Engines

SmartCampaign facilitates high-speed, scale-ready message dispatches across multiple channels using Celery distributed task queues:

*   **Email Broadcasts**:
    *   Asynchronous multi-recipient campaign broadcasts handled by Celery workers.
    *   Pre-dispatch hourly rate limits compliance scans to prevent spam categorization.
    *   Dynamic delivery throttling (default 50ms) to bypass SMTP gateway rate blocks.
*   **SMS Marketing Suite**:
    *   Direct integration with twilio, vonage, and BulkSMSBD API gateways.
    *   Dynamic credits balance query in BDT/USD directly from provider APIs.
    *   Support for single and bulk campaign dispatch modes.
    *   Multi-Sender ID routing pre-populated from comma-separated configurations.
*   **AI-Scheduled Telegram Rotations**:
    *   Automated promotions scheduled to channels using rotating device IMEI configurations.
    *   Groq AI-powered copywriting for promotional rotations.

---

## 2. Dynamic SaaS Subscription & Billing System

A complete business-to-business subscription tier and account lifecycle engine:

*   **15-Day Free Trial Flow**:
    *   New users default to the `trial` subscription tier with 5,000 email dispatches.
    *   Strict expiration date set to exactly 15 days from registration.
*   **Subscription Expiration Lockout ("All Systems Off")**:
    *   If a user's subscription or trial expires, their tier moves to `expired`.
    *   Access to restricted routers (SMTP settings, contacts, campaigns, email templates, Telegram, SMS) is blocked at the backend with `403 Forbidden` (`SUBSCRIPTION_EXPIRED`) responses.
    *   Global frontend fetch interceptors catch 403 blocks and redirect users to `/billing?expired=true`.
    *   Sidebar navigation items display locks (🔒), operate with 40% opacity, and trigger warning dialogs.
    *   Billing and Wallet views remain open so accounts can be funded and upgraded instantly.
*   **Monthly/Yearly Billing Cycles**:
    *   Support for monthly and yearly cycles. Yearly packages apply a 20% discount.
    *   Celery automated sweeper background task checks and suspends expired accounts every 10 minutes.
*   **Dynamic Wallet & Fraud Prevention**:
    *   Calculates client wallet balance on the server using transactional ledgers:
        $$\text{Wallet Balance} = 25.40 + \sum(\text{paid payments}) - \sum(\text{debit logs})$$
    *   Secures plan upgrades against client-side request tampering.

---

## 3. High-Contrast Interactive User Interface

Built with React, Vite, and Tailwind CSS, featuring rich aesthetics:

*   **Pulsing Skeleton Loaders**:
    *   Replaces generic loading spinners with skeleton views mirroring the metrics, charts, and layout structures for a faster perceived speed.
*   **Staggered Cascading Animations**:
    *   Visual items, cards, and data metrics fade and slide into the viewport sequentially.
*   **Persistent Layout States**:
    *   Local React Suspense boundaries prevent layout flashes and unmounting. Sidebar and navigation remain stable during tab transitions.
*   **Contrast Accessibility Upgrades**:
    *   High-contrast color profiles for light and dark themes to ensure readability on buttons, navigations, and status indicators.

---

## 4. Advanced Security Hardening

Hardened against security threats and penetration vectors:

*   **Secure Cookie Storage**:
    *   JWT session tokens are stored in secure, HttpOnly, SameSite=`Lax` cookies.
*   **Stateless Token Invalidation on Password Update**:
    *   Stores a password hash signature claim (`"pws"`) in JWT payloads.
    *   User and admin route dependencies verify the signature against the database on every request, immediately invalidating active sessions if a password is changed.
*   **SSRF Protection at SMTP Entry**:
    *   Resolves target SMTP hosts to IP addresses, blocking private, loopback (`127.0.0.1`), link-local, and multicast IP ranges.
*   **Decoded XSS Payload Filtering**:
    *   Unescapes HTML entities before checking templates, preventing attackers from bypassing XSS filters using encoded bypasses.
*   **Strict Security Headers**:
    *   Injects Content-Security-Policy (CSP), X-Frame-Options, X-Content-Type-Options, and Referrer-Policy headers to mitigate browser-side attacks.

---

## 5. Super Admin Administration Portal

A complete administrative command center:

*   **Server-Side Layout Gating**:
    *   Prevents layout exposure by verifying admin sessions with the backend before rendering.
*   **Time-Safe Invitation Gate**:
    *   Uses constant-time comparison checks (`secrets.compare_digest`) on admin tokens to prevent timing analysis attacks.
*   **System Diagnostics & Latency Audit**:
    *   Visual representation of Redis broker latency and Celery queue active nodes.
*   **Automated Log Pruning**:
    *   Scheduled Celery beat task runs at midnight daily to prune logs older than 30 days.
