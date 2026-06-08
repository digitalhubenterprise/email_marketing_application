# Frontend Security Audit Report

This report presents a thorough security audit of the **SmartCampaign** frontend client application (React / Vite / TypeScript), conducted on **June 8, 2026**.

The scope of this audit covers all key routing components (`App.tsx`), layouts (`Layout.tsx`, `AdminLayout.tsx`), and client-side page views under `frontend/src/pages/`.

---

## 1. Executive Summary

A re-audit of the codebase confirms that there are **6 major security findings** ranging from client-side financial bypasses to local storage session exposure. Because no changes have been applied to the codebase since the initial findings, these vulnerabilities remain active and must be mitigated before deploying the application to production.

### Vulnerability Severity Breakdown
*   🔴 **Critical:** 1 (Client-side trust on payment verifications & subscription upgrades)
*   An attacker can manipulate client-side JavaScript or direct API requests to gain access to premium plans without paying.
*   🟠 **High:** 2 (JWT token storage in LocalStorage, client-side route gating)
*   Admin and user authorization tokens are exposed in localStorage, which can be hijacked via standard XSS.
*   🟡 **Medium:** 2 (Stored XSS template previews, mutable LocalStorage ledger)
*   Malicious scripts inside raw HTML email templates can execute contextually when administrators preview campaigns.
*   🔵 **Low / Info:** 1 (Raw exception metadata leakage in console)

---

## 2. Detailed Findings & Risk Analysis

### 🔴 Finding #1: Critical - Client-Side Trust on Payments & Subscriptions (Financial Bypass)
*   **Affected Files:** 
    *   [`Wallet.tsx`](file:///e:/Work/Development_Projects/email_marketing_application/frontend/src/pages/Wallet.tsx)
    *   [`Billing.tsx`](file:///e:/Work/Development_Projects/email_marketing_application/frontend/src/pages/Billing.tsx)
*   **Vulnerability Mechanism:** 
    1.  `Wallet.tsx` performs public RPC calls on client-side nodes to verify blockchain transactions. If the client's local javascript confirms the txn, it triggers `savePaymentToBackend` which requests backend top-ups.
    2.  `Billing.tsx` handles wallet deduction entirely in the UI context: it checks if local storage balance is enough, subtracts the price, and then issues a `POST /api/auth/upgrade` containing only `{ "tier": selectedTier }`.
*   **Attack Vector:** An attacker can bypass the UI checks entirely. By intercepting or scripting the HTTP request, they can upgrade their tier to "Enterprise" without having any wallet balance or performing real payment transactions.
*   **Remediation:** 
    *   Transition all blockchain txn verification to the server side. The client should only submit the `txhash` and payment gateway info.
    *   The backend must calculate the user's wallet balance from actual database payment records and perform checkout validations securely.

---

### 🟠 Finding #2: High - LocalStorage Session & JWT Storage (XSS Theft Vector)
*   **Affected Files:** 
    *   [`AdminLogin.tsx`](file:///e:/Work/Development_Projects/email_marketing_application/frontend/src/pages/AdminLogin.tsx)
    *   [`AdminLayout.tsx`](file:///e:/Work/Development_Projects/email_marketing_application/frontend/src/components/AdminLayout.tsx)
    *   [`App.tsx`](file:///e:/Work/Development_Projects/email_marketing_application/frontend/src/App.tsx)
*   **Vulnerability Mechanism:** User JWT tokens (`token`) and administrator JWT tokens (`admin_token`) are persistently stored in browser `localStorage`.
*   **Attack Vector:** If an attacker finds a Cross-Site Scripting (XSS) vulnerability anywhere in the application (such as rendering email templates, campaign logs, or injected HTML), they can access `localStorage.getItem("admin_token")` and exfiltrate it, gaining full control over administrative accounts.
*   **Remediation:** 
    *   Set JWT tokens in secure, HttpOnly cookies (`access_token` and `admin_token`) on the backend during authentication.
    *   HttpOnly cookies are inaccessible to client-side scripts, protecting the session from XSS theft.

---

### 🟠 Finding #3: High - Client-Side Gating of Administrative Portal (Access Control Bypass)
*   **Affected Files:** 
    *   [`AdminLayout.tsx`](file:///e:/Work/Development_Projects/email_marketing_application/frontend/src/components/AdminLayout.tsx)
*   **Vulnerability Mechanism:** The client-side routing guard for the administrative panel checks for the presence of `admin_token`, `admin_email`, or `admin_role` in local storage.
*   **Attack Vector:** A regular user can open their browser's dev console and set mock values in localStorage (`localStorage.setItem('admin_token', 'fake_token')`). This tricks the React Router into mounting admin layout screens, exposing the internal UI layout, system configurations, list structures, and routing components. (Note: Secure backend endpoints will still reject API requests, but layout leakage is a security risk).
*   **Remediation:** 
    *   Perform an API session verification request (e.g. `GET /api/admin/verify`) when mounting `AdminLayout` to authenticate the session on the backend before rendering children.

---

### 🟡 Finding #4: Medium - Stored HTML Email Templates Preview (Potential XSS in Admin Views)
*   **Affected Files:** 
    *   [`Templates.tsx`](file:///e:/Work/Development_Projects/email_marketing_application/frontend/src/pages/Templates.tsx)
    *   [`Campaigns.tsx`](file:///e:/Work/Development_Projects/email_marketing_application/frontend/src/pages/Campaigns.tsx)
*   **Vulnerability Mechanism:** Raw HTML blocks from templates are rendered using `dangerouslySetInnerHTML`. While client-side `DOMPurify` is used in previews, the backend does not sanitize the HTML prior to database persistence.
*   **Attack Vector:** An attacker can store templates containing script execution blocks (e.g., `<img src=x onerror=alert(document.cookie)>`). If an administrator reviews this campaign or template inside the admin dashboard, the script will run in their session context.
*   **Remediation:** 
    *   Sanitize raw HTML templates on the backend prior to database storage.
    *   Implement a Content Security Policy (CSP) to block inline script execution.

---

### 🟡 Finding #5: Medium - Insecure Storage of Transactions List in LocalStorage
*   **Affected Files:** 
    *   [`Wallet.tsx`](file:///e:/Work/Development_Projects/email_marketing_application/frontend/src/pages/Wallet.tsx)
*   **Vulnerability Mechanism:** Transaction history ledger summaries are loaded from/saved directly to `localStorage` under `wallet_transactions`.
*   **Attack Vector:** Users can manually alter transaction records in local storage, leading to rendering discrepancies between the UI ledger and actual database values.
*   **Remediation:** 
    *   Always query transaction history dynamically from database endpoints (`GET /api/auth/my-payments`) and render lists from server responses rather than localStorage states.

---

### 🔵 Finding #6: Low - Console Log Metadata Leakage
*   **Affected Files:** 
    *   [`AdminSettings.tsx`](file:///e:/Work/Development_Projects/email_marketing_application/frontend/src/pages/AdminSettings.tsx)
    *   [`AdminUsers.tsx`](file:///e:/Work/Development_Projects/email_marketing_application/frontend/src/pages/AdminUsers.tsx)
*   **Vulnerability Mechanism:** Failed network logs and request exceptions are written directly to console logs using `console.error(err)`.
*   **Attack Vector:** In production, logging raw exceptions can leak internal server folder metadata, endpoint parameters, and tech stacks to users inspecting console logs.
*   **Remediation:** 
    *   Disable verbose console logging in production. 

---

## 3. Security Hardening Status

The vulnerabilities listed above are currently **unpatched** because the implementation plan is awaiting review. 

### Resolution Action Plan
We have a comprehensive implementation plan ready in [implementation_plan.md](file:///e:/Work/Development_Projects/email_marketing_application/implementation_plan.md) which resolves all of the above vulnerabilities. 

Once approved, the following actions will be carried out:
1.  **Backend Cookie Auth Integration**: Set `access_token` and `admin_token` cookies with `HttpOnly`, `Secure`, and `SameSite=Lax` properties on login, and implement secure token parser fallback in dependencies.
2.  **Server-Side Wallet Calculation**: Secure the `/upgrade` route by calculating user wallet balance on the backend directly from database payment logs.
3.  **Admin Layout Session Gate**: Integrate a new `GET /api/admin/verify` endpoint and check it on admin page mounts.
4.  **Backend HTML Sanitization**: Clean template contents when storing templates and campaigns.
5.  **Direct Wallet Log Synced UI**: Bind the frontend ledger dynamically to `/api/auth/my-payments`.
