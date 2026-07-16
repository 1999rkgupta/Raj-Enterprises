# Raj Enterprises — Full-Stack E-Commerce Platform
## Master Development Prompt (for AI IDE / Coding Agent)

You are an expert full-stack architect and senior engineer. Build a **production-grade, multi-platform e-commerce application** for **Raj Enterprises**, a paints & hardware manufacturing company that sells its own products directly to customers (B2C, factory-direct).

Treat this as a real production system: prioritize security, data integrity, extensibility, and clean architecture over shortcuts. Ask clarifying questions only if something below is genuinely ambiguous — otherwise make sensible, documented assumptions and proceed.

---

## 1. Platforms & Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Python, **FastAPI** (async, auto OpenAPI docs, Pydantic v2 validation) |
| Database | **MongoDB** (Motor async driver), Beanie or raw Motor ODM |
| Web Frontend | **React + TypeScript**, **Redux Toolkit** (+ RTK Query for API/caching) |
| Offline/Local Persistence | **IndexedDB** (via `idb` or Dexie.js) for guest cart, wishlist cache |
| Mobile (Android + iOS) | **React Native** (Expo, bare workflow if native modules needed later) — share types, Redux slices, API layer, and business logic with web via a monorepo package |
| Auth | **Firebase Authentication** — Google Sign-In, Phone (OTP) Sign-In, Email/Password |
| File/Image Storage | Local `/public` folder initially, abstracted via `IMAGE_BASE_URL` env variable so migration to S3/CDN later requires zero code change |
| PDF/Excel Export | `reportlab` or `weasyprint` (PDF), `openpyxl` (Excel) on backend |
| Notifications | Firebase Cloud Messaging (push), abstracted notification service |
| Monorepo Tooling | Turborepo or Nx — `apps/web`, `apps/mobile`, `apps/admin` (optional separate admin app), `packages/shared` (types, API client, Redux slices, validation schemas) |

**Repo structure (recommended):**
```
raj-enterprises/
├── apps/
│   ├── web/              # React + TS storefront + admin panel (or separate admin app)
│   ├── mobile/            # React Native app (Android + iOS)
│   └── api/                # FastAPI backend
├── packages/
│   ├── shared-types/      # TS + Pydantic-mirrored types/interfaces
│   ├── shared-redux/       # Redux slices reused by web & mobile
│   └── api-client/         # Typed API SDK consumed by web & mobile
├── infra/                  # Docker, CI/CD, env templates
└── docs/
```

---

## 2. Core Architectural Principles

1. **Extensible schema design** — every collection must support adding new fields later without migrations breaking existing data (use optional fields, versioned schemas, and a `metadata: Record<string, any>` escape hatch where appropriate).
2. **Single source of truth for auth** — Firebase issues the ID token; FastAPI backend verifies token server-side on every request and resolves the actual `role` from **MongoDB**, never trusting a client-supplied role claim.
3. **Environment-driven configuration** — no hardcoded paths, URLs, or secrets. All image paths, API URLs, Firebase config, and feature flags via `.env`.
4. **Shared business logic** — cart math, price calculation, validation schemas live in `packages/shared-*` so web and mobile behave identically.
5. **Soft delete everywhere** — products and users are never hard-deleted by app-level actions; only `is_active` / `status` flags change. True deletion is a manual DB-only operation, deliberately not exposed via any API endpoint.

---

## 3. Authentication & Authorization

### 3.1 Sign-in Methods
- Google Sign-In (Firebase)
- Mobile number + OTP (Firebase Phone Auth) — **default/primary method for registration**
- Email + Password (settable later from profile)

### 3.2 Account Uniqueness Rules
- One account = one unique `mobile_number` OR one unique `email` at minimum; both fields are unique-indexed when present (`sparse unique index` in MongoDB, since either can be null initially).
- When a user adds an email/mobile later, run a server-side uniqueness check **before** committing — reject with a clear conflict error (`409`) if already tied to another account.
- Registration fields: `name` (required), `mobile` (required), `email` (optional at signup), `shop_name` (optional), `address` (optional).
- Backend must reconcile Firebase UID ↔ Mongo `user_id` via a `firebase_uid` field — never trust client-sent user IDs.

### 3.3 Session & Security Rules
- Access tokens valid, refreshed silently; session persists up to **30 days** with activity.
- Auto-logout / force re-auth if user has been inactive for **10 consecutive days**.
- Passwords (for email/password users) hashed via Firebase itself (never stored in our DB); backend only stores `has_password: bool`.
- **Role enforcement is server-side only.** Every protected endpoint re-validates the caller's role from the DB record tied to their verified Firebase UID — a tampered client-side Redux state can never grant admin access.
- Roles: `super_admin`, `admin`, `customer`. Max **5 admin accounts** (enforced at creation time — 6th admin creation attempt is rejected). Only a `super_admin` can create/remove other admins.
- Rate-limit OTP requests and login attempts (e.g., via Redis or in-memory + IP/device throttling) to prevent abuse.

---

## 4. Data Models (MongoDB Collections — extensible by design)

```python
# users
{
  "_id": ObjectId,
  "firebase_uid": str,          # unique, indexed
  "name": str,
  "mobile": str | None,          # unique sparse index
  "email": str | None,           # unique sparse index
  "shop_name": str | None,
  "address": [Address],          # supports multiple saved addresses
  "role": "customer" | "admin" | "super_admin",
  "profile_image_url": str | None,
  "is_active": bool,
  "notification_opt_in": bool,
  "has_password": bool,
  "created_at": datetime,
  "updated_at": datetime,
  "last_active_at": datetime,
  "metadata": dict               # future-proofing escape hatch
}

# products
{
  "_id": ObjectId,
  "title": str,
  "description": str,
  "category_id": ObjectId,
  "images": [str],               # relative paths, resolved via IMAGE_BASE_URL
  "price": float,
  "stock_count": int,
  "sku": str,
  "status": "active" | "inactive" | "out_of_stock",
  "low_stock_threshold": int,    # drives "few left in stock" UI
  "created_at": datetime,
  "updated_at": datetime,
  "metadata": dict
}

# categories
{ "_id": ObjectId, "name": str, "parent_id": ObjectId | None, "is_active": bool }

# carts (server-side, for logged-in users)
{
  "_id": ObjectId,
  "user_id": ObjectId,
  "items": [{ "product_id": ObjectId, "quantity": int, "selected": bool }],
  "updated_at": datetime
}

# orders
{
  "_id": ObjectId,
  "order_number": str,           # human-readable, sequential
  "user_id": ObjectId,
  "items": [{ "product_id": ObjectId, "title_snapshot": str, "price_snapshot": float, "quantity": int }],
  "delivery_address": Address,
  "order_status": "placed" | "confirmed" | "packed" | "dispatched" | "delivered" | "cancelled",
  "payment_status": "unpaid" | "partial" | "paid",
  "amount_total": float,
  "amount_received": float,
  "payment_history": [{ "amount": float, "date": datetime, "collected_by": ObjectId, "note": str }],
  "expected_delivery_date": datetime,
  "invoice_generated": bool,
  "invoice_url": str | None,
  "created_at": datetime,
  "status_history": [{ "status": str, "changed_by": ObjectId, "timestamp": datetime }]
}

# wishlist
{ "_id": ObjectId, "user_id": ObjectId, "product_ids": [ObjectId] }
```

All collections indexed appropriately (`user_id`, `order_status`, `payment_status`, `created_at`, text index on `title`/`description` for search).

---

## 5. Admin Panel — Feature Requirements

**Dashboard:** sales summary, pending dues, low-stock alerts.

**User Management**
- List all customers and, separately, list all admins.
- Deactivate or permanently delete a user (delete = manual DB-only; app exposes deactivate + "request permanent delete" which is logged, not instantly destructive).
- View a user's order/payment history.

**Product Management**
- Create/update/delete product (delete = soft "inactive"), separate explicit actions for **Mark Inactive**, **Mark Out of Stock**, and **Permanent Delete** (permanent delete restricted/audited, ideally DB-only as specified).
- Multi-image upload, title, description, category, price, stock count.
- Stock auto-decrements when an order is marked **packed** (not at order placement, to avoid holding stock on abandoned/unconfirmed orders — confirm this business rule or adjust).

**Order Management**
- List/search/filter orders by customer name, date range, status, payment status, product.
- Update order status through the pipeline: `confirmed → packed → dispatched → delivered`.
- Record payments against an order (supports partial/multiple payments); auto-computes `payment_status`.
- Dues dashboard: fully paid / partially paid / unpaid customers, with drill-down.
- Generate & download invoice PDF at any point post-confirmation (for dispatch use) and view/download after delivery.
- Export orders/payments/sales data to **Excel** and **PDF**, with the same filters as the list view.

**Sales Reports**
- Daily / weekly / monthly / yearly / custom-year sales views.
- Exportable (Excel/PDF).

---

## 6. Customer (End User) — Feature Requirements

**Landing Page**
- Top nav: logo, menu, profile icon (with initials fallback if no photo) → dropdown with Cart, Wishlist, Order History, Notifications toggle, Edit Profile, Logout.
- Hero image carousel/slider.
- Product grid below hero, filterable by category, searchable, paginated (infinite scroll, 20 items/page).

**Product Browsing**
- Card view: image, title, short description, price, Buy Now, Add to Cart (quantity stepper once added), wishlist toggle, low-stock badge.
- Product detail page: full description, images, Add to Cart / Buy Now (total stock quantity is **not** shown to customers, only availability/low-stock badges).
- Buy Now → adds to cart and routes to cart with that item selected.

**Cart**
- Guest cart persisted client-side (IndexedDB), merged into server-side cart on login (merge strategy: sum quantities or prompt — define based on product decision; default: sum, capped at available stock).
- Per-item checkbox selection (default: all selected) for partial checkout.
- Quantity +/- and manual entry; quantity 0 removes item.
- Max 20 distinct products per cart (quantity per product unrestricted, capped by stock).

**Checkout**
- Cash on Delivery only (payment gateway integration deferred — design the order/payment model so a gateway can be added later without schema rework).
- Address selection/entry.
- Generic estimated delivery time (default 1 week; store as a configurable value per order, not hardcoded, so it can vary later).

**Orders & Invoices**
- Order history with filters (month/year).
- Invoice PDF auto-generated on delivery; downloadable by both customer and admin. Admin can also generate a pre-delivery invoice for dispatch paperwork.

**Notifications**
- Push notification opt-in/out for product/order updates (FCM).

---

## 7. Non-Functional Requirements

- **Security:** OWASP-aligned — input validation via Pydantic, sanitize all user input, rate limiting, HTTPS-only, secure Firebase token verification middleware, RBAC enforced at the API layer (not just UI), audit logs for admin actions (status changes, deletions, payment recording).
- **Performance:** paginated APIs everywhere, indexed queries, image lazy-loading, CDN-ready image path abstraction from day one.
- **Extensibility:** adding a new field to `users` or `products` should require no breaking migration — use optional fields + the `metadata` dict pattern shown above.
- **Testing:** unit tests for backend business logic (stock decrement, payment status computation, uniqueness validation), integration tests for auth flows.
- **Environments:** `.env.example` for dev/staging/prod; seed script with dummy categories, ~15–20 sample products (with placeholder images), and one seeded admin account.

---

## 8. Suggested Build Phases

1. **Foundation** — monorepo setup, FastAPI skeleton, MongoDB connection, Firebase project + auth middleware, shared types package.
2. **Auth & User Management** — registration flows (mobile default), profile completion, admin user management, role enforcement.
3. **Product & Category Management** — admin CRUD, image handling via env-based path, seed data.
4. **Storefront (Web)** — landing page, browsing, search/filter/pagination, product detail, wishlist.
5. **Cart & Checkout** — guest cart (IndexedDB) + server cart + merge logic, COD checkout, address management.
6. **Order Lifecycle & Payments** — admin order management, status pipeline, partial payments, dues dashboard.
7. **Invoicing & Reports** — PDF invoice generation, Excel/PDF exports, sales analytics.
8. **Notifications** — FCM integration, in-app preference toggle.
9. **Mobile App** — React Native app reusing shared packages, platform-specific polish (Android/iOS), push notifications.
10. **Hardening** — security review, load testing, audit logging, staging deployment, app store prep.

---

## 9. Instructions to the AI IDE

- Start by scaffolding the monorepo and shared packages before any feature code.
- Implement backend endpoints with OpenAPI docs and Pydantic schemas first; generate/sync TypeScript types from them where feasible.
- Every admin-only or user-scoped endpoint must include an explicit authorization check — write these as reusable FastAPI dependencies, not repeated inline logic.
- Flag any requirement above where you make an assumption (e.g., stock-decrement timing, guest-cart merge strategy) clearly in code comments or a `DECISIONS.md` file so it can be reviewed.
- Prioritize correctness of the order/payment/stock state machine — this is the most business-critical part of the system.
