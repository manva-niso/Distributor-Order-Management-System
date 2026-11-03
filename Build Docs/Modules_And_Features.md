# Core Builds & Module Feature Registry

This document tracks each Core Build Module step by step, its features, implemented files, test verifications, and status.

---

## Architecture & Tech Stack Summary
- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS (Merchant Utility design system: high contrast, 48px touch targets, Inter font)
- **Database:** Neon Postgres / PostgreSQL via Drizzle ORM
- **Auth:** Custom Mobile OTP with Legit SMS provider integration + Dev Console fallback, signed JWT session cookie via `jose`, role-based access control (`retailer`, `salesman`, `desk`)
- **Validation:** Zod schemas for all client & server payloads
- **Testing:** Vitest test suite

### Companion Documentation
- [**`Overall_connections.md`**](file:///V:/Projects/Resume%20Projects/IsoLabs/Build%20Docs/Overall_connections.md): Directory breakdown, file-by-file roles, and end-to-end data flow diagrams.
- [**`Test_And_Run_Guide.md`**](file:///V:/Projects/Resume%20Projects/IsoLabs/Build%20Docs/Test_And_Run_Guide.md): Operational guide for running & testing each part individually and collectively.
- [**`Errors.md`**](file:///V:/Projects/Resume%20Projects/IsoLabs/Build%20Docs/Errors.md): Incident registry tracking root cause analyses and verified fixes.


---

## Module Index & Roadmap

| Module | Name | Primary Persona | Status | Target Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Module 1** | Scaffolding, Database Schema & Auth (Login, OTP, Session) | Retailer, Desk, Salesman | ✅ Completed | App scaffold, Drizzle schema, OTP generation & verification, JWT cookies, Login UI |
| **Module 2** | Retailer Catalogue, Pricing & Live Stock | Retailer, Salesman | ⏳ Pending | Live catalog, search, brand filters, out-of-stock guards, pack/case pricing |
| **Module 3** | Pure Scheme Calculation Engine | System / Cart | ⏳ Pending | Buy X Get Y free, slab tier discounts, GST calculation, unit tests |
| **Module 4** | Cart, Ledger Credit Check & Order Placement | Retailer, Salesman | ⏳ Pending | Cart summary, ledger headroom limit checks, order creation, atomic stock lock |
| **Module 5** | Multi-Modal AI Order Intake & Disambiguation | Retailer, Desk, Salesman | ⏳ Pending | WhatsApp text paste, photo canvas compression, voice note recorder, rules + Gemini fallback, unit clarification |
| **Module 6** | Desk Verification Queue, Line Editing & Concurrency | Order Desk Clerk | ⏳ Pending | OCC version check, inline line edits, alias auto-learning, credit hold approval |
| **Module 7** | Tally XML Export & Batch Processing | Order Desk Clerk | ⏳ Pending | Tally ERP / Prime compliant XML batch download, exported status marking |
| **Module 8** | Van Loading Route Manifest & Warehouse Picking | Desk Clerk / Warehouse | ⏳ Pending | Route & stop sequencing, aggregate SKU case picking lists, vehicle load tally |
| **Module 9** | 14-Day Dormant Retailers Dashboard & WhatsApp Nudge | Owner / Desk Clerk | ⏳ Pending | Dormancy filtering (≥14 days), credit exposure, 1-tap Hindi WhatsApp nudge |

---

## Module 1: Scaffolding, Database Schema & Authentication

### 1. Features Implemented
- [x] Project scaffolding with Next.js 15 (App Router), TypeScript, Tailwind CSS, Lucide / Heroicons / Material icons.
- [x] Database configuration with Drizzle ORM and Neon Postgres client (`@neondatabase/serverless` / `pg`).
- [x] Core schema tables (`users`, `retailers`, `otps`, `audit_logs`).
- [x] Legit OTP service architecture:
  - Secure 6-digit cryptographic OTP generation.
  - Expiry window (5 minutes) and rate limiting (max 3 attempts per 15 minutes).
  - Multi-provider support (Fast2SMS / Twilio webhook / Dev Console logging for local testing).
- [x] Session management:
  - Cryptographically signed JWT session cookie via `jose` (HS256).
  - Role-based payload (`userId`, `role`, `retailerId`, `phone`).
  - Middleware route protection for `/catalogue`, `/cart`, `/orders`, `/desk`.
- [x] Login & Verification Screen (Screen 1):
  - Bilingual UI (English + Hindi toggle).
  - Responsive, high-contrast merchant utility design (48px tap targets, clean borders).
  - 10-digit Indian phone number entry with auto-formatting (`+91`).
  - 6-digit OTP input grid with auto-focus and resend countdown timer.
  - Linked business auto-detection hint.

### 2. Files Created / Modified
- `distributor-app/`
  - `src/db/schema.ts` - Database tables & relations
  - `src/lib/auth/jwt.ts` - Signed JWT session utilities with `jose`
  - `src/lib/auth/otp.ts` - OTP generation, SMS provider interface, verification
  - `src/app/api/auth/send-otp/route.ts` - API endpoint to request OTP
  - `src/app/api/auth/verify-otp/route.ts` - API endpoint to verify OTP & issue cookie
  - `src/app/api/auth/me/route.ts` - Active session profile endpoint
  - `src/app/api/auth/logout/route.ts` - Session termination endpoint
  - `src/app/(auth)/login/page.tsx` - Login screen with OTP input & Hindi toggle
  - `src/middleware.ts` - Route protection & role enforcement

### 3. Verification & Tests
- **Vitest Suite:** `src/__tests__/auth.test.ts`
  - 12/12 unit tests passing (34ms runtime) covering:
    - 6-digit numeric cryptographic generation.
    - 10-digit Indian mobile number validation.
    - 30-second rate-limiting between re-sends.
    - 5-minute expiration checks.
    - Maximum 3 incorrect attempts guard before OTP invalidation.
    - Constant-time comparison preventing timing attacks.
    - Role detection and profile loading (`retailer`, `desk`, `salesman`).
    - Cryptographic JWT session signing & tamper-detection.
- **Production Build:** Verified with Next.js 16 (Turbopack) - 0 errors, all routes statically optimized or server-rendered dynamic.
