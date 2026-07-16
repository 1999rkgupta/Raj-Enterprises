# Raj Enterprises — Design Decisions & Assumptions

This document captures all assumptions and design decisions made during development.
Marked with 🔒 for confirmed decisions and ⚠️ for assumptions that should be reviewed.

---

## Architecture

### 🔒 Monorepo Structure (Turborepo)
- `apps/web` — Customer-facing storefront (React + Vite, port 5173)
- `apps/admin` — Separate admin panel (React + Vite, port 5174)
- `apps/api` — FastAPI backend (port 8000)
- `apps/mobile` — React Native scaffold (Phase 9)
- `packages/shared-types` — TypeScript interfaces mirroring Pydantic models
- `packages/api-client` — Axios-based typed API SDK
- `packages/shared-redux` — Redux Toolkit slices shared across web and mobile

### 🔒 Admin as Separate App
Per user decision: admin panel is a separate Vite app at `apps/admin` (port 5174), not a route within the web app. This allows independent deployment and access control.

---

## Authentication & Authorization

### 🔒 Firebase + MongoDB Reconciliation
- Firebase handles authentication (Google, OTP, Email/Password)
- Backend verifies Firebase ID token on every request
- User role is ALWAYS resolved from MongoDB, never from client-supplied claims
- `firebase_uid` field in users collection links Firebase ↔ MongoDB

### 🔒 Session Management
- Activity-based: auto-logout after 10 consecutive inactive days
- Session max lifetime: 30 days
- Passwords never stored in our DB; `has_password: bool` flag only

### 🔒 Admin Account Limits
- Maximum 5 admin accounts (excluding super_admin)
- Only super_admin can create/remove admins
- Enforcement at API level (not just UI)

---

## Business Rules

### 🔒 Stock Decrement Timing
**Stock decrements when order status changes to "packed", NOT at order placement.**

Rationale: Prevents holding stock on abandoned/unconfirmed orders. Trade-off: two concurrent pack operations could theoretically conflict, so we validate stock availability at pack time and reject with a clear error if insufficient.

### 🔒 Guest Cart Merge Strategy
**Sum quantities, capped at available stock.**

When a guest user logs in, their IndexedDB cart is merged with the server cart:
- If a product exists in both, quantities are summed
- Total quantity per product is capped at available stock
- If server cart is at 20-item limit, remaining guest items are silently dropped

### 🔒 Cart Limits
- Max 20 distinct products per cart
- Quantity per product is unrestricted, capped only by stock

### 🔒 Soft Delete Everywhere
Products and users are never hard-deleted via API:
- Products: status changes to "inactive" (separate from "out_of_stock")
- Users: `is_active` set to false
- Permanent deletion is a manual DB-only operation (not exposed via any endpoint)

### ⚠️ Order Cancellation Stock Reversal
When an order is cancelled AFTER being packed (or dispatched), stock is automatically restored. This assumes the physical product can be recovered. If cancellation after dispatch should NOT restore stock, this logic needs adjustment.

---

## Payment

### 🔒 Cash on Delivery (COD) Only
Payment gateway integration deferred. The order/payment model is designed for future gateway integration:
- `payment_status` auto-computed from `amount_received` vs `amount_total`
- `payment_history` array supports multiple partial payments
- Adding a gateway later requires adding a `payment_method` field and webhook handler — no schema rework

### 🔒 Payment Status Auto-Computation
- `unpaid`: amount_received = 0
- `partial`: 0 < amount_received < amount_total
- `paid`: amount_received >= amount_total

---

## Order Number Format
Sequential, human-readable: `RE-YYYYMM-XXXXX` (e.g., RE-202607-00001)
Resets sequence each month. Unique index ensures no collisions.

---

## Image Storage
Starting with local `/public/uploads` directory. All image paths stored as relative paths (e.g., `products/abc123.jpg`), resolved via `IMAGE_BASE_URL` environment variable. Migration to S3/CDN requires only changing the env variable — zero code change.

---

## Delivery Estimation
Default: 7 days from order date. Stored as a configurable value per order (`expected_delivery_date`), not hardcoded. Can vary per order in the future.

---

## Invoice Generation
- PDF generated on-demand via reportlab
- Available to admin at any point post-confirmation (for dispatch paperwork)
- Auto-available to customer after delivery
- Stored as file path in order document

---

## Notifications
- Firebase Cloud Messaging (FCM) for push notifications
- User-level opt-in/out via `notification_opt_in` field
- Implementation in Phase 8

---

*Last updated: Phase 1 (Foundation)*
