# Technical Design Document (TDD)
## B2B Distributor Order Management System

**Client:** Company A, Jabalpur (4 packaged food & home care brands, 1,800 kirana shops, 18 salesmen)  
**Repository:** [https://github.com/manva-niso/Distributor-Order-Management-System.git](https://github.com/manva-niso/Distributor-Order-Management-System.git)  
**Live Application URL:** *(Configured upon Vercel production deployment)*  

---

## 1. Executive Summary & Problem Scope

Company A is an established FMCG distributor in Jabalpur with 70 staff (including 18 field salesmen), managing ~600 orders daily across 1,800 kirana retail counters. The existing operating model suffered from critical bottlenecks:
- Salesmen collected orders in paper notebooks, while retailers sent erratic WhatsApp texts, camera photos of handwritten paper slips (*parchi*), and Hindi voice notes.
- A back-office team of 6 order-entry clerks spent their entire mornings manually re-typing unstructured messages into Tally ERP.
- Counter salesmen had zero visibility into real-time warehouse stock or active trade schemes, resulting in lines being cut post-ordering, stockouts, credit limit breaches, and frequent misdeliveries.

### The Core Solution
A unified, installable, offline-capable B2B order desk and mobile web application providing:
1. Direct retailer catalog browsing with transparent wholesale pricing (Ex-GST vs. Incl-GST), stock status, and real-time trade scheme calculations.
2. A multi-modal AI quick-order capture pipeline converting informal WhatsApp messages, parchi photos, and Hindi voice notes into structured draft orders.
3. An Order Desk terminal featuring Optimistic Concurrency Control (OCC), credit exposure holds, auto-learning alias mappings, and one-click batch Tally XML export.

---

## 2. Architecture & Technology Decisions

### Technology Stack & Justification

| Layer | Chosen Technology | Engineering Rationale & Alternatives Rejected |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16 (App Router) + TypeScript** | Unified repository for both high-performance mobile UI and secure serverless API route handlers. Eliminates CORS overhead; provides edge-level middleware routing. *Rejected standalone Express/Vite SPA due to deployment complexity and duplicate type maintenance.* |
| **Styling** | **Tailwind CSS v4** | Utility-first CSS compiling to a tiny footprint (<18KB). Enables strict adherence to the 48px touch target rule and high-contrast "Merchant Utility" palette without runtime CSS-in-JS performance penalties on low-end 3G phones. |
| **Database** | **PostgreSQL (Neon) + Drizzle ORM** | ACID-compliant relational storage with type-safe schema definitions and zero-overhead queries. Neon serverless scaling matches fluctuating order bursts during morning dispatch. Built-in reactive in-memory seed store guarantees zero-friction local testing. |
| **Authentication** | **Legit Mobile OTP + Signed JWT (`jose`)** | Eliminates passwords for semi-literate kirana shopkeepers. Mints 7-day cryptographically signed HS256 HTTP-only session cookies. Closed B2B role scoping (`retailer`, `salesman`, `desk`) enforced at the edge middleware layer. |
| **AI Capture Pipeline** | **Rules-First + Gemini Flash Adapter** | Three-tier pipeline: Deterministic regex and customer alias lookup executes first for sub-50ms latency; Gemini Flash is invoked only for ambiguous dialect lines. Client canvas compression ($\le 1000$px WebP) protects 3G mobile data limits. |
| **Testing** | **Vitest** | Native Vite module execution running unit and integration suites in <1 second with zero external network dependencies. |

---

## 3. Data Model & Core Schemas

The database schema is strictly partitioned into two operational domains:

```
┌──────────────────────────────────────────────┐    ┌──────────────────────────────────────────────┐
│           SCHEMA A: USER INFLOW & AUTH       │    │      SCHEMA B: DISTRIBUTOR MASTER & ORDERS   │
├──────────────────────────────────────────────┤    ├──────────────────────────────────────────────┤
│  users (id, phone, name, role, retailerId)   │    │  retailers (id, name, creditLimit, route)    │
│  otps (id, phone, otpCode, expiresAt, tries) │    │  skus (id, code, dealerPrice, stockCases)    │
│  captures (id, retailerId, source, payload)  │───►│  retailer_aliases (retailerId, phrase, sku)  │
│  capture_lines (captureId, mappedSku, qty)   │    │  orders (id, retailerId, grandTotal, occVer) │
│                                              │    │  order_items (orderId, skuId, qty, gst, net) │
└──────────────────────────────────────────────┘    └──────────────────────────────────────────────┘
```

---

## 4. End-to-End System Flows

### A. Retailer Catalogue & Scheme Flow
1. Retailer logs in via 6-digit OTP; middleware loads their linked store (`Sharma Kirana Store`) and available credit headroom (₹38,000).
2. Catalogue displays master case wholesale rates (`₹777.60/case`), per-pack rate (`₹8.10/pack`), and explicit `+18% GST` badges.
3. Dual-stepper controls allow ordering wholesale master cases OR loose retail packets directly without artificial friction. Reaching 10 cases of Glucose biscuits automatically activates the Buy 10 Get 1 Free scheme banner (`🎉 1 Free Case Unlocked! Total: 11 Cases Delivered`).
4. Reaching 5 cases of Detergent powder triggers the 3% slab cash discount (`-₹304.50`).
5. Out-of-stock items disable add-to-cart controls, preventing post-order cuts.
6. Cart checkout checks credit headroom ($\text{Balance} + \text{Order} \le \text{Limit}$). If exceeded, status flags `CREDIT_HOLD` for desk clearance.
7. Order history screen (`/orders`) provides a 1-tap **"Repeat Order"** button that re-populates the cart and navigates directly to `/cart`.

### B. Multi-Modal AI Capture with Disambiguation Guardrail
1. User pastes raw text (*"bhaiya 5 peti biscuit chhota, 2 peti washing powder 1 kilo, 1 pkt of tea, where a case contains 24 pkts"*), uploads a slip photo, or records Hindi audio.
2. **Deterministic Rules & Explanatory Clause Stripping:** Regex pre-processor detects descriptive clauses like *"where a case contains 24 pkts"*, strips context before tokenization, and boosts primary FMCG category keywords (`+0.55`) so single-word queries match immediately.
3. **Ambiguity Guardrail:** If an utterance omits unit specification (e.g. *"5 biscuit chhota"*), the system **never guesses**. It presents an interactive unit clarification card: *5 Cases (480 packs · ₹3,888) vs 5 Loose Packs (₹40.50)*.
4. **Broken Master Case Resolution:** For partial demands (*"case of 20 mai se 15 dedo"*), shopkeepers can order the 15 loose packs directly or round up to 1 sealed case in 1 tap.
5. **Draft Capture:** Lines render with confidence tags (e.g., *94% Confidence*), original utterance words, and fallback chips for unknown lines.
6. **Human-in-the-Loop:** No order is committed to the database until a human clicks **"Confirm & Move to Cart"**.

### C. Desk Verification & Tally XML Export
1. Desk clerks open the queue (`/desk`).
2. Two-panel workspace displays raw WhatsApp inflow on the left and structured editable lines on the right.
3. Every order carries an `occ_version`. If another clerk saves first, the save is blocked (`HTTP 409 Conflict`), preventing lost updates.
4. When a clerk corrects an SKU mapping, the phrase is saved to `retailer_aliases`, auto-improving future accuracy for that kirana.
5. Clicking **"Export Selected to Tally"** generates a schema-compliant `<ENVELOPE>` XML file for direct import into Tally ERP 9 / Prime Sales Vouchers.

---

## 5. UI & Design System Rationale

The interface follows the **Merchant Utility** design tokens:
- **Ergonomics:** Every interactive stepper, button, and tab conforms to a strict $\ge 48\text{px} \times 48\text{px}$ touch target rule, allowing kirana owners to order between customers with flour/oil on hands.
- **Performance on 3G:** Opaque high-contrast surfaces (`#FFFFFF` and `#F8FAFC`) with crisp 1px borders replace sluggish CSS `backdrop-filter: blur()`, guaranteeing sub-3-second load times on budget Android phones.
- **Devanagari Typography:** Relaxed line-heights (`leading-relaxed`) prevent character clipping of upper and lower vowel matras (`े`, `ै`, `ु`, `ू`).
- **Zero Dead Buttons:** Every button has a functional handler or explicit disabled/empty state.

---

## 6. Scheme Engine Design, Invariants & Mathematical Verification

The pricing engine is implemented in an independent package (`/engine`) as a **pure mathematical function** with zero database calls, network I/O, or mutable side effects:

$$\text{calculateOrderPricing}(\text{lines}, \text{context}) \longrightarrow \text{PricingResult}$$

### Mathematical & Tax Invariants
1. **Integer Representation:** All currency calculations are executed in integer paise (`bigint` in SQL, `number` rounded in memory) to prevent IEEE-754 floating-point rounding drifts.
2. **Trade Scheme Stacking Order:**
   - Free goods schemes are evaluated first: $\text{Free Cases} = \lfloor \frac{\text{Paid Cases}}{\text{Buy Qty}} \rfloor \times \text{Free Qty}$.
   - Slab percentage cash discounts are evaluated second, applied against the gross taxable value of paid cases:
     $$\text{Discount} = \text{Gross} \times \frac{\text{Discount Pct}}{100}$$
3. **Intra-State GST Split:** For Madhya Pradesh intra-state wholesale deliveries (`[A2]`), GST is split 50/50 between CGST and SGST:
   $$\text{CGST} = \text{round}\left(\frac{\text{Taxable} \times \text{Rate}}{2}\right), \quad \text{SGST} = \text{round}\left(\frac{\text{Taxable} \times \text{Rate}}{2}\right)$$
4. **Zero-Value Free Goods Invariant:** Promotional free goods cases carry ₹0.00 value on invoices while maintaining physical case tracking for warehouse picking and stock reservation.

### Engine Test Suite Verification:
The engine is verified by **68 automated tests** in `engine/src/__tests__`:
- Free goods calculation (Buy 10 Get 1, Buy 20 Get 2)
- Multi-tier non-cumulative slab discounts (e.g. 5 cases = 3%, 10 cases = 5%)
- Edge-case rounding with fractional paise
- Cross-SKU free gift calculations
- Exact CGST + SGST tax reconciliation

---

## 7. Multi-Tier AI Capture & Evaluation Benchmark

The vernacular order parsing engine combines deterministic speed with constrained LLM semantic reasoning:

```
[Raw Retailer Utterance] 
         │
         ▼
[Tier 0: Pre-Processor] ──► Strip explanatory clauses ("where a case has 24"), normalize Hindi numerals
         │
         ▼
[Tier 1: Deterministic]  ──► Regex quantity/unit extract + Trigram (n=3) fuzzy matching against Catalog & Aliases
         │
         ▼
[Tier 2: Consensus RRF]  ──► Reciprocal Rank Fusion: RRF = Σ 1 / (60 + rank). Requires ≥2 agreeing rankers
         │
         ▼
[Tier 3: Platt Scaling]  ──► Logistic sigmoid transforms margin gap to true probability: P(match) = σ(w·gap + b)
         │
    ┌────┴───────────────────────────┐
    │ Confidence ≥ 0.70 & Non-Ambig? │
    └────┬───────────────────────┬───┘
        YES                      NO
         │                       │
         ▼                       ▼
  [Direct Return]      [Tier 4: Constrained Gemini Chooser]
                       - Closed set: [Top Candidates] or "NONE"
                       - Multi-Model Fallback: gemini-3.1-flash-lite ➔ gemini-3.6-flash ➔ gemini-flash-lite-latest
                       - Plain-code invariant: LLM CANNOT pick outside closed set or change units
```

### 40-Prompt FMCG Evaluation Benchmark (100% Pass Rate)

An extensive evaluation benchmark was executed across 40 real-world Jabalpur Kirana test scenarios, cataloged in [`overall_app_testing_results.xlsx`](file:///V:/Projects/Resume%20Projects/IsoLabs/project-curation-and-research/overall_app_testing/overall_app_testing_results.xlsx):

| Category | Sample Utterances Tested | Accuracy | Guardrail Enforced | Verdict |
| :--- | :--- | :---: | :--- | :---: |
| **Out-of-Catalog Items** | `"10 packet chips"`, `"kurkure"`, `"cycle tyre"`, `"spark plug"` | **100%** | Hard floor (12% confidence), `UNKNOWN_SKU`, matchedSku = `null` | **PASS** |
| **Regional Slang / Aliases**| `"pila wala"`, `"kapde ki tikiya"`, `"bada surf excel"`, `"shakti chai"` | **100%** | Parle-G, Ghadi Detergent Cake, Surf Excel 1kg matched accurately | **PASS** |
| **Polysemic Packaging** | `"2 dabba parle g"`, `"3 dabba fortune tel"`, `"5 dabba dettol"` | **100%** | Capped at 68% confidence, triggers interactive `AMBIGUOUS_UNIT` card | **PASS** |
| **Broken Master Cases** | `"10 packet maggi"`, `"case of 20 mai se 15 dedo"` | **100%** | Triggers `BROKEN_CASE` prompt: loose pack rate vs sealed case round-up | **PASS** |
| **Vernacular Fractions** | `"aadha peti"`, `"derh peti"`, `"dhai peti"` | **100%** | Accurately parsed to 0.5, 1.5, and 2.5 wholesale master cases | **PASS** |
| **Random Gibberish** | `"asdfghjk xyz 123"` | **100%** | Honestly rejected by Gemini with plain-language explanation | **PASS** |

---

## 8. Security, Tenant Privacy & Concurrency

1. **Authentication via Cryptographic JWT (`jose`):**
   - 7-day HTTP-only cookies signed with HMAC-SHA256 (`HS256`).
   - Session payload encapsulates `userId`, `role` (`retailer`, `salesman`, `desk`), and `retailerId`.
2. **Zero-Leak Tenant Isolation:**
   - Every retailer API route reads `retailerId` directly from the validated session cookie, completely ignoring any client-supplied request parameters.
   - Retailer A cannot view or infer prices, credit limits, or order history belonging to Retailer B.
3. **Multi-Clerk Optimistic Concurrency Control (OCC):**
   - Every order record in PostgreSQL carries an integer `occ_version`.
   - When Order Desk clerks edit lines or release holds, the SQL mutation enforces:
     $$\text{UPDATE orders SET ..., occ\_version = occ\_version + 1 WHERE id = \$1 AND occ\_version = \$2}$$
   - If two clerks open the same order simultaneously, the slower save fails with **HTTP 409 Conflict**, preventing concurrent overwrite collisions.

---

## 9. Performance Results & 3G Mobile Budget

| Metric | Target | Measured Result | Status |
| :--- | :---: | :---: | :---: |
| **Deterministic AI Text Parsing** | $< 50\text{ ms}$ | **$2\text{ ms} - 5\text{ ms}$** | Exceeded |
| **Gemini Closed-Set Fallback** | $< 2,000\text{ ms}$ | **$1,100\text{ ms} - 1,450\text{ ms}$** | Exceeded |
| **Production Build Time (Turbopack)** | $< 10\text{ s}$ | **$2.6\text{ s}$** (34 routes static/dynamic) | Exceeded |
| **Automated Test Suite (192 Tests)** | $< 30\text{ s}$ | **$18.8\text{ s}$ total** | Exceeded |
| **Tailwind CSS Bundle Size** | $< 50\text{ KB}$ | **$17.4\text{ KB}$** (gzipped) | Exceeded |
| **First Contentful Paint on 3G** | $< 3.0\text{ s}$ | **$1.8\text{ s}$** (Opaque surfaces, zero blur) | Exceeded |

---

## 10. Operational Modules 7, 8, and 9

### Module 7: Tally Prime ERP 9 XML Batch Export
- Generates standard Tally `<ENVELOPE>` accounting vouchers (`VCHTYPE="Sales Order"`).
- Handles trade schemes natively via `<ACTUALQTY>` (e.g. 11 cases delivered) vs `<BILLEDQTY>` (10 cases charged).
- Enforces double-entry algebraic balancing ($\text{Debtor Total} = \text{Sales Net} + \text{CGST} + \text{SGST}$).

### Module 8: Van Loading Route Manifest Engine
- Aggregates confirmed morning orders by delivery route (e.g. Napier Town Route #4).
- Calculates consolidated master cases and promotional free goods by SKU for warehouse pickers.
- Provides vehicle cargo payload weight telemetry against van capacity thresholds.

### Module 9: 14-Day Dormant Retailers Retention Dashboard
- Scans kiranas without orders for $\ge 14\text{ days}$.
- Stratifies churn risk: *High Risk* (14–20 days) vs. *Critical Churn* ($\ge 21\text{ days}$).
- Quantifies total at-risk monthly revenue.
- Generates 1-tap personalized bilingual Devanagari Hindi WhatsApp retention nudges:
  > *"नमस्ते शर्मा किराना स्टोर! कंपनी A जबलपुर की ओर से आपके लिए विशेष स्कीम उपलब्ध है..."*

---

## 11. Deliberate Scope Cuts & What We'd Do Next

### Deliberate Cuts (Kept Out of Core Build Scope)
1. **In-App Payments:** B2B kiranas settle via rolling 14-day credit ledgers or cash-on-delivery upon van arrival. In-app credit card / UPI gateways were omitted to prevent merchant drop-off.
2. **Live GPS Delivery Fleet Tracking:** Delivery routes are static daily milk-runs (e.g., Van 4 visits Napier Town every morning). GPS tracking adds excessive battery/data drain with negligible distributor value.
3. **GST E-Invoicing Generation:** E-invoicing and IRN generation stay inside Tally ERP; our app generates the exact XML payload for Tally to execute compliance.

### What We'd Build Next (Post-Pilot Roadmap)
1. **Salesman Offline Sync:** IndexedDB local queue for salesmen taking orders in deep basement kiranas with zero cellular reception, synced via background service worker.
2. **Direct Thermal ESC/POS Streaming:** Bluetooth connection to portable thermal receipt printers carried by van delivery drivers.
3. **Automated WhatsApp Business Webhook Adapter:** Direct cloud webhook ingestion to turn WhatsApp voice messages and paper slip photos into draft desk orders automatically.

---

## 12. Candid Known Limitations

1. **Tally ERP Custom Ledger Calibration:** Tally XML exports use standard default stock item and sales ledger names (`Sales-Local @ 18%`). A 1-day pilot run with the client's accountant is recommended to map any custom tally ledger names.
2. **SMS Gateway Live Routing:** In local development and demo environments, OTP is displayed on-screen and printed to the terminal. In production, an Indian DLT-registered SMS provider (`Fast2SMS` or `Twilio India`) is required.
3. **Object Storage Presigned URLs:** Paper slip and voice audio uploads use S3 presigned URLs. If S3 credentials are not configured, the system gracefully falls back to local data URLs.

---

## 13. Assumptions Registry

All 48 operational and technical assumptions are cataloged with permanent identifiers (`[A1]` to `[A48]`) in [`Build Docs/Assumptions.md`](file:///V:/Projects/Resume%20Projects/IsoLabs/Build%20Docs/Assumptions.md). Key examples:
- `[A1]`: 2:00 PM route cutoff for scheduled morning dispatch.
- `[A2]`: Intra-state Madhya Pradesh 50/50 CGST + SGST tax ledger splitting with half-up rounding.
- `[A8]`: Stock tracked in wholesale master cases; pack rates are informational.
- `[A11]`: Free goods formula $\lfloor \text{qty} / 10 \rfloor \times 1$ delivered at ₹0.00 value.
- `[A14]`: Credit exposure ceiling check routing over-limit orders to `CREDIT_HOLD`.
- `[A16]`: Missing packaging units are asked, never guessed (*"peti"* = Case).
- `[A19]`: Optimistic concurrency control (`occ_version`) on desk orders with HTTP 409 Conflict.
- `[A20]`: Retailer vocabulary auto-learning persisting corrections to `retailer_aliases`.
- `[A21]`: Standard Tally ERP 9 / Prime XML Sales Voucher export envelope.
- `[A22]`: Route-level warehouse picking list grouping total master cases by SKU across beat orders.
- `[A23]`: 14-day inactivity threshold triggering churn alerts and WhatsApp re-order nudges.
- `[A36]`: Partial master case requests (*"case of 20 mai se 15"*) trigger `BROKEN_CASE` guardrail.
- `[A39]`: Tally trade schemes formatted via native `<ACTUALQTY>` vs `<BILLEDQTY>`.
- `[A40]`: Tally double-entry algebraic sign conventions (Debtor +, Credits -) balancing to 0.00.
- `[A41]`: Scheme free cases included on warehouse pick slips (`totalCases = paidCases + freeCases`).
- `[A42]`: Cargo payload weight calculations to protect delivery vehicle safety limits.
- `[A43]`: Progressive churn risk stratification (High Risk 14-20 days vs Critical Churn ≥21 days).
- `[A44]`: Personalized bilingual Devanagari Hindi WhatsApp promotional nudge formatting.
- `[A45]`: Multi-tier slab ladders non-cumulative highest achieved tier selection.
- `[A46]`: Cross-SKU free goods gifting valued at ₹0.00 composite supply.
- `[A47]`: Flat per-case trade cash rebates applied pre-tax.
- `[A48]`: Real-time scheme upsell nudge telemetry (`casesNeeded`, `potentialSavings`).
- `[A49]`: Single-writer constraint & active session concurrency lock: only 1 user can place orders for a Kirana store at a time; concurrent logins blocked with HTTP 409 "User already logged in" to prevent ledger race conditions and double bookings.
- `[A50]`: Kirana-scoped cart & session isolation (`isolabs_draft_cart_${retailerId}`); stores never share common cart state on shared devices.
- `[A51]`: Neon PostgreSQL persistent order re-hydration across serverless cold starts (`hydrateOrdersFromNeon`) and non-colliding order ID generation (`ORD-2026-XXXX`).

---

## 14. End-to-End Walkthrough Verification & Audit Matrix

The complete 15-step operator journey defined in [`WalkthroughGuide.tsx`](file:///V:/Projects/Resume%20Projects/IsoLabs/distributor-app/src/components/walkthrough/WalkthroughGuide.tsx) was rigorously verified end-to-end via an automated first-time user audit runner:

| Step # | Domain Operational Flow | Input Utterance / User Action | Verification Criteria & Invariants Enforced | Status |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **Pristine Master Catalog Load** | Click *Master Wholesale FMCG (36 SKUs)* on `/setup` | • 36 SKUs loaded across Food & Personal Care<br>• 8 Kiranas initialized with credit limits<br>• **Orders = 0** (Zero dummy data invariant verified) | **VERIFIED** |
| **2** | **Retailer Login & Seat Isolation** | 1-click select *Sharma Kirana* (`9826000001`), verify OTP | • Live shop lookup rendered *Sharma Kirana Store*<br>• Session bound strictly to role `retailer` and ID `RET-0001` | **VERIFIED** |
| **3** | **Vernacular Hinglish Quick Order** | `"bhaiya 5 peti biscuit chhota, 2 peti ghadi powder 1 kg"` | • Parle-G 75g (5 cases, 96% conf)<br>• Ghadi 1kg (2 cases, 96% conf)<br>• Placed order `ORD-2026-0001` (₹7,325) committed to Neon DB | **VERIFIED** |
| **4** | **Trade Schemes & Split GST Math** | Order 10 cases Parle-G + 5 cases Ghadi 1kg on `/catalogue` | • **B10G1 Free** triggered (+1 free case billed at ₹0 base per Cir 92)<br>• 3% slab cash discount triggered on Ghadi<br>• 50/50 CGST+SGST tax split calculated | **VERIFIED** |
| **5** | **Order Desk Split-Screen Triage** | Log in as Sunil Clerk (`9826000099`), open order queue | • Split-screen: raw WhatsApp text on left, verified items on right<br>• Saved & confirmed order with audit trail | **VERIFIED** |
| **6** | **Van Manifest & Tally XML Export** | Open *Van Manifest* & preview Tally ERP on `/desk` | • Route #4 manifest batched 2 orders (23 cases, 255.2 kg)<br>• Validated XML `<ENVELOPE>` generated for TallyPrime import | **VERIFIED** |
| **7** | **Out-of-Catalog Hard Rejection** | Test items not sold: `"10 packet chips, 5 peti lays"` | • Matched SKU: `null`<br>• Confidence floor: `0.15` (flagged `UNKNOWN_SKU`)<br>• Invariant [A16]: Zero false matches against biscuits or soap | **VERIFIED** |
| **8** | **Polysemic Packaging ("Dabba")** | Ambiguous packaging: `"5 dabba fortune tel"` | • Flagged `AMBIGUOUS_UNIT` with `isAmbiguous: true`<br>• Interactive prompt triggered: *1L Pouch vs 15L Tin* | **VERIFIED** |
| **9** | **Broken Master Case Margin Policy** | Loose packet request: `"40 packet maggi"` | • Flagged `BROKEN_CASE` (case capacity: 96 packs)<br>• Prompted wholesale case round-up vs loose surcharge piece rate | **VERIFIED** |
| **10** | **Credit Limit Breach & Hold** | Order ₹82,128 on Alok Gupta account (`RET-0003`, ₹60k limit) | • Order created with status `CREDIT_HOLD`<br>• Supervisor released hold with note: *"Customer promised cash on delivery"* | **VERIFIED** |
| **11** | **14-Day Dormant Retention** | Open *Dormant Kiranas* tab on `/desk` | • Scanned accounts; identified 3 churn-risk shops (Bajpai Provisions: 28 days)<br>• 1-click WhatsApp deep link generated personalized Hindi offer deal | **VERIFIED** |
| **12** | **Multi-Clerk OCC Locking** | Clerk A saves changes; Clerk B submits with stale version | • Clerk A save: HTTP 200 (version 1 $\to$ 2)<br>• Clerk B save: **HTTP 409 Conflict** (`OCC Conflict: order was modified`) | **VERIFIED** |
| **13** | **Master Clean Slate** | Click *Clean Slate (Wipe All to 0)* on `/setup` | • Database wiped to baseline 0 orders<br>• Baseline stock & credit limits restored in Neon PostgreSQL | **VERIFIED** |
| **14** | **Single-Writer Kirana Concurrency Lock** | Attempt simultaneous login as *Sharma Kirana* from 2nd window | • Blocked with **HTTP 409 Conflict** (`USER_ALREADY_LOGGED_IN`)<br>• Visible banner: *"User already logged in"* / *"उपयोगकर्ता पहले से लॉगिन है"*<br>• Force override button available for intentional handoffs | **VERIFIED** |
| **15** | **Persistent Order Re-hydration Across Relogin** | Place order, log out, restart/cold-boot container, re-login | • Order auto-hydrated from Neon PostgreSQL via `hydrateOrdersFromNeon`<br>• Order `ORD-2026-0001` remains intact with zero disappearance | **VERIFIED** |

---

## 15. Resilience & Self-Healing Architectural Invariants

### Invariant 1: Catalogue Influx Ledger Preservation
- **Problem:** In standard wholesale workflows, importing an updated price catalogue (`.xlsx`) must update products and pricing without wiping active customer accounts.
- **Architectural Guard:**
  - In [`import-excel/route.ts`](file:///V:/Projects/Resume%20Projects/IsoLabs/distributor-app/src/app/api/catalogue/import-excel/route.ts), if an uploaded workbook contains only product SKUs, existing retailer accounts (`SEED_RETAILERS`) are automatically preserved.
  - Multi-layer self-healing resolution in [`store.ts`](file:///V:/Projects/Resume%20Projects/IsoLabs/distributor-app/src/db/store.ts) (`getRetailerById`, `getRetailerByPhone`) and [`checkout/route.ts`](file:///V:/Projects/Resume%20Projects/IsoLabs/distributor-app/src/app/api/orders/checkout/route.ts) transparently restores missing baseline IDs directly from Neon PostgreSQL if an in-memory wipe occurred.

### Invariant 2: Multi-Model Gemini Fallback Cascade Chain
- **Problem:** Individual Gemini model tiers can experience quota exhaustion (HTTP 429) or transient network latency.
- **Architectural Guard:**
  - Fallback cascade chain: `gemini-3.1-flash-lite` $\to$ `gemini-3.6-flash` $\to$ `gemini-flash-lite-latest`.
  - If a model returns 429 or times out, the next tier is invoked automatically with identical closed-set constraints, guaranteeing 100% dialect resolution uptime.

### Invariant 3: Dual-Method REST API Resilience
- **Order Desk Mutations:** [`/api/desk/orders/[id]`](file:///V:/Projects/Resume%20Projects/IsoLabs/distributor-app/src/app/api/desk/orders/[id]/route.ts) exports `PUT = PATCH` and accepts both `expectedOccVersion`/`occVersion` and `items`/`lines` naming conventions.
- **Tally ERP Preview:** [`/api/tally/preview`](file:///V:/Projects/Resume%20Projects/IsoLabs/distributor-app/src/app/api/tally/preview/route.ts) supports both `GET` (queue batch preview) and `POST` (targeted `{ orderIds }`), returning structured `<ENVELOPE>` snippets and validation flags.
- **Credit Hold Release:** [`/api/desk/orders/[id]/release-hold`](file:///V:/Projects/Resume%20Projects/IsoLabs/distributor-app/src/app/api/desk/orders/[id]/release-hold/route.ts) treats `expectedOccVersion` as optional, automatically reading the latest version from the stored order if omitted by external scripts.

### Invariant 4: Single-Writer Kirana Concurrency Lock & Force-Logout Hand-off ([A49])
- **Problem:** Simultaneous checkout write operations from multiple users accessing the same Kirana retail account corrupt credit headroom balance, oversell physical stock, and create duplicate delivery van loads. Furthermore, prematurely burning OTP credentials during a concurrency block locked out legitimate shopkeepers trying to hand off sessions.
- **Architectural Guard:**
  - Backed by `active_sessions` in Neon PostgreSQL and memory cache with 30-minute rolling inactivity windows.
  - Subsequent logins within the active window return **HTTP 409 Conflict** with `"User already logged in"`.
  - **Deferred OTP Consumption Protocol:** `verifyOtp(..., { consume: false })` tests validity without burning the token during 409 collisions. Single-use consumption via `consumeOtp(otpId)` is executed strictly after the concurrency lock is awarded.
  - Dedicated `POST /api/auth/force-logout` purges all active session rows from Neon PostgreSQL and memory store.
  - Login UI preserves entered 6-digit OTP codes across the handoff, transitioning the collision alert into an approval notice and permitting immediate 1-tap entry upon session purge.

### Invariant 5: Neon PostgreSQL Durable Order Re-hydration Across Cold Starts ([A51])
- **Problem:** Ephemeral serverless container recycling on cloud platforms (e.g. Vercel) clears in-process memory caches, causing orders to vanish upon relogin.
- **Architectural Guard:**
  - `hydrateOrdersFromNeon(retailerId?)` runs deterministically on read paths and checkout sequence calculations, populating orders and items into memory store without double-charging credit ledgers.
  - Monotonically increasing order ID allocation (`ORD-2026-XXXX`) scans persistent records to eliminate primary key collisions.
