# System Assumptions Registry (By Module)

This document records all functional, technical, operational, and domain assumptions made across each module of the Distributor Order Management System for **Company A, Jabalpur**.

Each assumption is assigned a permanent identifier (`[A1]`, `[A2]`, etc.) and grounded in the source-of-truth client brief.

---

## Index of Assumptions

| ID | Module / Area | Focus Area | Summary |
| :--- | :--- | :--- | :--- |
| **[A1]** | General / Business | Dispatch & Ordering Windows | Daily order cutoff at 2:00 PM for same-day/next-morning route delivery. |
| **[A2]** | General / Business | Currency & Tax Rounding | INR (₹) half-up to 2 decimals; Intra-state Madhya Pradesh GST split 50/50 (CGST/SGST). |
| **[A3]** | General / Business | Phone & Locale Standards | 10-digit Indian mobile numbers (`+91`); bilingual English + Devanagari Hindi. |
| **[A4]** | Module 1: Auth | Role Model & Permissions | Closed B2B ecosystem with 3 distinct roles: `retailer`, `salesman`, `desk`. |
| **[A5]** | Module 1: Auth | Onboarding vs Master Data | 1,800 kiranas pre-seeded; new registrations enter review with provisional ₹25,000 credit. |
| **[A6]** | Module 1: Auth | OTP Security & Lockouts | 5-minute expiry, 30-second rate-limiting, burned after 3 failed attempts. |
| **[A7]** | Module 1: Auth | Session Persistence | Cryptographic HS256 JWT cookie (`auth_token`) valid for 7 days via `jose`. |
| **[A8]** | Module 2: Catalogue | Wholesale Master Unit | Stock tracked strictly in whole master cases/cartons; pack rates are informational. |
| **[A9]** | Module 2: Catalogue | Live Inventory Guard | Out-of-stock items disable cart actions; negative inventory is strictly blocked. |
| **[A10]** | Module 2: Catalogue | Pricing Transparency | Primary rates shown Ex-GST with explicit GST percentage and inclusive totals. |
| **[A11]** | Module 3: Schemes | Free Goods (Buy X Get Y) | Stepped floor division: `floor(qty / buyQty) * getFreeQty`; free goods valued at ₹0.00. |
| **[A12]** | Module 3: Schemes | Slab Cash Discounts | Percentage applied to line subtotal once case threshold met; applied pre-GST. |
| **[A13]** | Module 3: Schemes | Non-Compounding Rule | A single SKU carries either free goods, slab discount, or none (no compounding). |
| **[A14]** | Module 4: Cart/Orders | Credit Exposure Ceiling | Exposure = `currentBalance + orderTotal`; exceeding limit sets `CREDIT_HOLD`. |
| **[A15]** | Module 4: Cart/Orders | Atomic Inventory Lock | Order placement uses database row locks (`SELECT ... FOR UPDATE`) to prevent overselling. |
| **[A16]** | Module 5: AI Capture | Strict Unit Disambiguation | Jabalpur term *"peti"* = Case. If unit omitted, system MUST ask user, never guess. |
| **[A17]** | Module 5: AI Capture | Pipeline Fallback Order | Deterministic Regex & Aliases first; Gemini LLM second; client canvas compression $\le 1000$px. |
| **[A18]** | Module 5: AI Capture | Human-in-the-Loop | Multi-modal outputs are draft captures; no order is booked without human confirmation. |
| **[A19]** | Module 6: Order Desk | Optimistic Concurrency | Every order record carries `occ_version` to prevent concurrent clerk overwrites. |
| **[A20]** | Module 6: Order Desk | Alias Auto-Learning | Clerk corrections automatically persist phrase-to-SKU mappings for that retailer. |
| **[A21]** | Module 7: Tally Export | Standard XML Envelope | Exports match standard Tally ERP 9 / Tally Prime Sales Voucher XML specifications. |
| **[A22]** | Module 8: Van Manifest | Route Level Aggregation | Warehouse picking slips group orders by route and sum total master cases per SKU. |
| **[A23]** | Module 9: Dormant Desk | Inactivity Window (14 Days) | Retailers with $\ge 14$ days since last order trigger sales beat alerts and WhatsApp nudges. |

---

## Detailed Specifications by Module

### General & Business Domain

#### `[A1]` Dispatch & Route Ordering Windows
- **Context:** Jabalpur distribution operations across 4 brands and 1,800 retail accounts.
- **Assumption:** Orders confirmed by the desk before 2:00 PM are batched for evening van loading and delivered either the same afternoon or by 9:30 AM next morning along the assigned beat (e.g. *Napier Town Route #4*). Orders received after 2:00 PM roll to the subsequent day's dispatch.

#### `[A2]` Currency, Taxation & Rounding
- **Context:** Tax invoicing under Indian Goods & Services Tax (GST) regulations.
- **Assumption:** All monetary values are handled in Indian Rupees (INR ₹). Taxable amounts, GST components, and line subtotals are rounded to two decimal places using standard half-up rounding (`Math.round(val * 100) / 100`). Intra-state transactions within Madhya Pradesh (State Code `23`) split GST equally into **9.0% CGST + 9.0% SGST** for 18% items (Biscuits, Detergent) and **2.5% CGST + 2.5% SGST** for 5% items (Tea leaf).

#### `[A3]` Phone Numbers & Regional Localization
- **Context:** Kirana shopkeepers operating low-end Android handsets across Jabalpur.
- **Assumption:** Mobile numbers conform to standard 10-digit Indian Telecom formats (`+91` prefix optional). The application is bilingual: English and Devanagari Hindi. In Hindi mode, typographic line-heights are relaxed (`leading-relaxed`) to prevent clipping of upper and lower vowel matras.

---

### Module 1: Scaffolding, Database Schema & Authentication

#### `[A4]` Closed B2B User Role Model
- **Context:** B2B wholesale platform security and privacy scoping.
- **Assumption:** The system operates strictly with three distinct roles: `retailer`, `salesman`, and `desk`. There are no open consumer accounts. Retailers have access only to their own catalogue pricing, order history, and credit headroom. Salesmen have access to the retailers on their assigned beat. Desk clerks have administrative access across all accounts.

#### `[A5]` Pre-Seeded Accounts vs. Self-Service Onboarding
- **Context:** Existing retailer master vs. new shop acquisition.
- **Assumption:** Company A's existing 1,800 kirana shops are pre-seeded in the distributor database. When an unrecognized phone number attempts login, the system blocks direct access and prompts a B2B Onboarding Request (`/register`), capturing Shop Name, Owner Name, Locality/Beat, and Address. Upon submission, it creates a provisional account with an initial risk-managed credit limit of ₹25,000 pending salesman physical shop verification.

#### `[A6]` Cryptographic OTP Lifetime & Security Policy
- **Context:** Legit mobile OTP authentication.
- **Assumption:** Verification OTPs consist of a cryptographically random 6-digit numeric string valid for exactly 300 seconds (5 minutes). A 30-second cooldown is enforced between re-sends. If an incorrect OTP is submitted 3 times, the code is permanently invalidated to thwart automated brute-force attacks.

#### `[A7]` Session Management via Signed JWT
- **Context:** Stateless edge-compatible session management.
- **Assumption:** Authentication state is maintained via an HTTP-Only, Lax SameSite, Secure cookie (`auth_token`) signed with an HS256 secret using `jose`. The token carries `{ userId, phone, role, retailerId, name }` and remains valid for 7 days unless explicitly cleared via `/api/auth/logout`.

---

### Module 2: Retailer Catalogue, Pricing & Live Stock

#### `[A8]` Wholesale Master Case Quantities
- **Context:** Kirana trade purchasing patterns.
- **Assumption:** Wholesale orders and warehouse inventory are tracked exclusively in master cartons/cases (e.g. 1 Case of Glucose biscuits = 96 retail packs; 1 Case of Detergent = 20 packs; 1 Case of Tea leaf = 40 packs). Pack prices are displayed solely as reference calculation aids (`₹8.10/pack`).

#### `[A9]` Live Inventory Availability & Out-of-Stock Guards
- **Context:** Preventing lines cut after order placement.
- **Assumption:** Live stock reflects the current `stock_cases` in the central warehouse. When stock is `0` (e.g. `SKU-TE-250`), the UI renders an "Out of Stock / स्टॉक समाप्त" warning, disables quantity increment steppers, and blocks the SKU from being added to the cart. Negative inventory ordering is prohibited.

#### `[A10]` Pricing Display Transparency (Ex-GST vs. Incl-GST)
- **Context:** Kirana invoice expectations.
- **Assumption:** To avoid distributor-retailer friction, wholesale rates are displayed primarily as **Ex-GST wholesale dealer price** (`₹777.60/case`), immediately followed by a clear tax badge (`+18% GST = ₹917.57 Incl.`).

---

### Module 3: Pure Scheme Calculation Engine

#### `[A11]` Free Goods Scheme Formula (Buy X Get Y Free)
- **Context:** *Buy 10 cases get 1 case free* trade schemes.
- **Assumption:** Free goods are calculated deterministically via integer floor division:  
  $$\text{Free Cases} = \left\lfloor \frac{\text{Ordered Cases}}{\text{Buy Quantity}} \right\rfloor \times \text{Free Quantity}$$  
  Free cases are delivered as bonus stock at ₹0.00 taxable value. They do not reduce the ordered paid cases (e.g. ordering 10 cases results in 10 paid cases + 1 free case = 11 cases delivered).

#### `[A12]` Slab Discount Formula
- **Context:** *3% off at 5 or more cases* volume incentives.
- **Assumption:** If `orderedCases >= minCases`, the discount percentage applies uniformly to the entire gross taxable line amount:  
  $$\text{Discount Amount} = \text{Ordered Cases} \times \text{Dealer Price} \times \left( \frac{\text{Discount Pct}}{100} \right)$$  
  Slab discounts apply strictly before GST calculation.

#### `[A13]` Non-Compounding Scheme Hierarchy
- **Context:** Scheme engine deterministic predictability.
- **Assumption:** Each SKU is configured with at most one active scheme (`NONE`, `FREE_GOODS`, or `SLAB_DISCOUNT`). Schemes do not compound or stack on top of each other for the same SKU line.

---

### Module 4: Cart, Ledger Credit Check & Order Placement

#### `[A14]` Credit Headroom & Credit Hold Protocol
- **Context:** Risk management on B2B trade receivables.
- **Assumption:** Total Credit Exposure is calculated as:  
  $$\text{Total Exposure} = \text{Current Ledger Balance} + \text{New Order Grand Total}$$  
  If $\text{Total Exposure} \le \text{Credit Limit}$, the order is accepted in status `PLACED`. If $\text{Total Exposure} > \text{Credit Limit}$, the order is not rejected; instead, it is placed in status `CREDIT_HOLD` and routed to the Order Desk clearance queue for owner/director review.

#### `[A15]` Atomic Stock Decrement & Concurrency
- **Context:** High-concurrency ordering across 600 orders/day.
- **Assumption:** Order commitment wraps stock decrement inside an atomic database transaction using row-level locking (`SELECT stock_cases FROM skus WHERE id = ? FOR UPDATE`). If available stock drops below requested quantity during checkout, the checkout is halted with an explicit inventory conflict notice.

---

### Module 5: Multi-Modal AI Quick Order Capture

#### `[A16]` Strict Unit Disambiguation Guardrail
- **Context:** Preventing costly redeliveries due to unit mix-ups.
- **Assumption:** Colloquial Jabalpur wholesale vocabulary is mapped deterministically: *"peti"*, *"dabba"*, *"carton"*, *"box"* map to wholesale **CASE**. However, if a message omits the unit (e.g., *"bhaiya 5 biscuit chhota"*), the system **MUST NOT GUESS**. It must flag the line as ambiguous and prompt the user to choose: *5 Cases (480 packs · ₹3,888) or 5 Loose Packs (₹40.50)*.

#### `[A17]` Multi-Modal Fallback Pipeline
- **Context:** Resilient capture on 3G mobile networks.
- **Assumption:** Processing follows a tiered hierarchy:
  1. **Tier 1 (Deterministic Rules):** Normalization, regex token extraction, and retailer past-order alias lookup.
  2. **Tier 2 (Gemini LLM):** Invoked only for unresolved ambiguous lines, receiving candidate SKUs.
  3. **Tier 3 (Zero-Crash Fallback):** If Gemini is unreachable or rate-limited (HTTP 429), the rule-based result is forwarded directly to the review UI. Photos are resized on client canvas to $\le 1000$px WebP before upload.

#### `[A18]` Human-in-the-Loop Order Booking
- **Context:** Preventing rogue orders.
- **Assumption:** AI extractions are strictly temporary draft captures stored in the `captures` table. **No order is placed into the system until a human** (either the retailer on mobile or a desk clerk in the office) verifies the lines, prices, and quantities and taps **"Confirm Order"**.

---

### Module 6: Order Desk & OCC Concurrency

#### `[A19]` Optimistic Concurrency Control (OCC)
- **Context:** Multiple desk clerks processing ~600 orders daily.
- **Assumption:** Every order record in the database maintains an integer `occ_version` (starting at 1). When a clerk submits edits, the update query asserts `WHERE id = ? AND occ_version = ?` and increments the version. If another clerk saved changes in the interim, the update is rejected with `409 Conflict`, prompting the user to reload the latest record.

#### `[A20]` Retailer Alias Auto-Learning
- **Context:** Increasing AI accuracy over time.
- **Assumption:** Whenever an office clerk manually corrects an AI-extracted SKU line, the original raw phrase and the selected SKU ID are automatically saved to `retailer_aliases` for that specific retailer (`times_used += 1`). Future orders from that retailer match that phrase with 100% confidence.

---

### Module 7: Tally XML Export

#### `[A21]` Tally ERP 9 / Prime XML Voucher Format
- **Context:** Eliminating 6 order-entry re-typing staff.
- **Assumption:** Exported XML adheres to standard Tally `<ENVELOPE><BODY><DATA><TALLYMESSAGE>` Sales Voucher specifications, mapping:
  - Buyer Ledger: Retailer Trade Name (e.g. `Sharma Kirana Store`)
  - Item Name: Exact SKU Stock Item Name in Tally
  - Billed Quantity: Master Cases
  - Rate: Dealer Price per Case
  - Free Quantity: Billed in separate free goods ledger or zero-rate entry
  - Tax Ledgers: Output CGST + Output SGST

---

### Module 8: Van Loading Route Manifest

#### `[A22]` Route-Level Picking List Aggregation
- **Context:** Fast warehouse vehicle loading.
- **Assumption:** Warehouse loading manifests aggregate all verified orders assigned to a specific delivery vehicle (e.g. *Van 04 - Napier Town*). The manifest groups shipments by SKU, displaying total master cases to pick from warehouse shelves, followed by an ordered list of retailer delivery stops.

---

### Module 9: 14-Day Dormant Retailers Dashboard

#### `[A23]` Inactivity Threshold & WhatsApp Nudge Protocol
- **Context:** Preventing kirana account churn.
- **Assumption:** A retailer is categorized as **Dormant** when `days_since_last_order >= 14`. The dashboard calculates the account's historical monthly order volume and outstanding credit, providing a 1-tap WhatsApp deep link pre-filling a personalized Hindi re-order message with today's trade schemes.
