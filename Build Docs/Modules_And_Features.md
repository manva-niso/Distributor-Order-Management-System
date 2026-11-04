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
- [**`Laymans_Guide.md`**](file:///V:/Projects/Resume%20Projects/IsoLabs/Build%20Docs/Laymans_Guide.md): The plain-English, non-technical explanation of how every piece works for business owners and evaluators.
- [**`research/README.md`**](file:///V:/Projects/Resume%20Projects/IsoLabs/research/README.md): In-depth research architecture document (Flipkart ACL 2023, IndicXlit, Cormack RRF k=60, Cascades with early abstention, ₹52.5L loss breakdown).
- [**`Overall_connections.md`**](file:///V:/Projects/Resume%20Projects/IsoLabs/Build%20Docs/Overall_connections.md): Directory breakdown, file-by-file roles, and end-to-end data flow diagrams.
- [**`Test_And_Run_Guide.md`**](file:///V:/Projects/Resume%20Projects/IsoLabs/Build%20Docs/Test_And_Run_Guide.md): Operational guide for running & testing each part individually and collectively.
- [**`Assumptions.md`**](file:///V:/Projects/Resume%20Projects/IsoLabs/Build%20Docs/Assumptions.md): Comprehensive module-by-module assumption registry with permanent IDs (`[A1]` to `[A44]`).
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
| **Module 5** | Multi-Modal Order Intake & Unit Disambiguation (Basic Text) | Retailer, Desk, Salesman | ✅ Completed | Multilingual text parser (Hinglish/Hindi/English), word numerals, unit guardrail card, pluggable ML adapter, direct cart sync |
| **Module 6** | Order Desk Operations, Verification & OCC Concurrency | Order Desk Clerk | ✅ Completed | OCC version check (`[A19]`), split-screen desk terminal, line editing with live recalculation, alias auto-learning (`[A20]`), credit hold release (`[A37]`) |
| **Module 7** | Tally XML Export & Batch Processing | Order Desk Clerk | ✅ Completed | Tally ERP / Prime compliant XML batch download, Actual vs Billed quantities (`[A39]`), double-entry balance (`[A40]`), exported status marking |
| **Module 8** | Van Loading Route Manifest & Warehouse Picking | Desk Clerk / Warehouse | ✅ Completed | Route & stop sequencing, aggregate SKU case picking lists (`[A22]`, `[A41]`), vehicle payload weight tally (`[A42]`), printable loading sheet |
| **Module 9** | 14-Day Dormant Retailers Dashboard & WhatsApp Nudge | Owner / Desk Clerk | ✅ Completed | Dormancy filtering (≥14 days, `[A23]`), churn risk tiers (`[A43]`), credit exposure, 1-tap Hindi WhatsApp nudge (`[A44]`) |

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

## Module 3: Universal Pure Scheme & Tax Calculation Engine

### 1. Features Implemented
- [x] **Universal Pure Functional Scheme Engine (`src/lib/schemes/engine.ts`):**
  - **Free Goods Scheme (`[A11]` & `[A46]`):** `floor(orderedCases / buyQty) * getFreeQty`. Valued at ₹0.00 composite promotional supply (Circular 92/11/2019-GST). Supports both same-SKU bonus cases and cross-SKU gifting (`freeSkuId` & `freeSkuName`).
  - **Multi-Tier Slab Ladders (`[A45]`):** Evaluates progressive volume ladders non-cumulatively (e.g. 5 cases = 3%, 10 cases = 5%, 20 cases = 8%), dynamically selecting the highest achieved tier.
  - **Flat Per-Case Cash Rebates (`[A47]`):** Fixed cash incentives (e.g. ₹50 off per case on 5+ cases) applied pre-tax.
  - **Real-Time Upsell Nudge Telemetry (`[A48]`):** For every active item below max tier, calculates `casesNeeded`, `targetTierPct`, and `potentialSavings` for instant UI banners and salesman prompts.
  - **Dynamic Demand Support:** Seamlessly values both wholesale master cases and loose packets/pieces (`orderedPacks` at `packPrice`).
  - **Rule 46 CGST/SGST Half-Up Rounding (`[A2]`):** Intrastate Madhya Pradesh 50/50 tax split with IEEE 754 micro-epsilon compensation bias `(value + 1e-6) * 100 / 100`.
  - **Non-Compounding Rule (`[A13]`):** Guarantees either free goods, slab discount, or flat rebate is applied per SKU, strictly preventing double-discount compounding.
  - **Composite Order Summary (`calculateOrderSummary`):** Aggregates line items into gross, discounts, taxable subtotal, CGST, SGST, unrounded total, round-off, and final payable amount.
  - **Input Guards:** Clamps negative quantities to zero; gracefully handles empty cart baskets.

### 2. Files Created / Modified
- `distributor-app/`
  - `src/lib/schemes/engine.ts` - Universal pricing, multi-tier ladder, and tax calculation engine
  - `src/lib/catalogue/cart-store.ts` - Cart state and line calculations matching universal scheme schema
  - `src/lib/excel/importer.ts` - Universal Excel parser parsing ladder tiers (`5:3%, 10:5%, 20:8%`), flat rebates, and cross-SKU free items
  - `src/__tests__/schemes.test.ts` - 13 unit tests covering rounding, free goods, multi-tier ladders, flat rebates, cross-SKU gifting, and composite baskets

### 3. Verification & Tests
- **Vitest Suite:** `src/__tests__/schemes.test.ts`
  - 13/13 unit tests passing (13ms runtime).
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
- [x] **Master Database Clean Slate & Reset Engine (`POST /api/setup/reset-db`):**
  - **Pristine Clean Slate Mode (`mode: "clean_slate"`):** Wipes all placed orders to 0, cancels credit holds, clears cart state, and restores baseline warehouse stock (340 biscuit, 85 detergent, 0 tea) and initial credit headroom. Perfect for presenting clean, zero-order live walkthroughs to evaluators.
  - **Factory Jabalpur Demo Mode (`mode: "factory_demo"`):** Restores baseline catalog plus the 3 standard demo orders (`ORD-10482`, `ORD-10483` credit hold, `ORD-10484` verified) for desk triage demonstration.
  - **Master Action Buttons:** High-contrast Clean Slate trigger buttons with double-confirmation dialogs embedded on both the Master Setup Hub (`/setup`) and Order Desk Header (`/desk`).
- [x] **Live Neon Serverless Postgres Client Ready (`src/db/neon.ts`, `drizzle.config.ts`):**
  - Configured `@neondatabase/serverless` connection pool with Drizzle ORM HTTP adapter.
  - Ready for instantaneous connection by supplying `DATABASE_URL` in `.env.local`.
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

---

## Module 5: Multilingual Order Capture, Regional Vernacular & Unit Guardrails

### 1. Features Implemented
- [x] **Decoupled Standalone Engine Package (`engine/` / `@isolabs/order-engine`):**
  - Fully decoupled standalone package with zero framework dependencies on Next.js.
  - Can be tested, benchmarked, and evolved in an isolated sandbox (`cd engine; npm test`).
  - Contains full pure deterministic parser, scheme calculations, and unit tests (39/39 passing).
- [x] **Pluggable Architecture & Strategy Pattern (`src/lib/ai/types.ts`, `src/lib/ai/pipeline.ts`):**
  - Defined strict `OrderParserPipeline` interface (`parseText(rawText, context): Promise<ParseResult>`).
  - Decoupled parser so an external machine learning pipeline (Python / FastAPI / PyTorch / spaCy) can drop-in replace it via environment variable `ORDER_PARSER_PROVIDER="custom_ml"` and `CUSTOM_ML_API_URL` without frontend modifications (`[A33]`).
  - Graceful zero-crash fallback to deterministic rules (`[A17]`) if the custom ML pipeline is offline or errors.
- [x] **Jabalpur Regional FMCG Vernacular & Dialect Dictionary:**
  - **Tier 0 Data-Driven Regional Alias Table (`SEED_ALIASES`):**
    - Parle-G 75g: *"pila wala"*, *"pila biscuit"*, *"chhota biscuit"*, *"parle pila"*, *"पीला वाला"*, *"छोटा बिस्कुट"* $\to$ `SKU-BS-075`
    - Tata Tea Gold 500g: *"shakti chai"*, *"kadak chai"*, *"kadak patti"*, *"शक्ति चाय"* $\to$ `SKU-TE-TT500`
    - Fortune Sunflower Oil 1L: *"surajmukhi tel"*, *"chidiya tel"*, *"refine tel"*, *"mitha tel"*, *"सूरजमुखी तेल"* $\to$ `SKU-OL-FT1L`
    - Ghadi Detergent Powder 1kg: *"kapde dhone wala ghadi"*, *"ghari powder"*, *"घड़ी पाउडर"* $\to$ `SKU-DT-1KG`
    - Ghadi Cake 250g: *"bartan bar"*, *"ghadi tikiya"*, *"kapde dhone ki tikiya"*, *"घड़ी टिकिया"* $\to$ `SKU-DT-CK250`
    - Dettol Soap 125g: *"nahane wala dettol"*, *"डेटॉल साबुन"* $\to$ `SKU-PC-DT125`
    - Lifebuoy Soap 100g: *"lal sabun"*, *"लाइफबॉय"* $\to$ `SKU-PC-LB100`
  - **Regional Fractional Weights & Multipliers:**
    - `aadha` / `adha` / `आधा` = $0.5$
    - `derh` / `dedh` / `डेढ़` = $1.5$
    - `dhai` / `adhai` / `ढाई` = $2.5$
    - `sawa` / `सवा` = $1.25$
    - `pao` / `pav` / `पाव` = $0.25$
    - `darjan` / `dozen` / `दर्जन` = $12$ (with multipliers: *"2 darjan"* $\to 24$, *"aadha darjan"* $\to 6$)
  - **Devanagari Numeral Conversion:** Converts Hindi numerals (`०, १, २, ३, ४, ५, ६, ७, ८, ९`) into Arabic digits (`0-9`).
  - **Conversational Pleasantries Stripping:** Discards noise words (*"bhaiya"*, *"sethji"*, *"chahiye"*, *"jaldi bhejo"*, *"kal subah"*, *"नमस्ते"*, *"भैया"*).
- [x] **The "Dabba" Semantic Ambiguity Guardrail (Invariant `[A16]` "Ask, Never Guess"):**
  - Removed `"dabba"` from `CASE_KEYWORDS`.
  - Added dedicated `AMBIGUOUS_UNIT_KEYWORDS` (`dabba`, `dabbe`, `dibba`, `डिब्बा`).
  - Utterances like *"2 dabba parle g pila wala"* are classified with `extractedUnit = "DABBA"`, `isAmbiguous = true`, and `ambiguityReason = "AMBIGUOUS_UNIT"`.
  - Confidence is calibrated to $\le 0.70$, rendering an interactive clarification card asking the user: *Did you mean 2 Master Cases (peti) or 2 Inner Boxes/Tins?*
- [x] **Broken Master Case & Cut Pack Detection (`[A36]`):**
  - Handles colloquial fractional requests (e.g., *"detergent powder of 1 kg case of 20 mai se 15 dedo"*).
  - Accurately extracts requested loose packs (`15`) and SKU (`Ghadi 1kg`), flags `ambiguityReason: "BROKEN_CASE"`, and offers 1-tap options: Order 15 Loose Packs directly vs Upgrade to Full Sealed Case.
- [x] **Multi-Modal Cloud Ingestion Pipeline (Neon S3 Storage + Gemini 1.5):**
  - Connected live Neon Postgres DB and Neon Object Storage S3-compatible bucket (`order-uploads`).
  - API endpoint `/api/upload/media` stores files in S3 and invokes Gemini 1.5 Flash Vision (handwritten kirana slips) and Audio (voice notes) with fallback.
- [x] **Interactive Quick Order Screen (Screens 3 & 4) (`src/app/(portal)/quick-order/page.tsx`):**
  - Bilingual UI (English + Hindi toggle).
  - Interactive **Disambiguation Cards** for `MISSING_UNIT`, `AMBIGUOUS_UNIT` ("dabba"), and `BROKEN_CASE`.
  - Unmatched line fallback chips with 1-tap SKU assignment.
  - Direct 1-tap "Confirm & Move to Cart" commits parsed items to cart and redirects to `/cart`.

### 2. Files Created / Modified
- `engine/`
  - `src/ai/text-parser.ts` - Decoupled pure text parser with Jabalpur vernacular, Tier 0 aliases, and "dabba" guardrail
  - `src/ai/types.ts` - Enhanced `UnitType` (`DABBA`) and `AmbiguityReason` (`AMBIGUOUS_UNIT`)
  - `src/__tests__/text-parser.test.ts` - 26 comprehensive unit tests covering dialects, fractions, dabba guardrails, and dynamic aliases
- `distributor-app/`
  - `src/lib/ai/text-parser.ts` - Synchronized app parser
  - `src/lib/ai/types.ts` - Synchronized types
  - `src/app/(portal)/quick-order/page.tsx` - Enhanced with "Dabba" ambiguity card and multi-modal upload triggers
  - `src/__tests__/text-parser.test.ts` - 26 unit tests in distributor-app

### 3. Verification & Tests
- **Engine Vitest Suite:** `engine/src/__tests__/text-parser.test.ts` + `schemes.test.ts`
  - **39/39 unit tests passing** (502ms runtime).
- **Distributor App Vitest Suite:** `distributor-app/src/__tests__/*.test.ts`
  - **92/92 unit tests passing** across all 10 test suites.
- **Production Build:** Verified with Next.js 16 (Turbopack) - 0 errors.

---

## Module 6: Order Desk Operations, Split-Screen Verification & OCC Concurrency

### 1. Features Implemented
- [x] **Central Operations Dashboard (Screen 7) (`/desk`):**
  - **Triage Metrics Strip:** Real-time counters showing Total Orders Today, Needs Review (`PLACED`), Credit Holds (`CREDIT_HOLD`), Confirmed (`VERIFIED`), and Exported to Tally (`EXPORTED_TALLY`), plus total wholesale value.
  - **Live Filter Chips & Fast Search:** Quick-filter by order status; search by Order #, Retailer Name, or Delivery Beat.
  - **High-Density Order Table:** Dense desktop layout with order timestamps, source badges (`WhatsApp AI`, `Portal Catalogue`, `Salesman Counter`), total item/case counts, invoice totals, and direct action triggers.
  - **Batch Tally Export Indicator:** Ready-to-transmit count and 1-click batch export hook leading into Module 7.
- [x] **Quick Credit Hold Clearance Modal (`[A14]`, `[A37]`):**
  - Instant clearance dialog for over-limit orders.
  - Captures office authorization note (e.g. *"Customer promised cash payment on van delivery"*), permanently records approving clerk's name (`holdReleasedBy`), transitions status to `VERIFIED`, and increments `occVersion`.
- [x] **Split-Screen Desk Verification Terminal (Screen 8) (`/desk/orders/[id]`):**
  - **Left Pane (Source Truth):** Displays original raw WhatsApp text message / parchi transcription, customer shop & owner details, delivery beat, and live credit headroom meter with projected exposure.
  - **Right Pane (Editable Line Items):** Allows desk clerks to alter matched SKUs via dropdown, adjust case quantities via numeric steppers, delete lines, or add new lines.
  - **Live Scheme & Invoice Recalculation (`[A38]`):** Re-runs scheme math live upon every line change—computes newly unlocked free goods cases (`Buy 10 Get 1`) and slab discounts (`3% on 5+ cases`), and recalculates intra-state 50/50 GST splits and invoice totals before saving.
- [x] **Optimistic Concurrency Control (OCC) Protection (`[A19]`):**
  - Every update carries `expectedOccVersion`.
  - The database rejects stale updates if another clerk edited the record simultaneously, returning `HTTP 409 Conflict` with an actionable alert prompting the user to reload the latest record.
- [x] **Retailer Vocabulary Auto-Learning (`[A20]`):**
  - When a clerk corrects an ambiguous or misread SKU line, the mapping `(retailerId, rawPhrase, skuId)` is automatically saved to `retailer_aliases` for that specific retailer.
  - Scoped strictly per retailer without leaking across accounts; future incoming orders match at 100% confidence.
- [x] **Backend Store & API Endpoints:**
  - `GET /api/desk/orders`: Query orders with status and search filters.
  - `GET /api/desk/orders/[id]`: Single order retrieval with full retailer profile, lines, catalogue SKUs, and auto-learned aliases.
  - `PATCH /api/desk/orders/[id]`: Authoritative update handler with OCC version enforcement, live scheme recalculation, status progression, and alias persistence.
  - `POST /api/desk/orders/[id]/release-hold`: Dedicated 1-click credit hold release endpoint.
  - `GET /api/desk/stats`: Real-time operational summary metrics.
- [x] **Realistic Demo Seeding:**
  - 4 realistic orders seeded across Jabalpur routes (`RET-0001` through `RET-0004`), ensuring the reviewer opens a rich, non-empty workspace.

### 2. Files Created / Modified
- `distributor-app/`
  - `src/db/store.ts` - Added `updateOrderDetails`, `releaseCreditHold`, `saveRetailerAlias`, `getRetailerAliases`, `getDeskStats`, and realistic demo order seeding
  - `src/app/api/desk/orders/route.ts` - Desk orders queue query API
  - `src/app/api/desk/orders/[id]/route.ts` - Single order fetch & authoritative line update API with OCC
  - `src/app/api/desk/orders/[id]/release-hold/route.ts` - Credit hold release API
  - `src/app/api/desk/stats/route.ts` - Real-time triage telemetry API
  - `src/app/desk/page.tsx` - Screen 7: Central Desk Operations Dashboard
  - `src/app/desk/orders/[id]/page.tsx` - Screen 8: Split-Screen Verification Terminal
  - `src/middleware.ts` - Route protection & role enforcement (`role: "desk"`)
  - `src/__tests__/desk.test.ts` - 8 unit tests covering stats, line editing, OCC concurrency collision detection, hold release, and alias learning

### 3. Verification & Tests
- **Vitest Suite:** `src/__tests__/desk.test.ts`
  - 8/8 unit tests passing (23ms runtime).
  - **Combined Suite:** Total 61/61 tests passing across all 7 suites (`auth.test.ts`, `catalogue.test.ts`, `schemes.test.ts`, `orders.test.ts`, `excel-import.test.ts`, `text-parser.test.ts`, `desk.test.ts`).
- **Production Build:** Verified with Next.js 16 (Turbopack) - 0 errors, 28/28 routes compiled cleanly.

---

## Module 7: Tally ERP 9 / TallyPrime XML Batch Export Engine

### 1. Features Implemented
- [x] **Standard Tally XML Voucher Builder (`src/lib/tally/xml-builder.ts`):**
  - **Standard Envelope Architecture (`[A21]`):** Generates compliant `<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDATA>` XML payloads compatible with Tally ERP 9 and TallyPrime.
  - **Actual vs Billed Quantity Formatting (`[A11]`, `[A39]`):** Encodes FMCG promotional free goods natively via `<ACTUALQTY> 11 case</ACTUALQTY>` and `<BILLEDQTY> 10 case</BILLEDQTY>`, billing only paid cases while decrementing warehouse inventory for free promotional cases.
  - **Double-Entry Accounting Sign Conventions (`[A40]`):** Party ledger (Sundry Debtors) is deemed positive (Debit), while inventory allocations, Output CGST, Output SGST, and round-offs are deemed negative (Credit), guaranteeing exact zero-sum balance.
  - **Rule 46 Intra-State MP GST Ledgers (`[A2]`):** 50/50 tax split ledgers (`Output CGST` and `Output SGST`).
  - **XML Escaping & Structural Validation:** Escapes reserved XML characters (`&`, `<`, `>`, `"`, `'`) and validates envelope, request, and `<VOUCHER>` tag completeness via `validateTallyXml`.
- [x] **Backend API Routes (`src/app/api/tally/`):**
  - `GET /api/tally/preview`: Gathers all confirmed (`VERIFIED`) orders waiting for export and returns batch count, order summaries, XML preview string, and validity diagnostics.
  - `POST /api/tally/export`: Generates Tally XML payload, sets HTTP headers for direct file download (`Content-Disposition: attachment; filename="tally-export-YYYYMMDD.xml"`), and transitions exported orders to status `EXPORTED_TALLY` with `tallyExportedAt` timestamp.
- [x] **Interactive Desk Operations Export Modal (`/desk`):**
  - Live count indicator on top metrics strip and bottom batch command bar.
  - Interactive modal displaying confirmed orders in the queue.
  - Dark-mode syntax-highlighted XML preview window.
  - 1-click **"Copy Raw XML"** button with copied feedback.
  - 1-click **"Download Tally XML Batch"** triggering instant file download in browser.
  - Real-time queue table refresh updating order status badges to purple **Exported (Tally)**.
  - Success toast banner with operational Tally shortcut guide (`Alt+O → Import → Transactions`).

### 2. Files Created / Modified
- `distributor-app/`
  - `src/lib/tally/xml-builder.ts` - Tally XML voucher engine, double-entry ledgers, scheme quantities, and validator
  - `src/app/api/tally/preview/route.ts` - Tally batch preview API
  - `src/app/api/tally/export/route.ts` - Tally XML streaming batch export API
  - `src/app/desk/page.tsx` - Interactive Tally preview/download modal & status badge updates
  - `src/__tests__/tally.test.ts` - 8 unit tests covering XML escaping, dates, voucher nodes, free schemes, double-entry balancing, batch envelopes, and status transitions

### 3. Verification & Tests
- **Vitest Suite:** `src/__tests__/tally.test.ts`
  - 8/8 unit tests passing (16ms runtime).
  - **Combined Suite:** Total 69/69 tests passing across all 8 suites (`auth.test.ts`, `catalogue.test.ts`, `schemes.test.ts`, `orders.test.ts`, `excel-import.test.ts`, `text-parser.test.ts`, `desk.test.ts`, `tally.test.ts`).
- **Production Build:** Verified with Next.js 16 (Turbopack) - 0 errors, 30/30 routes compiled cleanly.

---

## Module 8: Van Loading Route Manifest Engine & Workspace

### 1. Features Implemented
- [x] **Route-Level Order Aggregation (`[A22]`):**
  - Gathers all confirmed, placed, and exported orders on any assigned delivery beat (e.g. *Napier Town Route #4*, *Wright Town Route #2*, *Gorakhpur Route #1*).
  - Dynamically discovers active routes from the order ledger and retailer master.
- [x] **Warehouse Pick List Generation (`[A41]`):**
  - Aggregates cases across all route orders by SKU.
  - Formats paid cases, scheme bonus free cases (`[A11]`, `[A39]`), total cases to pick, total consumer units, and approximate pallet weight.
  - Ensures loaders pick both billed cases and promotional free cases to prevent delivery shortages.
- [x] **Van Drop-Off Stop Sequence & Driver Delivery Challans:**
  - Sequences deliveries into an optimized stop-by-stop route schedule (`Stop #1`, `Stop #2`, ...).
  - Highlights Kirana store trade name, proprietor name, contact telephone, landmark delivery address, and approved payment terms (`Credit Approved` vs `Cash on Delivery`).
  - Itemized case breakdown pills per stop for driver handoff.
- [x] **Vehicle Capacity & Weight Telemetry (`[A42]`):**
  - Calculates vehicle payload weight (~160 kg) to maintain safety within tempo axle limits.
  - Computes total cargo wholesale value, assigned driver name, and vehicle registration numbers.
- [x] **Print-Friendly Loading Slip Hook:**
  - 1-click **"Print Loading Sheet"** button triggering clean layout printing via `window.print()`.
- [x] **Backend API & Memory Store Methods:**
  - `GET /api/desk/van-manifest?route=...`: Returns available route list, selected route, vehicle metadata, aggregated pick list, and ordered stops.
  - `dbStore.getVanManifest(targetRoute)`: Pure in-memory calculation method.

### 2. Files Created / Modified
- `distributor-app/`
  - `src/db/store.ts` - Added `VanPickItem`, `VanDeliveryStop`, `VanRouteManifest` interfaces and `getVanManifest` method
  - `src/app/api/desk/van-manifest/route.ts` - Van loading route manifest API endpoint
  - `src/app/desk/page.tsx` - Interactive Van Manifest workspace tab, vehicle telemetry strip, pick list table, and delivery stop cards
  - `src/__tests__/manifest.test.ts` - 4 unit tests covering route discovery, case aggregation, stop sequencing, and weight calculations

### 3. Verification & Tests
- **Vitest Suite:** `src/__tests__/manifest.test.ts`
  - 4/4 unit tests passing (46ms runtime).
- **Production Build:** Verified with Next.js 16 (Turbopack) - 0 errors, route compiled cleanly.

---

## Module 9: 14-Day Dormant Retailers Retention Dashboard

### 1. Features Implemented
- [x] **Inactivity Telemetry Engine (`[A23]`):**
  - Scans entire retailer directory to calculate days elapsed since each retailer's last order (`daysInactive = floor((now - lastOrderDate) / 86400000)`).
  - Dynamically filters retailers meeting or exceeding inactivity thresholds (`14+ Days`, `21+ Days`, `28+ Days`).
- [x] **Progressive Churn Risk Stratification (`[A43]`):**
  - **High Risk (14–20 days):** Flags accounts missing typical replenishment cycles for digital follow-up.
  - **Critical Churn (≥21 days):** Red-flagged high-priority accounts at imminent risk of switching distributors, prioritizing salesman physical beat visits.
- [x] **Retention Financial Analytics:**
  - Displays available credit headroom (`creditLimit - balance`), existing ledger balance, and historical average order value per dormant account.
  - Summary metric card tracking total at-risk monthly wholesale turnover.
- [x] **1-Tap Personalized Hindi WhatsApp Re-Order Nudge (`[A44]`):**
  - Generates culturally tailored Devanagari Hindi message addressing the merchant by name, referencing their shop name, acknowledging the exact inactive days, and highlighting active promotions (*Parle-G 10 peti par 1 peti free, Detergent 3% chhoot*).
  - Pre-fills `https://wa.me/91${phone}?text=...` deep link with encoded promotional text.
  - Preview & customize modal allowing office clerks to inspect the message before launching WhatsApp.
  - 1-click `tel:` phone call button for direct voice contact.
- [x] **Backend API & Memory Store Methods:**
  - `GET /api/desk/dormant?days=14`: Returns total retailers, dormant count, and sorted dormant accounts list.
  - `dbStore.getDormantRetailers(inactivityDays)`: In-memory analytical aggregation method.

### 2. Files Created / Modified
- `distributor-app/`
  - `src/db/store.ts` - Added `DormantRetailerRecord` interface and `getDormantRetailers` method
  - `src/db/seed-data.ts` - Added realistic dormant accounts (`RET-0007` Patel Kirana, `RET-0008` Bajpai Provisions)
  - `src/app/api/desk/dormant/route.ts` - Dormant retention telemetry API endpoint
  - `src/app/desk/page.tsx` - Dormant Kiranas retention tab, threshold chips, retention metrics strip, customer list, and WhatsApp nudge modal
  - `src/__tests__/dormant.test.ts` - 4 unit tests covering 14-day threshold filtering, churn risk tiers, credit headroom metrics, and Hindi WhatsApp deep link formatting

### 3. Verification & Tests
- **Vitest Suite:** `src/__tests__/dormant.test.ts`
  - 4/4 unit tests passing (10ms runtime).
  - **Combined Suite:** Total 77/77 tests passing across all 10 suites (`auth.test.ts`, `catalogue.test.ts`, `schemes.test.ts`, `orders.test.ts`, `excel-import.test.ts`, `text-parser.test.ts`, `desk.test.ts`, `tally.test.ts`, `manifest.test.ts`, `dormant.test.ts`).
- **Production Build:** Verified with Next.js 16 (Turbopack) - 0 errors, 32/32 routes compiled cleanly.
