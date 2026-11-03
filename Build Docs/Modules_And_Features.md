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
- [**`Assumptions.md`**](file:///V:/Projects/Resume%20Projects/IsoLabs/Build%20Docs/Assumptions.md): Comprehensive module-by-module assumption registry with permanent IDs (`[A1]` to `[A23]`).
- [**`Errors.md`**](file:///V:/Projects/Resume%20Projects/IsoLabs/Build%20Docs/Errors.md): Incident registry tracking root cause analyses and verified fixes.


---

## Module Index & Roadmap

| Module | Name | Primary Persona | Status | Target Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Module 1** | Scaffolding, Database Schema & Auth (Login, OTP, Session) | Retailer, Desk, Salesman | ✅ Completed | App scaffold, Drizzle schema, OTP generation & verification, JWT cookies, Login UI |
| **Module 2** | Retailer Catalogue, Pricing & Live Stock | Retailer, Salesman | ✅ Completed | Live catalog, search, brand filters, out-of-stock guards, pack/case pricing |
| **Module 3** | Pure Scheme Calculation Engine | System / Cart | ✅ Completed | Buy X Get Y free, slab tier discounts, GST calculation, unit tests |
| **Module 4** | Cart, Ledger Credit Check & Order Placement | Retailer, Salesman | ✅ Completed | Cart summary, ledger headroom limit checks, order creation, atomic stock lock |
| **Master Setup** | Dynamic Excel Importer & First-Time Onboarding Hub | Distributor, Reviewer | ✅ Completed | Upload custom .xlsx/.csv, 1-click industry presets, live database explorer, downloadable templates |
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
- [x] B2B Retailer Self-Onboarding & Registration (`/register`):
  - Self-service onboarding for new kirana stores across 7 Jabalpur delivery beats.
  - Automatic allocation of ₹25,000 provisional credit limit (`[A5]`).
  - Auto-detection banner on login for unregistered numbers directing to registration.
  - Duplicate phone number prevention (`HTTP 409 Conflict`).

### 2. Files Created / Modified
- `distributor-app/`
  - `src/db/schema.ts` - Database tables & relations
  - `src/db/store.ts` - In-memory and PostgreSQL persistent repository
  - `src/lib/auth/jwt.ts` - Signed JWT session utilities with `jose`
  - `src/lib/auth/otp.ts` - OTP generation, SMS provider interface, verification
  - `src/app/api/auth/send-otp/route.ts` - API endpoint to request OTP
  - `src/app/api/auth/verify-otp/route.ts` - API endpoint to verify OTP & issue cookie
  - `src/app/api/auth/lookup-phone/route.ts` - Phone identity & credit lookup endpoint
  - `src/app/api/auth/register/route.ts` - B2B Retailer onboarding & provisional credit allocation
  - `src/app/api/auth/me/route.ts` - Active session profile endpoint
  - `src/app/api/auth/logout/route.ts` - Session termination endpoint
  - `src/app/(auth)/login/page.tsx` - Login screen with OTP input & Hindi toggle
  - `src/app/(auth)/register/page.tsx` - B2B Kirana registration page with beat routing
  - `src/middleware.ts` - Route protection & role enforcement

### 3. Verification & Tests
- **Vitest Suite:** `src/__tests__/auth.test.ts`
  - 13/13 unit tests passing covering:
    - 6-digit numeric cryptographic generation.
    - 10-digit Indian mobile number validation.
    - 30-second rate-limiting between re-sends.
    - 5-minute expiration checks.
    - Maximum 3 incorrect attempts guard before OTP invalidation.
    - Constant-time comparison preventing timing attacks.
    - Role detection and profile loading (`retailer`, `desk`, `salesman`).
    - Cryptographic JWT session signing & tamper-detection.
    - New B2B kirana self-registration and ₹25,000 provisional credit limit allocation (`[A5]`).
- **Production Build:** Verified with Next.js 16 (Turbopack) - 0 errors, all routes statically optimized or server-rendered dynamic.

---

## Module 2: Retailer Catalogue, Pricing & Live Stock Status

### 1. Features Implemented
- [x] **Live Catalog Engine (`src/lib/catalogue/cart-store.ts`):**
  - Instant client-side cart calculations with persistence to `localStorage`.
  - Dynamic Ex-GST vs Incl-GST price display (`priceInclGst = round(priceExGst * (1 + gstRate/100), 2)`).
  - Pack-to-case calculations (e.g. 24 packs/case) and per-pack unit price breakdown so retailers understand their margin.
  - Automatic scheme indicators: "Buy 10 Get 1 FREE" (`B10G1`) and slab discounts ("Flat 3% Off on 5+ cases").
  - Live stock state enforcement: Green (`IN STOCK`), Amber (`LOW STOCK` ≤10 cases), Red (`OUT OF STOCK`).
  - Strict UI disablement and quantity cap prevents backorders or negative inventory checkouts.
  - Restock notification mechanism (`POST /api/catalogue/notify-restock`) for out-of-stock items (`SKU-TE-250`).
- [x] **Catalogue API Handlers (`src/app/api/catalogue/`):**
  - `GET /api/catalogue`: Returns all active SKUs enriched with schemes, available stock, brand filters, and category groupings. Supports query parameters (`?q=...&brand=...&category=...`).
  - `POST /api/catalogue/notify-restock`: Captures retailer phone and SKU ID when out-of-stock items are requested.
- [x] **Screen 2 UI (`src/app/(portal)/catalogue/page.tsx`):**
  - Header with Retailer Name (`Sharma Kirana Store`), Route badge (`Van 4 - Napier Town`), and Credit headroom ticker (`₹38,000 credit remaining`).
  - Search input with debounce and 1-tap clear button.
  - Brand filter pills (`All`, `Brand A - Food`, `Brand B - Detergents`, `Brand C - Beverages`, `Brand D - Personal Care`).
  - SKU Product Cards with high-contrast typography, clear stock chips, scheme tags, pack breakdown, quantity stepper (`-` / count / `+`), and out-of-stock guard.
  - Sticky bottom cart bar showing active item count, total price (Ex-GST & Incl-GST), and 1-tap checkout transition button.
  - Bilingual Hindi/English language toggle preserved across views.
- [x] **Navigation (`src/components/layout/BottomNav.tsx`):**
  - Persistent 48px touch-target mobile bottom navigation bar (`Catalogue`, `Quick Order AI`, `Cart`, `Orders`).
  - Real-time badge counter on Cart icon.

### 2. Files Created / Modified
- `distributor-app/`
  - `src/lib/catalogue/cart-store.ts` - Cart state store & calculation math
  - `src/app/api/catalogue/route.ts` - Live catalogue API with search & filters
  - `src/app/api/catalogue/notify-restock/route.ts` - Restock notification trigger
  - `src/components/layout/BottomNav.tsx` - 4-tab mobile bottom navigation bar
  - `src/app/(portal)/catalogue/page.tsx` - Screen 2 Retailer catalogue UI
  - `src/__tests__/catalogue.test.ts` - 8 unit tests covering catalogue & cart logic

### 3. Verification & Tests
- **Vitest Suite:** `src/__tests__/catalogue.test.ts`
  - 8/8 unit tests passing (20ms runtime) covering:
    - Ex-GST to Incl-GST rounding accuracy.
    - Pack price calculation from case rate.
    - Stock quantity bounds checking & prevention of negative orders.
    - Buy 10 Get 1 free computation.
    - 3% slab tier discount activation on 5+ cases.
    - Cart total aggregation and item addition/removal.
  - **Combined Suite:** Total 20/20 tests passing across all suites (`auth.test.ts` + `catalogue.test.ts`).
- **Production Build:** Verified with Next.js 16 (Turbopack) - 0 errors, `/catalogue` route compiled cleanly.

---

## Module 3: Pure Scheme & Pricing Calculation Engine

### 1. Features Implemented
- [x] **Pure Functional Scheme Engine (`src/lib/schemes/engine.ts`):**
  - **Free Goods Scheme (`[A11]`):** `floor(orderedCases / buyQty) * getFreeQty`. Valued at ₹0.00 promotional supply. Delivered total = `orderedCases + freeCases`.
  - **Slab Tier Cash Discount (`[A12]`):** Applies percentage discount pre-GST once minimum threshold cases are reached (e.g. 3% off on 5+ cases of Detergent).
  - **Rule 46 CGST/SGST Half-Up Rounding (`[A2]`):** Intrastate Madhya Pradesh 50/50 tax split with IEEE 754 micro-epsilon compensation bias `(value + 1e-6) * 100 / 100`.
  - **Non-Compounding Rule (`[A13]`):** Guarantees either free goods or slab discount is applied per SKU, strictly preventing double-discount compounding.
  - **Composite Order Summary (`calculateOrderSummary`):** Aggregates line items into gross, discounts, taxable subtotal, CGST, SGST, unrounded total, round-off, and final payable amount.
  - **Input Guards:** Clamps negative quantities to zero; gracefully handles empty cart baskets.

### 2. Files Created / Modified
- `distributor-app/`
  - `src/lib/schemes/engine.ts` - Core pure function pricing & scheme calculation engine
  - `src/__tests__/schemes.test.ts` - 10 unit tests covering edge cases, rounding, and scheme mechanics

### 3. Verification & Tests
- **Vitest Suite:** `src/__tests__/schemes.test.ts`
  - 10/10 unit tests passing (14ms runtime) covering:
    - Half-up rounding utility with binary floating-point precision verification.
    - Buy 10 Get 1 free at 9, 10, and 25 cases.
    - 3% slab tier activation at 4 and 5 cases.
    - 5% GST bracket items (Tea leaf: 2.5% CGST + 2.5% SGST).
    - Multi-item mixed composite cart invoice summary.
    - Round-off discrepancy handling.
    - Negative quantity clamping and empty array resiliency.
  - **Total Repository Tests:** 31/31 unit tests passing across all 3 suites (`auth.test.ts`, `catalogue.test.ts`, `schemes.test.ts`).

---

## Module 4: Cart, Ledger Credit Check & Order Placement

### 1. Features Implemented
- [x] **Screen 5 UI (`src/app/(portal)/cart/page.tsx`):**
  - **Live B2B Credit Headroom Meter (`[A14]`):** Visual progress bar displaying existing balance, current order addition, projected exposure, and available headroom.
  - **Zero Dead Buttons Policy (`[A29]`):** Orders exceeding credit limits remain submittable, flagging an amber `CREDIT_HOLD` alert for Order Desk clearance rather than blocking merchant checkout.
  - **Interactive Line Editing:** Quantity steppers, pack/case count conversion, scheme indicator cards (Free goods & slab discounts), and instant removal.
  - **Commercial Tax Invoice Breakdown:** Itemized gross amount (Ex-GST), scheme savings, taxable value, CGST (50%), SGST (50%), round-off, and net payable.
  - **Dispatch Cutoff Timer (`[A1]`):** 2:00 PM cutoff notice for next morning van milk-run delivery.
  - **Zero-Friction Checkout:** Direct submission to `POST /api/orders/checkout`, clears draft cart, and transitions to order confirmation view.
- [x] **Order Placement Backend API (`src/app/api/orders/checkout/route.ts`):**
  - Validates authenticated session and retailer identity.
  - Enforces physical warehouse stock bounds on both ordered master cases and promotional free goods cases (`[A30]`).
  - Evaluates commercial invoice via pure calculation engine.
  - Checks credit headroom: sets initial order status to `PLACED` or `CREDIT_HOLD`.
  - Atomically deducts stock from `skus` store and records order in `orders` and `order_items` tables with initial `occ_version: 1`.
  - Atomically increments retailer `currentBalance` and updates `lastOrderAt`.
- [x] **Orders List & Tracking Screen (`src/app/(portal)/orders/page.tsx`):**
  - Real-time status badges: `PLACED` (Green), `CREDIT_HOLD` (Amber), `VERIFIED` (Blue), `EXPORTED_TALLY` (Purple).
  - Displays van delivery route assignment, timestamp, case tally, promotional free goods breakdown, and itemized invoice totals.
  - Celebratory toast upon redirect from successful checkout (`?placed=ORD-...`).
  - Accessible via mobile bottom navigation (`BottomNav`).
- [x] **Orders Query API (`src/app/api/orders/route.ts`):**
  - Scoped retrieval: Retailers fetch only their orders; desk clerks fetch all incoming beat orders.

### 2. Files Created / Modified
- `distributor-app/`
  - `src/db/store.ts` - Added `createOrder`, `getOrderById`, `getOrdersByRetailerId`, `updateOrderStatus`, and `deductSkuStock`
  - `src/app/api/orders/checkout/route.ts` - Order placement & credit validation API
  - `src/app/api/orders/route.ts` - Order query API
  - `src/app/(portal)/cart/page.tsx` - Screen 5 Cart & Credit Headroom review UI
  - `src/app/(portal)/orders/page.tsx` - Orders history and status tracking UI
  - `src/components/layout/BottomNav.tsx` - Enhanced with `activeTab` and default export
  - `src/__tests__/orders.test.ts` - 4 unit tests covering order creation, credit holds, anti-backorder guards, and OCC versioning

### 3. Verification & Tests
- **Vitest Suite:** `src/__tests__/orders.test.ts`
  - 4/4 unit tests passing covering:
    - Successful order placement within credit limit, free goods deduction, and ledger balance update.
    - Automatic `CREDIT_HOLD` status flagging when projected balance exceeds credit limit (`[A14]`).
    - Anti-backorder physical inventory protection (`[A9]`).
    - OCC version increment and stale update conflict rejection (`[A19]`).
  - **Total Repository Tests:** 35/35 tests passing across all 4 suites (`auth.test.ts`, `catalogue.test.ts`, `schemes.test.ts`, `orders.test.ts`).
- **Production Build:** Verified with Next.js 16 (Turbopack) - 0 errors, `/cart` and `/orders` compiled cleanly.

---

## Master Data Setup & Dynamic Excel Ingestion Engine

### 1. Features Implemented
- [x] **Universal Excel / CSV Parser (`src/lib/excel/importer.ts`):**
  - Robust multi-tab workbook ingestion using `xlsx` (SheetJS) supporting `.xlsx`, `.xls`, and `.csv`.
  - Header normalization and synonym tolerance (`[A32]`): automaps *"Rate"* / *"Wholesale Price"* $\to$ Dealer Price, *"Case Pack"* $\to$ Units Per Case.
  - Automatically parses trade schemes: Free Goods (`Buy 10 Get 1`) and Slab Discounts (`3% on 5+ cases`).
  - Automatically computes per-pack unit rates from case wholesale prices.
  - Generates downloadable sample `.xlsx` template files with realistic FMCG items and kirana accounts (`GET /api/setup/template`).
- [x] **Store Batch Mutation Engine (`src/db/store.ts`):**
  - `importSkus(skus, mode)`: Dynamic catalog replacement or merging.
  - `importRetailers(retailers, mode)`: Dynamic customer ledger ingestion with auto-provisioned user login accounts.
  - `getStoreStats()`: Real-time telemetry (total SKUs, active kiranas, warehouse cases, total wholesale value).
- [x] **Master Data Hub UI (`src/app/setup/page.tsx`):**
  - **Live Inventory Telemetry Strip:** Displays active SKUs, kirana counters, total stock cases, and warehouse value.
  - **Drag & Drop Upload Zone:** Ingests Excel workbooks with replacement or merge strategy.
  - **1-Click Realistic Industry Presets:**
    - Preset 1: *Company A Master* (12 realistic SKUs + 6 Kiranas across Jabalpur delivery routes).
    - Preset 2: *Grocery & Packaged Foods* (Biscuits, Tea, Edible Oil, Noodles).
    - Preset 3: *Home Care & Detergents* (Ghadi, Surf Excel, Laundry cakes, Dettol soap).
  - **Live Database Explorer:** Searchable, real-time tables showing loaded SKUs and Kirana credit balances with 1-click login links.
- [x] **Login Screen Directory & Account Switcher:**
  - Displays dynamic directory of all currently loaded Kirana counters with available credit badges and 1-tap test login.
  - Direct callout linking to `/setup` for immediate Excel onboarding.

### 2. Files Created / Modified
- `distributor-app/`
  - `src/lib/excel/importer.ts` - Excel parsing, validation, and template generation library
  - `src/app/api/setup/import-excel/route.ts` - Multipart Excel ingestion API
  - `src/app/api/setup/template/route.ts` - Downloadable Excel template generator API
  - `src/app/api/setup/status/route.ts` - Real-time store telemetry and records API
  - `src/app/api/setup/load-preset/route.ts` - 1-click industry preset loader
  - `src/app/setup/page.tsx` - Master Data Setup & Excel Importer UI
  - `src/app/(auth)/login/page.tsx` - Enhanced with Master Setup banner & dynamic accounts directory
  - `src/db/seed-data.ts` - Enriched with 12 realistic FMCG SKUs and 6 Jabalpur Kiranas
  - `src/db/store.ts` - Added batch import and telemetry methods
  - `src/__tests__/excel-import.test.ts` - 4 unit tests covering template generation, parsing, synonym matching, and catalog replacement

### 3. Verification & Tests
- **Vitest Suite:** `src/__tests__/excel-import.test.ts`
  - 4/4 unit tests passing (59ms runtime).
  - **Combined Suite:** Total 39/39 tests passing across all 5 suites (`auth.test.ts`, `catalogue.test.ts`, `schemes.test.ts`, `orders.test.ts`, `excel-import.test.ts`).
- **Production Build:** Verified with Next.js 16 (Turbopack) - 0 errors, `/setup` and `/api/setup/*` compiled cleanly.
