# SmartCampaign — Frontend User Features Documentation

This document describes the user-facing frontend architecture, components, and layout interfaces of the **SmartCampaign** SaaS email marketing platform.

---

## 1. Dashboard & Campaign Console
The user dashboard provides a modern, glassmorphic layout displaying quick analytics, campaign statuses, and marketing lists:
* **Interactive Summary Tiles**: Real-time counters showing total sent emails, active contacts, and system notifications.
* **Campaign History Table**: List of manually triggered or automated campaigns with delivery rate progress bars and status indicators.
* **Quick Actions**: Shortcuts to import contacts, select an email template, or check transaction logs.

---

## 2. Wallet & Financial Management (`/wallet`)
Wallet balances are managed securely via blockchain transaction validation:
* **Deposit Portal**: Supports TRC20 and BEP20 cryptocurrency transactions.
* **Secure TXHash Submission**: Users enter their transaction hash (`txhash`), which is sent to the backend for direct smart contract verification, preventing client-side verification bypasses.
* **Transaction History**: Real-time list of billing records showing status, amount credited, and block confirmations.

---

## 3. Subscription Billing & Plans (`/billing`)
A premium plan selection panel allowing users to upgrade or downgrade limits:
* **Subscription Tiers**:
  * **Starter (Free)**: 5,000 emails/month, 1 SMTP server configuration.
  * **Standard**: 50,000 emails/month, 3 SMTP servers configuration.
  * **Premium**: 200,000 emails/month, 5 SMTP servers configuration.
  * **Enterprise**: Unlimited emails, customSMTP routing.
* **Server-Side Balance Validation**: Submitting an upgrade checks the wallet balance on the backend DB transaction layer, preventing billing cheats.

---

## 4. Contact Lists & CSV Importer (`/contacts`)
Contact database management with performance-focused features:
* **File Uploads**: Supports importing `.csv` and `.txt` files containing email lists.
* **Streaming Processing**: Utilizes chunked file parsing to handle large lists of contacts without causing memory overflows.
* **List Management**: Create custom lists, search contacts by email, view individual contact logs, and delete lists.

---

## 5. Visual Email Template Builder (`/templates`)
A comprehensive, responsive visual template designer:
* **Grid Layout Selection**: Choose from preset email layouts (Welcome, Promotion, Newsletter, Blank).
* **Interactive Drag-and-Drop Canvas**:
  * Visual email preview frame with hover borders.
  * Inline blocks: Text block, image block, button block, divider, spacer, social media icons, and two/three column layouts.
  * Block controls: Move blocks up/down, clone blocks, or delete blocks directly from the canvas.
* **Inspector Properties Panel**:
  * Customize colors (background, text, button), font size, text alignment, spacing, padding, and URLs.
* **Mobile Bezel Preview Frame**:
  * Toggle between Desktop view and an interactive Mobile phone mockup.
  * The mockup features a notch, cellular/WiFi indicators, and a status bar for realistic preview testing.
* **HTML Code Mode**: Toggle raw HTML source view to edit template codes directly.

---

## 6. Mobile & Tablet Responsiveness
The visual email builder adapts dynamically for small screen sizes:
* **Segmented Tab Bar**: On screens under `1024px`, the layout collapses into three tabs: `Design` (for choosing blocks), `Canvas` (for editing), and `Preview` (for checking results) to avoid endless vertical scrolling.
* **Touch Optimization**: Actions and controls remain visible on selection rather than relying on hover states, facilitating smooth mobile interaction.
