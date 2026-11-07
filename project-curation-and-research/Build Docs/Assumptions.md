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
| **[A24]** | Module 2: Catalogue | Search & Filter Logic | Case-insensitive instant multi-field match (name, brand, category, code); client state caches results. |
| **[A25]** | Module 2: Catalogue | Client Cart Resiliency | Active draft cart item quantities persist in `localStorage` to survive network drops & page refreshes. |
| **[A26]** | Module 2: Catalogue | Stockout Notification Telemetry | "Notify when available" registers an intent event in `audit_logs` without allowing checkout of zero-stock SKUs. |
| **[A27]** | Module 1: Auth/Onboarding | Self-Registration & Route Assignment | Unregistered kirana stores self-onboard via `/register` with Shop, Owner, Beat & Address; auto-provisioned with provisional ₹25k credit limit. |
| **[A28]** | Module 1: Auth/Onboarding | Single Phone Identity Constraint | Mobile numbers serve as primary entity keys; duplicate registrations with identical 10-digit phone numbers return HTTP 409 Conflict. |
| **[A29]** | Module 4: Cart/Orders | B2B Order Status State Machine | Orders within headroom initiate as `PLACED`; orders exceeding credit headroom flag `CREDIT_HOLD` for clerk review (never dead buttons). |
| **[A30]** | Module 4: Cart/Orders | Physical Promotional Stock Lock | Free promotional cases (`freeCases`) are deducted atomically alongside billed cases from warehouse stock to prevent stockout cuts. |
| **[A31]** | Master Data / Setup | Dynamic Excel/CSV Catalog Ingestion | System dynamically ingests arbitrary distributor price lists and retailer credit sheets (.xlsx/.xls/.csv), eliminating hardcoded data dependency. |
| **[A32]** | Master Data / Setup | Header Synonym Tolerance & Safe Defaults | Ingestion engine tolerates varied column synonyms ("Rate", "Dealer Price", "Case Pack") and applies standard FMCG defaults when non-critical metadata is omitted. |
| **[A33]** | Module 5: AI Capture | Pluggable Parser Strategy & ML Extensibility | Parser implements `OrderParserPipeline` adapter pattern so any custom ML microservice (Python/FastAPI) can drop-in replace rules without UI changes. |
| **[A34]** | Module 5: AI Capture | Trilingual & Devanagari Numeral Normalization | Accepts Arabic digits (`0-9`), Devanagari numerals (`०-९`), and written words (`ek`, `paanch`, `दो`), stripping colloquial pleasantries before SKU matching. |
| **[A35]** | Module 5: AI Capture | Pack-to-Case Ceiling Multiple Conversion | When retail loose packs are specified, engine calculates wholesale master cases using ceiling multiples of SKU pack configuration (`ceil(packs / unitsPerCase)`). |
| **[A36]** | Module 5: AI Capture | Broken Master Case & Cut Pack Policy | Partial-case requests ("case of 20 mai se 15") trigger `BROKEN_CASE` guardrail with 2 options: Round Up to 1 Full Case (recommended) or Request Loose Packs with desk approval. |
| **[A37]** | Module 6: Order Desk | Credit Hold Release Authorization Protocol | Over-limit orders can be approved exclusively by desk clerks (`role: 'desk'`) with mandatory audit notes; stamped onto record with atomic OCC increment. |
| **[A38]** | Module 6: Order Desk | Live Authoritative Invoice Recalculation | Line edits on desk terminal run authoritative recalculation through pure scheme engine, ensuring free goods, slab discounts, and 50/50 GST splits remain mathematically exact. |
| **[A39]** | Module 7: Tally Export | Actual vs Billed Quantities for Schemes | FMCG trade schemes formatted via native Tally `<ACTUALQTY>` vs `<BILLEDQTY>`, billing only paid cases while decrementing warehouse inventory for free cases. |
| **[A40]** | Module 7: Tally Export | Double-Entry Signs & Zero-Sum Balancing | Debits represented as positive (Party Ledger) and Credits as negative (Sales, CGST, SGST, Round Off); strictly balances to 0.00. |
| **[A41]** | Module 8: Van Manifest | Route Load Aggregation & Free Goods Pick Inclusion | Warehouse picking manifests group orders by delivery beat, summing billed cases and scheme free cases (`totalCases = paidCases + freeCases`) so loaders never miss promotional cartons. |
| **[A42]** | Module 8: Van Manifest | Cargo Weight Approximation for Load Safety | Vehicle cargo manifests compute approximate payload weights per SKU based on case pack configuration to ensure vehicle axle limits are respected during milk-runs. |
| **[A43]** | Module 9: Dormant Desk | Progressive Churn Risk Stratification | Inactivity categorized into High Risk (14-20 days) and Critical Churn (≥21 days) to prioritize salesman physical visits over simple WhatsApp reminders. |
| **[A44]** | Module 9: Dormant Desk | Personalized Bilingual Promotional Nudge Format | WhatsApp re-order deep links pre-populate Devanagari Hindi text greeting the merchant by name, acknowledging days inactive, and highlighting today's live trade schemes. |
| **[A45]** | Universal Scheme Engine | Multi-Tier Slab Ladders Non-Cumulative Selection | Highest achieved tier applied across gross value; tiers do not compound. |
| **[A46]** | Universal Scheme Engine | Cross-SKU Free Goods Gifting & ₹0.00 Composite Valuation | Free bonus cases in secondary SKU awarded at ₹0.00 with zero additional GST liability (Circular 92/11/2019-GST). |
| **[A47]** | Universal Scheme Engine | Flat Per-Case Trade Cash Rebates | Direct rupee deductions per case applied pre-tax with compliant 50/50 intra-state MP GST assessment. |
| **[A48]** | Universal Scheme Engine | Real-Time Scheme Upsell Nudge Telemetry | Dynamically computes remaining cases to unlock next discount tier (`nextTierNudge`). |
| **[A49]** | Module 1: Auth & Write Integrity | Single-Writer Constraint & Active Session Concurrency Lock | Only 1 user/session can place orders for a Kirana store at a time; concurrent logins blocked with HTTP 409 "User already logged in" to prevent ledger race conditions and double bookings. |
| **[A50]** | Module 4: Cart & Session Scoping | Kirana-Scoped Cart & Multi-Tenant Session Isolation | Draft carts partitioned by `retailerId` (`isolabs_draft_cart_${retailerId}`); stores never share common cart state on shared devices. |
| **[A51]** | Module 4: Orders & Persistence | Neon PostgreSQL Order Re-hydration Across Cold Starts | Persistent orders auto-hydrated from Neon into memory on reads and checkout; order sequence number (`ORD-2026-XXXX`) monotonically calculated to prevent primary key collision. |

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

#### `[A27]` B2B Self-Registration & Route Assignment
- **Context:** Kirana stores in Jabalpur seeking to join Company A's wholesale ordering network who are not pre-seeded in the initial 1,800 records.
- **Assumption:** Unrecognized phone numbers visiting `/login` are detected via `/api/auth/lookup-phone` and guided to `/register`. The retailer provides their Shop Name, Owner Full Name, Mobile Number, Delivery Beat/Route (e.g. *Napier Town Route #4*, *Gorakhpur Route #1*), and Physical Address. Upon completion, the system allocates a sequential identifier (`RET-1800+`), provisions an initial provisional credit limit of ₹25,000 (per `[A5]`), mints a signed session cookie, and directs them immediately to `/catalogue`.

#### `[A28]` Single Phone Identity Constraint
- **Context:** B2B credit ledger integrity and salesman beat routing.
- **Assumption:** A mobile number uniquely identifies a single trade account. If an existing registered phone number attempts to register again via `/register`, the API strictly rejects the request with HTTP 409 Conflict and prompts the user to log in via OTP, preventing duplicate credit allocation or overlapping route assignments.

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

#### `[A24]` Search & Brand Filter Matching
- **Context:** Finding products between customer footfall.
- **Assumption:** Catalogue search performs immediate, case-insensitive substring matching against SKU names, brand names, and SKU codes. Brand chips (`All`, `Parle`, `Ghadi`, `Wagh Bakri`) filter instantaneously in client memory without additional server round-trips.

#### `[A25]` Client Cart State Resiliency
- **Context:** Spotty 3G mobile connections in Jabalpur bazaars.
- **Assumption:** Draft cart selections and case quantities are persisted in browser `localStorage`. If a shopkeeper takes a call, switches apps, or reloads, their staged items, quantities, and scheme unlocks remain intact.

#### `[A26]` Out-of-Stock Notification Telemetry
- **Context:** Handling stockouts without dead buttons.
- **Assumption:** When a shopkeeper taps *"Notify when available"* on out-of-stock SKU-TE-250, the action is not a dead link; it triggers an audit telemetry record (`RESTOCK_ALERT_REQUESTED`), stores the retailer's phone, and renders an instant green acknowledgment toast (`✓ Notified / स्टॉक आते ही आपको सूचित किया जाएगा`).

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

#### `[A29]` B2B Order Status State Machine
- **Context:** Ensuring zero dead buttons while maintaining financial credit discipline.
- **Assumption:** Checkout requests are never blocked by client-side disabled buttons due to credit limits. If projected balance exceeds credit limit, the submit action remains clickable and submits the order under `CREDIT_HOLD` status with the exceeded amount flagged. Order Desk clerks are notified to approve or adjust terms before van dispatch.

#### `[A30]` Physical Promotional Stock Locking
- **Context:** Delivery fulfillment on free goods trade schemes.
- **Assumption:** Physical warehouse inventory must cover both ordered master cases and promotional free goods cases (`totalDeliveredCases = orderedCases + freeCases`). Free goods are deducted atomically from warehouse physical stock at checkout to ensure van pickers are never faced with inventory deficits at loading time.

---

### Master Data Setup & Dynamic Excel Ingestion

#### `[A31]` Dynamic Excel/CSV Catalog Ingestion
- **Context:** Third-party distributors and evaluators testing the application with their own proprietary product catalogs, pack sizes, wholesale prices, and retail accounts.
- **Assumption:** The application is not locked to hardcoded seed data. Users can upload arbitrary `.xlsx`, `.xls`, or `.csv` workbooks via `/setup` or `/api/setup/import-excel`. The ingestion engine parses items and retailers, dynamically updates in-memory and relational tables, generates per-pack unit pricing, and binds active trade schemes instantly across all screens.

#### `[A32]` Header Synonym Tolerance & Safe Defaults
- **Context:** Varied column naming conventions in distributor ERP exports (Tally, Busy, Marg, SAP).
- **Assumption:** Ingestion normalizes column headers and tolerates standard synonyms: *"Item Name"*, *"Product"*, *"Description"* $\to$ Name; *"Dealer Price"*, *"Wholesale Rate"*, *"Case Price"*, *"Rate"* $\to$ Dealer Price; *"Case Pack"*, *"Units/Case"*, *"Packs Per Case"* $\to$ Units Per Case. When non-critical columns are missing, standard FMCG defaults are assigned (18.0% GST, 50 stock cases, 1 unit/case, ₹50,000 credit limit).

---

### Module 5: Multi-Modal AI Quick Order Capture

#### `[A16]` Strict Unit Disambiguation & The "Dabba" Semantic Guardrail
- **Context:** Preventing costly wrong-delivery returns (₹350 per incident on 5% of 180,000 orders = ₹31.5 Lakhs annual loss).
- **Assumption:** 
  1. Explicit wholesale packaging tokens (*"peti"*, *"petee"*, *"petti"*, *"carton"*, *"box"*, *"bora"*, *"katta"*, *"पेटी"*, *"कार्टन"*) map deterministically to **CASE**.
  2. Retail single packs (*"packet"*, *"pack"*, *"pkt"*, *"piece"*, *"pouch"*, *"tikiya"*, *"nang"*, *"पैकेट"*, *"पीस"*) map to **PACK**.
  3. **The "Dabba" Polysemy Guardrail:** In Madhya Pradesh kirana trade, *"dabba"* is polysemic (meaning a 15L oil tin, a display inner carton of 12-24 packs, or a wholesale master case). **Mapping "dabba" blindly to CASE causes 4x over-shipment and delivery rejections.** Therefore, *"dabba"* / *"dibba"* / *"डिब्बा"* is classified as `AMBIGUOUS_UNIT` (`extractedUnit = "DABBA"`), capping confidence at $\le 0.70$ and rendering a 1-tap disambiguation card: *Did you mean Master Cases (peti) or Inner Boxes/Tins?*
  4. If a message omits the unit entirely (e.g., *"bhaiya 5 biscuit chhota"*), the system **MUST NOT GUESS**. It flags the line as `isAmbiguous: true` with `ambiguityReason: "MISSING_UNIT"` and prompts: *5 Master Cases or 5 Loose Packs?*

#### `[A17]` Multi-Modal Fallback Pipeline
- **Context:** Resilient capture on 3G mobile networks.
- **Assumption:** Processing follows a tiered hierarchy:
  1. **Tier 1 (Deterministic Rules):** Normalization, regex token extraction, and retailer past-order alias lookup.
  2. **Tier 2 (Gemini LLM):** Invoked only for unresolved ambiguous lines, receiving candidate SKUs.
  3. **Tier 3 (Zero-Crash Fallback):** If Gemini is unreachable or rate-limited (HTTP 429), the rule-based result is forwarded directly to the review UI. Photos are resized on client canvas to $\le 1000$px WebP before upload.

#### `[A18]` Human-in-the-Loop Order Booking
- **Context:** Preventing rogue orders.
- **Assumption:** AI extractions are strictly temporary draft captures stored in the `captures` table. **No order is placed into the system until a human** (either the retailer on mobile or a desk clerk in the office) verifies the lines, prices, and quantities and taps **"Confirm Order"**.

#### `[A33]` Pluggable Parser Strategy & ML Microservice Extensibility
- **Context:** Decoupling intake algorithms so custom Python/FastAPI/PyTorch ML models can replace rule heuristics.
- **Assumption:** Text parsing implements the `OrderParserPipeline` contract (`parseText(rawText, context): Promise<ParseResult>`). By toggling `ORDER_PARSER_PROVIDER="custom_ml"` and specifying `CUSTOM_ML_API_URL`, external microservices receive standard JSON and return parsed lines without modifying the frontend or database schemas. If the external microservice is offline or errors, the system gracefully falls back to deterministic rules with zero downtime (`[A17]`).

#### `[A34]` Trilingual & Devanagari Numeral Normalization
- **Context:** Jabalpur shopkeepers write orders across English, Hinglish, and Devanagari Hindi with varying digit representations.
- **Assumption:** The parser maps Devanagari numerals (`०-९`) to standard Arabic digits (`0-9`), translates word numbers across English (`one`, `two`), Hinglish (`ek`, `do`, `chaar`, `paanch`, `das`), and Hindi (`एक`, `दो`, `चार`, `पाँच`), and strips non-order conversational pleasantries (*"bhaiya"*, *"jaldi bhejo"*, *"kal subah"*, *"chahiye"*) prior to matching SKU descriptions.

#### `[A35]` Pack-to-Case Ceiling Multiple Conversion
- **Context:** Wholesale distributors sell and pick strictly in full master cases, but kirana shopkeepers occasionally order by consumer packet count.
- **Assumption:** When a shopkeeper orders in loose packets (e.g. *"120 packets Parle-G 75g"* with 96 packs/case), the system converts the quantity to whole master cases via ceiling division: `Math.max(1, Math.ceil(packs / unitsPerCase))`. The UI clearly displays both the requested packet quantity and the corresponding full case allocation to maintain warehouse logistics integrity.

#### `[A36]` Broken Master Case & Cut Pack Policy
- **Context:** Real-world colloquial orders where a shopkeeper attempts to crack open a sealed master carton (e.g., *"detergent powder of 1 kg case of 20 mai se 15 dedo"*).
- **Assumption:** Distributors dispatch and pick strictly by full sealed master cases (`[A8]`) to prevent loose inventory damage during van milk-runs. When an order requests a fractional case or explicitly asks for loose packs fewer than the case capacity (`qty < unitsPerCase` or colloquial *"X mai se Y dedo"*):
  1. The system extracts the true requested packet count (`15`) and maps the product (`SKU-DT-1KG`), ignoring weight numbers (`1kg`) and case capacity numbers (`20`) from being erroneously consumed as order quantities.
  2. The line is flagged with `isAmbiguous: true` and `ambiguityReason: "BROKEN_CASE"`.
  3. The system presents the user with two clear options:
     - **Option 1 (Recommended): Round Up to 1 Full Case (20 packs · ₹2,030.00)** at the wholesale dealer rate.
     - **Option 2: Request 15 Loose Packs (₹1,522.50)** flagged for Order Desk clerk and salesman review/route splitting.

---

### Module 6: Order Desk & OCC Concurrency

#### `[A19]` Optimistic Concurrency Control (OCC)
- **Context:** Multiple desk clerks processing ~600 orders daily.
- **Assumption:** Every order record in the database maintains an integer `occ_version` (starting at 1). When a clerk submits edits, the update query asserts `WHERE id = ? AND occ_version = ?` and increments the version. If another clerk saved changes in the interim, the update is rejected with `409 Conflict`, prompting the user to reload the latest record.

#### `[A20]` Retailer Alias Auto-Learning
- **Context:** Increasing AI accuracy over time.
- **Assumption:** Whenever an office clerk manually corrects an AI-extracted SKU line, the original raw phrase and the selected SKU ID are automatically saved to `retailer_aliases` for that specific retailer (`times_used += 1`). Future orders from that retailer match that phrase with 100% confidence.

#### `[A37]` Credit Hold Release Authorization Protocol
- **Context:** Over-limit kirana store orders entering `CREDIT_HOLD` (`[A14]`).
- **Assumption:** Only an authenticated user with `role: "desk"` can release a credit hold. When releasing, the clerk must submit an operational justification note (e.g., *"Customer promised cash payment on van delivery"* or *"Approved by owner"*). The note and clerk identity are stamped onto the order (`holdReleasedBy`, `holdReleaseNote`), transitioning the status to `VERIFIED` and incrementing `occVersion` (`[A19]`).

#### `[A38]` Live Authoritative Invoice Recalculation on Desk Edits
- **Context:** Desk clerks modifying case counts or substituting SKUs on Screen 8.
- **Assumption:** When a clerk alters line items in `/desk/orders/[id]`, the system performs live recalculation through the pure scheme engine (`calculateOrderSummary`). Any newly unlocked free promotional cases or slab discounts are calculated immediately and stored in the order ledger, guaranteeing 100% mathematical consistency with Tally sales vouchers.

---

### Module 7: Tally XML Export

#### `[A21]` Tally ERP 9 / Prime XML Voucher Format
- **Context:** Eliminating 6 order-entry re-typing staff.
- **Assumption:** Exported XML adheres to standard Tally `<ENVELOPE><BODY><IMPORTDATA><TALLYMESSAGE><VOUCHER>` Sales Voucher specifications, mapping:
  - Buyer Ledger: Retailer Trade Name (e.g. `Sharma Kirana Store`)
  - Item Name: Exact SKU Stock Item Name in Tally
  - Billed Quantity: Master Cases
  - Rate: Dealer Price per Case
  - Free Quantity: Billed in separate free goods ledger or zero-rate entry
  - Tax Ledgers: Output CGST + Output SGST

#### `[A39]` Actual vs Billed Quantities for Promotional Schemes
- **Context:** Standard Indian FMCG accounting practices in Tally ERP 9 and TallyPrime for promotional free goods (e.g., Buy 10 Cases of Biscuits, Get 1 Case Free).
- **Assumption:** Rather than generating phantom zero-rate ledger lines or separate discounts, the XML generator populates Tally's native `<ACTUALQTY>` and `<BILLEDQTY>` fields on the stock item node:
  - `<ACTUALQTY> 11 case</ACTUALQTY>`
  - `<BILLEDQTY> 10 case</BILLEDQTY>`
  The line `<AMOUNT>` is calculated strictly against billed cases (`10 * unitDealerPrice`), debiting the debtor only for paid cases while allowing Tally's inventory module to deduct the full 11 cases from physical warehouse godown stock.

#### `[A40]` Double-Entry Accounting Sign Conventions & Micro-Cent Round-Off
- **Context:** Enforcing mathematical validity upon importing XML into TallyPrime without prompting "Voucher totals do not match" warnings.
- **Assumption:** Tally XML adheres to strict algebraic sign conventions:
  - **Debits (Receivables):** Stored as positive numbers (`<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>`, `<AMOUNT>+10520.00</AMOUNT>`).
  - **Credits (Sales Revenue & Taxes):** Stored as negative numbers (`<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>`, `<AMOUNT>-8915.25</AMOUNT>`).
  - Intra-state tax lines (`Output CGST`, `Output SGST`) are split 50/50 per Rule `[A2]` and formatted with negative amounts.
  - Any fractional difference between the grand total and the sum of taxable amount + GST is balanced through an explicit `<LEDGERNAME>Round Off</LEDGERNAME>` line. The algebraic sum of all ledgers strictly equals zero.

---

### Module 8: Van Loading Route Manifest

#### `[A22]` Route-Level Picking List Aggregation
- **Context:** Fast warehouse vehicle loading.
- **Assumption:** Warehouse loading manifests aggregate all verified orders assigned to a specific delivery vehicle (e.g. *Van 04 - Napier Town*). The manifest groups shipments by SKU, displaying total master cases to pick from warehouse shelves, followed by an ordered list of retailer delivery stops.

#### `[A41]` Free Goods Master Case Inclusion in Vehicle Pick Slips
- **Context:** Warehouse dispatch crews loading delivery vans for morning milk-runs.
- **Assumption:** Loaders pick and stage inventory purely from the warehouse pick slip without consulting individual retailer invoices. The picking list must calculate `totalCases = paidCases + freeCases` for every SKU, ensuring promotional bonus cases (e.g. 1 Free Case on 10 Glucose Biscuits) are physically staged and loaded onto the vehicle. Omitting free goods from the loading slip leads to driver delivery shortages.

#### `[A42]` Cargo Weight Approximation for Delivery Vehicles
- **Context:** Jabalpur urban delivery tempo/van payload limits (e.g. Tata Ace 750kg payload, Mahindra Bolero Maxi Truck 1,200kg payload).
- **Assumption:** The manifest engine approximates cargo weight per master case based on product net weight and case pack counts (e.g. 75g x 96 packs ≈ 7.2kg; 1kg x 20 packs ≈ 20kg). Displaying aggregate weight prevents overloading vehicles navigating narrow market lanes (e.g. Ganjipura, Sadar).

---

### Module 9: 14-Day Dormant Retailers Dashboard

#### `[A23]` Inactivity Threshold & WhatsApp Nudge Protocol
- **Context:** Preventing kirana account churn.
- **Assumption:** A retailer is categorized as **Dormant** when `days_since_last_order >= 14`. The dashboard calculates the account's historical monthly order volume and outstanding credit, providing a 1-tap WhatsApp deep link pre-filling a personalized Hindi re-order message with today's trade schemes.

#### `[A43]` Progressive Churn Risk Stratification
- **Context:** Triaging sales team intervention between digital nudges and in-person visits.
- **Assumption:** Churn risk is divided into two operational tiers:
  - **High Risk (14–20 Days Inactive):** Retailer has missed 1–2 typical order cycles. A 1-tap digital WhatsApp promotion nudge is dispatched.
  - **Critical Churn (≥21 Days Inactive):** Retailer has missed 3+ consecutive order cycles and is at imminent risk of switching to a competitor distributor. Flagged with a high-contrast red alert and prioritized for an immediate physical sales beat visit by the route salesman (`salesmanId`).

#### `[A44]` Personalized Bilingual Devanagari Hindi Promotional Nudges
- **Context:** Shopkeepers respond significantly better to culturally tailored Devanagari Hindi greetings over generic English notifications.
- **Assumption:** 1-tap WhatsApp nudge links generate pre-encoded text addressing the owner by full name, naming their specific shop, acknowledging the exact inactivity duration, and spotlighting current trade schemes (e.g. *Buy 10 Get 1 Free on Parle-G Biscuit*, *3% cash discount on Detergent*), concluding with a direct link to the digital ordering catalogue.

---

### Universal Trade Scheme Engine Upgrades

#### `[A45]` Multi-Tier Slab Ladders Non-Cumulative Selection
- **Context:** Advanced FMCG volume discounting with stepped incentives (e.g. 5 cases = 3%, 10 cases = 5%, 20 cases = 8%).
- **Assumption:** Slabs do not compound. The calculation engine evaluates the line's `orderedCases` against all configured tiers in descending threshold order, selecting strictly the highest achieved tier. The selected discount percentage applies across the entire gross case value of that SKU.

#### `[A46]` Cross-SKU Free Goods Gifting & ₹0.00 Composite Supply Valuation
- **Context:** FMCG brand cross-promotions (e.g. "Buy 10 cases Detergent Powder $\to$ Get 2 cases Laundry Cake Free").
- **Assumption:** When a scheme defines a separate `freeSkuId` and `freeSkuName`, bonus cases are awarded in the secondary SKU without altering the primary SKU's delivered case count. Under Circular 92/11/2019-GST, the promotional goods are legally treated as a composite supply with zero additional tax liability.

#### `[A47]` Flat Per-Case Trade Cash Rebates
- **Context:** Commodity and fast-moving brands offering fixed cash incentives (e.g. ₹50 off per case on 5+ cases) rather than percentage discounts.
- **Assumption:** Flat rebates are applied directly against the line's pre-tax gross amount as `orderedCases * flatPerCase`. The taxable amount is reduced accordingly, ensuring compliant intra-state 50/50 MP GST assessment on the net value.

#### `[A48]` Real-Time Scheme Upsell Nudge Telemetry
- **Context:** Maximizing distributor average order value (AOV) and preventing shopkeeper post-order complaints ("If I knew 1 more case would give me 5%, I would have ordered 10!").
- **Assumption:** For every active line item below the maximum promotional tier, the pricing engine computes `nextTierNudge: { casesNeeded, targetTierPct, potentialSavings }`, providing immediate telemetry for UI nudge banners and counter sales prompts.

---

### Concurrency, Session Management & Persistent Multi-Tenant Isolation

#### `[A49]` Single-Writer Constraint & Active Session Concurrency Lock per Kirana Store
- **Context:** Multiple family members, counter clerks, or shop assistants attempting to place wholesale orders on behalf of the same Kirana retail store account simultaneously.
- **Core Architectural Assumption:** **At any given moment, only ONE person/session is allowed to place orders or maintain an active authenticated session for a specific Kirana/retailer store account.** Concurrent multi-user access for the same merchant is strictly prohibited.
- **Why This Is Enforced (Write Collision & Race Condition Elimination):**
  1. **Credit Ledger Headroom Corruption:** Wholesale buyers operate under credit limits (e.g. ₹50,000 ceiling, ₹12,000 existing balance = ₹38,000 available headroom). If User A and User B concurrently submit orders worth ₹25,000 each at time $T_0$, both checkouts would validate against the unupdated headroom, placing ₹50,000 in new debt against a ₹38,000 headroom and causing severe financial risk exposure for Company A.
  2. **Warehouse Stock Decrement Race Conditions:** Concurrent deductions on limited inventory (`deductSkuStock`) cause dirty reads, lost updates, or negative physical stock in the Jabalpur warehouse.
  3. **Duplicate Van Route Loading & Delivery Refusal:** Simultaneous orders from two store clerks create duplicate van dispatch manifests, leading to loading wasted cases onto morning vans and double billing that gets rejected at the store doorstep.
- **Implementation & Operational Protocol:**
  - Backed by the `active_sessions` table in Neon PostgreSQL (`retailer_id`, `session_id`, `user_id`, `phone`, `created_at`, `last_active_at`) and mirrored in-memory for instant single-server performance.
  - Active sessions expire after a **30-minute rolling window of inactivity** (`touchRetailerSession` resets this window on user requests).
  - Any subsequent login attempt for the same Kirana store within the active window returns HTTP 409 Conflict:
    ```json
    { "success": false, "error": "User already logged in", "code": "USER_ALREADY_LOGGED_IN", "activeSince": "2026-11-07T..." }
    ```
  - The login interface surfaces a high-visibility warning: **`"User already logged in"`** (in Devanagari Hindi: **`"उपयोगकर्ता पहले से लॉगिन है"`**).
  - A prominent **`[ Log Out All Other Sessions ]`** action is provided (`POST /api/auth/force-logout`), ensuring that if a shopkeeper closed a previous browser tab or switched phones, they can deliberately claim the active writer seat without waiting 30 minutes.
  - **Deferred OTP Consumption Protocol:** Verification is executed with `{ consume: false }` during preliminary validation. If the concurrency guard blocks the login (HTTP 409 Conflict), the OTP is **not burned or invalidated**.
  - Clicking `"Log Out All Other Sessions"` purges all active sessions from Neon PostgreSQL and memory cache, displays a confirmation banner (*"All other sessions have been logged out. Please click 'Verify & Login' below to enter."* / *"अन्य सभी सत्र सफलतापूर्वक लॉगआउट कर दिए गए हैं। कृपया प्रवेश करने के लिए नीचे 'सत्यापित कर लॉगिन करें' पर क्लिक करें।"*), and **preserves the entered OTP in the 6-digit input boxes**.
  - The shopkeeper then taps `"Verify & Login"` to immediately enter with the existing unburned OTP.
  - Normal logout (`POST /api/auth/logout`) releases the lock immediately via `releaseRetailerSession`.

#### `[A50]` Kirana-Scoped Cart & Multi-Tenant Session Isolation
- **Context:** Multiple distinct Kirana stores logging into the portal on a shared browser, smartphone, or distributor counter terminal.
- **Assumption:** Each Kirana store operates in a strictly isolated, independent session. Different Kirana accounts (e.g. *Sharma Kirana Store* `RET-0001` and *Verma General Store* `RET-0002`) can log in concurrently without cross-blocking or state sharing.
- **Client Storage Scoping Policy:**
  - Replaced all legacy global storage keys (`isolabs_draft_cart`, `isolabs_order_media`) with dynamically scoped keys:
    - Cart items: `isolabs_draft_cart_${retailerId}`
    - Audio/image media attachments: `isolabs_order_media_${retailerId}`
  - When User 1 logs out of Sharma Kirana and User 2 logs into Verma General on the same device, Verma General's cart is loaded strictly from `isolabs_draft_cart_RET-0002`. Sharma's unplaced cart lines remain segregated and never leak into Verma's checkout invoice.

#### `[A51]` Neon PostgreSQL Persistent Order Re-hydration Across Serverless Cold Starts
- **Context:** Ephemeral execution environments on Vercel serverless functions, container recycling, and local development restarts.
- **Assumption:** Neon PostgreSQL is the permanent, authoritative system of record for all confirmed B2B orders. The application must never rely solely on in-process memory (`dbStore`) for order history.
- **Re-hydration Protocol (`hydrateOrdersFromNeon`):**
  - All order retrieval endpoints (`GET /api/orders` for Kirana stores, `GET /api/desk/orders` for office clerks, and `GET /api/desk/orders/[id]` for order detail terminals) invoke `hydrateOrdersFromNeon(retailerId?)` to pull stored records and line items from Neon PostgreSQL into memory store via non-double-charging `upsertOrder`.
  - When placing orders (`POST /api/orders/checkout`), the system calls `hydrateOrdersFromNeon()` prior to calculating the next sequence number, dynamically scanning all persistent orders to guarantee monotonic, non-colliding order identifiers (`ORD-2026-XXXX`).
  - Previously placed orders remain permanently visible upon re-login, across browser sessions, and after complete server restarts.
