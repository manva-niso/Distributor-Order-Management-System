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
3. Quantity steppers enforce wholesale case multiples. Reaching 10 cases of Glucose biscuits automatically activates the Buy 10 Get 1 Free scheme banner (`🎉 1 Free Case Unlocked! Total: 11 Cases Delivered`).
4. Reaching 5 cases of Detergent powder triggers the 3% slab cash discount (`-₹304.50`).
5. Out-of-stock items (`SKU-TE-250`) disable add-to-cart controls, preventing post-order cuts.
6. Cart checkout checks credit headroom ($\text{Balance} + \text{Order} \le \text{Limit}$). If exceeded, status flags `CREDIT_HOLD` for desk clearance.

### B. Multi-Modal AI Capture with Disambiguation Guardrail
1. User pastes raw text (*"bhaiya 5 peti biscuit chhota, 2 peti washing powder 1 kilo, chai patti 250 wala 1 peti"*), uploads a slip photo, or records Hindi audio.
2. **Deterministic Rules:** Keyword *"peti"* maps to wholesale **CASE**.
3. **Ambiguity Guardrail:** If an utterance omits unit specification (e.g. *"5 biscuit chhota"*), the system **never guesses**. It presents an interactive unit clarification card: *5 Cases (480 packs · ₹3,888) vs 5 Loose Packs (₹40.50)*.
4. **Draft Capture:** Lines render with confidence tags (e.g., *94% Confidence*), original utterance words, and 2 alternative SKU options.
5. **Human-in-the-Loop:** No order is committed to the database until a human clicks **"Confirm & Move to Cart"**.

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

## 6. Scope Cuts & Future Roadmap

### Deliberate Cuts (Kept Out of Core Build Scope)
1. **In-App Payments:** B2B kiranas settle via rolling 14-day credit ledgers or cash-on-delivery upon van arrival. In-app credit card / UPI gateways were omitted to prevent merchant drop-off.
2. **Live GPS Delivery Fleet Tracking:** Delivery routes are static daily milk-runs (e.g., Van 4 visits Napier Town every morning). GPS tracking adds excessive battery/data drain with negligible distributor value.
3. **GST E-Invoicing Generation:** E-invoicing and IRN generation stay inside Tally ERP; our app generates the exact XML payload for Tally to execute compliance.

### Next Features (Post-Core Roadmap)
1. Salesman offline IndexedDB queue synchronization via Serwist Service Worker.
2. Van Loading Route Manifest aggregation printing.
3. 14-Day Dormant Retailers Dashboard with automated WhatsApp deep-link nudges.

---

## 7. Assumptions Registry

All assumptions are cataloged with permanent identifiers (`[A1]` to `[A23]`) in [`Build Docs/Assumptions.md`](file:///V:/Projects/Resume%20Projects/IsoLabs/Build%20Docs/Assumptions.md). Key examples:
- `[A1]`: 2:00 PM route cutoff for scheduled morning dispatch.
- `[A8]`: Stock tracked in wholesale master cases; pack rates are informational.
- `[A11]`: Free goods formula $\lfloor \text{qty} / 10 \rfloor \times 1$ delivered at ₹0.00 value.
- `[A14]`: Credit exposure ceiling check routing over-limit orders to `CREDIT_HOLD`.
- `[A16]`: Missing packaging units are asked, never guessed.
- `[A19]`: Optimistic concurrency control (`occ_version`) on desk orders.
