# Technical Design Document (TDD)
## B2B Distributor Order Management System & Regional Order Engine

**Client:** Company A, Jabalpur (4 Packaged Food & Home Care Brands, 1,800 Kirana Shops, 18 Salesmen)  
**Built with:** Next.js 16 (App Router), TypeScript, Neon PostgreSQL, Drizzle ORM, Vitest  
**Operational Status:** Production Ready • Version 3.2 • 258 Tests (100% Passing) • 100% Scorer Precision (96.9% 95% Wilson LCB)  
**Repository:** https://github.com/manva-niso/Distributor-Order-Management-System.git  
**Live Application:** http://localhost:3000 (Local Dev) / Vercel Serverless Production  

---

## 1. What We Built and Why

Company A is an established wholesale distributor in Jabalpur handling four major packaged food and home care brands. Every morning between 7:00 AM and 11:00 AM, the business receives roughly 600 wholesale orders from 1,800 local kirana grocery shops across Jabalpur.

Before this system was built, orders arrived through informal channels: messy WhatsApp text messages, photos of handwritten paper slips ("parchi"), and Hindi voice notes. Six office clerks spent their entire mornings manually reading these messages and re-typing them into Tally ERP one by one.

This legacy manual process caused three critical problems:
- **Painful Manual Re-typing:** Clerks worked under extreme morning time pressure copying unstructured messages into Tally. Spelling variations, missing pack sizes, and confusing local trade terms led to frequent mistakes and delayed van dispatches.
- **Salesman Stock Blindness:** Traveling field salesmen visiting retail counters had no visibility into live warehouse inventory or active trade promotions. They often booked orders for products that were already out of stock, leading to cancelled items and angry shopkeepers.
- **Credit Limit Breaches & Billing Disputes:** Shops frequently ordered beyond their credit limits, and confusion over case discounts versus loose pack pricing caused arguments when invoices were delivered.

**What We Built:**  
A single, mobile-friendly web application designed for low-end smartphones on 3G networks. Kirana shopkeepers can log in directly and place orders within their credit limit, or submit orders in their own words through text, paper slip photos, or voice notes. 

The application reads informal Hindi and Hinglish messages, flags anything unclear for human review, displays live warehouse stock, calculates wholesale trade offers and GST accurately, and provides the office desk with a one-tap Tally XML file ready for accounting import.

**ASSUMPTIONS ** :
* 1. `[A31]` **Standard Excel Catalogue Format:** We operate under the foundational assumption that the distributor's product catalogue and price updates are provided in the standard Excel (.xlsx or .xls) format used throughout this application. Product names, pack sizes, wholesale dealer prices, and GST tax classifications are ingested directly from this sheet.
* 2. `[A32]` **Flexible Column Handling:** The Excel reader automatically handles variations in column header naming (such as "Item Name", "Product", or "Description") and fills safe defaults for missing values.

---

## 2. Architecture & Technology Decisions

Each technology was chosen to meet a practical requirement: the app must run fast on low-cost Android phones, stay responsive on weak mobile networks, and handle intense morning ordering rushes without slowing down.

| Part | What We Used | Why We Chose It & Alternatives Rejected |
| :--- | :--- | :--- |
| **App & Server** | **Next.js 16 (App Router) + TypeScript** | Combines user screens and backend server logic in a single codebase with shared type definitions. We rejected a separate frontend and backend (like Vite + standalone Express) because deploying two independent servers makes field updates harder to keep in sync. |
| **Look & Feel** | **Tailwind CSS v4** | Very lightweight stylesheet (under 18 KB compressed). Guarantees large touch targets (at least 48 × 48 px) and clean high-contrast card borders that remain readable under bright sunlight on budget smartphone screens. |
| **Database** | **PostgreSQL on Neon + Drizzle ORM** | Reliable relational database with ACID safety that handles morning order spikes and restores saved orders reliably on server restarts. |
| **Sign-In & Security** | **Mobile OTP + Signed Session Cookies** | Passwordless login tailored for busy shopkeepers. Remembers login for 7 days so merchants do not have to sign in repeatedly, and securely identifies user roles (retailer, salesman, or desk clerk). |
| **Order Reading Engine** | **Rules-First + Scoring Model + Gemini AI Fallback** | 5-step hybrid cascade: instant rules and trade word lists execute in under 5 ms; a 12-signal scoring model predicts confidence in 0.00048 ms; Google Gemini Flash is called only for difficult dialect edge cases. |
| **Automated Testing** | **Vitest Test Runner** | Fast automated test runner that executes all 258 automated tests across 31 test files in under 5 seconds on a laptop with zero internet needed. |

---

## 3. How Data is Stored

The database organizes data into two clean groups: records that identify who is using the application, and records that manage the distributor's wholesale business operations.

![Figure 1: The two groups of data and how they connect](project-curation-and-research/Build Docs/diagrams/diagram_2_database_architecture.png)

### Group 1: Who is Using the App
- **User Accounts (`users`):** Stores each user's mobile phone number, name, and role. The role identifies whether the user is a retailer shopkeeper, a traveling field salesman, or an office desk clerk, determining what screens and actions they can access.
- **One-Time Passwords (`otps`):** Stores 6-digit verification codes. Each code expires after 5 minutes and is protected by a 30-second wait between requests and a 3-attempt lock.
- **Active Logins (`active_sessions`):** Keeps track of who is currently working on a shop's account, ensuring only one person edits an order at a time to prevent accidental overwrites.
- **Captured Raw Orders (`raw_orders`):** Preserves the original WhatsApp text, paper slip photo, or voice note along with what the system extracted, keeping an audit trail before cart conversion.

### Group 2: The Distributor's Wholesale Business
- **Shops (`retailers`):** Contains the shop name, owner name, credit limit, current unpaid balance, delivery route, and assigned salesman.
- **Products (`products`):** Contains product item codes, brand names, product categories, pack sizes, units per case, wholesale dealer prices, warehouse stock in cases, and GST tax rates.
- **Shop Nicknames (`retailer_aliases`):** Stores custom product nicknames used by specific shops. When a desk clerk maps an unfamiliar phrase to a product, the system remembers it for that shop next time.
- **Orders & Order Items (`orders`, `order_items`):** Stores confirmed orders with quantities of billed cases, free promotional cases, order totals, delivery status, and a version number that prevents two clerks from overwriting each other.

**ASSUMPTIONS ** :
* 1. `[A8]` **Warehouse Inventory Unit:** Inventory is strictly counted and deducted in full wholesale cases. Loose pack counts are shown for information and ordering convenience only.
* 2. `[A31]` **Excel Catalogue Ingestion:** Product catalogue updates and wholesale price revisions arrive in the standard Excel sheet format.
* 3. `[A50]` **Isolated Draft Carts:** Each shop has its own independent draft cart saved locally. Salesmen switching between different shops on a single phone never see items from another shop's cart.
* 4. `[A51]` **Reliable Order Sequencing:** Saved orders are reloaded from the database every time, ensuring order numbers (`ORD-2026-0001`, `ORD-2026-0002`) remain strictly sequential even if the server restarts.

---

## 4. How an Order Moves Through the System

Wholesale orders follow a clear operational lifecycle from initial catalogue upload to warehouse van dispatch and Tally accounting export.

![Figure 2: From catalogue upload to Tally export](project-curation-and-research/Build Docs/diagrams/diagram_1_wholesale_lifecycle.png)

### The Three Core Operational Journeys
1. **Shop Orders Directly by Itself:**  
   The shopkeeper signs in using a 6-digit SMS code, browses products with prices clearly displayed both with and without GST, adjusts case or loose pack quantities, sees how close they are to unlocking bulk discounts or free items, and submits the order within their approved credit limit.
2. **Shop Sends a WhatsApp Message, Slip Photo, or Voice Note:**  
   The app reads the informal Hindi or Hinglish message, converts colloquial trade words into catalog items, asks questions about anything unclear (such as whether "dabba" means a case or a pack), and creates a draft cart. A human always checks and confirms the draft cart before it becomes an order.
3. **Office Desk Reviews and Exports:**  
   Clerks review flagged orders on a split-screen dashboard, approve or hold orders exceeding credit limits, edit lines with order totals updating live, and export confirmed morning orders to Tally with a single tap.

---

## 5. Screens and Language

The application interface is intentionally designed for busy counters and warehouse loading docks.

### Key Screen Design Decisions
- **Built for Counter Lighting:** The interface uses clean white cards with crisp high-contrast borders, ensuring clear legibility on budget smartphones under bright counter lights or outdoor warehouse docks. Pages load in under 1.8 seconds on 3G connections.
- **Dusty Finger Touch Targets:** Every button, checkbox, and quantity stepper is at least 48 × 48 px with generous spacing, making them easy to tap accurately even with wet or dusty hands.
- **Relaxed Hindi Typography:** Line spacing is specifically adjusted so Hindi vowel marks (matras like `ी` and `ू`) are never clipped on small screens.
- **1-Tap Bilingual Toggle:** Shopkeepers and salesmen can toggle between English and Hindi at any time with a single tap. The chosen language is stored in browser storage and a 365-day cookie, persisting across page refreshes and browser tabs.
- **Authentic Trade Vocabulary:** Instead of technical computer jargon, the interface uses the exact words Jabalpur traders use daily: "पूरी पेटी" (full case), "खुले पैकेट" (loose packs), "थोक स्लैब छूट" (slab discount), and "मुफ्त माल" (free goods).
- **Adaptive Layout:** On mobile phones, items appear in a clean, single-column scrollable feed. On office desktop screens, the layout expands to a multi-column view showing raw messages side-by-side with editable cart lines.
- **No Dead Buttons:** Every button has clear loading, active, empty, and disabled states. If warehouse stock reaches zero, the button is clearly disabled with an "OUT OF STOCK" badge.

**ASSUMPTIONS ** :
* 1. `[A3]` **Standard Phone Format & Bilingual Support:** Phone numbers are 10-digit Indian mobile numbers (`+91`). Users can switch between English and Hindi at any moment.
* 2. `[A54]` **Local Trade Vocabulary:** Interface labels use authentic Jabalpur trade expressions rather than computer terminology.
* 3. `[A55]` **Automatic Hindi Name Generation:** Product names from newly uploaded spreadsheets are translated to Devanagari using a 3-step pipeline (known translations, trade dictionary, and sound-based converter) instantly without external AI costs.
* 4. `[A56]` **Persistent Language Preference:** The selected language is remembered across device restarts, browser tabs, and navigation visits.
* 5. `[A57]` **Mobile-First Responsive Layout:** The interface prioritizes mobile usability on phones while providing multi-column productivity on office desktops.

---

## 6. Authoritative Pricing Engine, Trade Offers & GST Math

All financial calculations are performed in an isolated, pure mathematical engine. It takes order lines, performs exact calculations, and returns totals. Because it does not rely on external network calls or database triggers, the exact same inputs always produce the exact same rupee totals.

![Figure 3: How an order total is worked out](project-curation-and-research/Build Docs/diagrams/diagram_7_scheme_gst_engine.png)

### The Four Rules, Executed in Exact Order
1. **Whole Paise Math:** All prices and intermediate calculations are handled as integer paise (₹1 = 100 paise), completely eliminating floating-point rounding errors.
2. **Free Goods Calculated First:** For "Buy X Get Y Free" offers, free cases are calculated by whole-number division: `floor(ordered / buyQty) * getFreeQty`. Promotional goods appear at ₹0 on the customer invoice (per CBIC Circular 92/11/2019-GST) while deducting inventory from the warehouse.
3. **Slab Discounts Second:** Percentage discounts apply to the subtotal of paid cases. Slab discounts do not stack; the order receives the single highest discount slab it qualifies for.
4. **Madhya Pradesh GST Last:** Intra-state sales split GST equally 50/50 into CGST and SGST, each rounded to the nearest paisa using commercial half-up rounding (0.5 paise rounds up to 1 paisa).

![Wholesale Base Cart Item Total Formula](project-curation-and-research/Build Docs/diagrams/formulas/formula_pricing_engine.png)

![Slab Discount Formula](project-curation-and-research/Build Docs/diagrams/formulas/formula_slab_discount.png)

![Free Goods Formula](project-curation-and-research/Build Docs/diagrams/formulas/formula_free_goods.png)

![Madhya Pradesh GST Formula](project-curation-and-research/Build Docs/diagrams/formulas/formula_mp_gst.png)

![Pack Ceiling Formula](project-curation-and-research/Build Docs/diagrams/formulas/formula_pack_ceiling.png)

**ASSUMPTIONS ** :
* 1. `[A2]` **Commercial Rounding & GST Split:** Currency rounding uses standard commercial half-up rounding to two decimal places, with intra-state GST split equally 50/50 into CGST and SGST.
* 2. `[A11]` **Free Goods Division:** Free items are calculated by whole-number division, and promotional goods carry ₹0 billing value on invoices.
* 3. `[A12]` **Pre-Tax Discounts:** Trade discounts reduce taxable value before GST is calculated.
* 4. `[A13]` & `[A45]` **Highest Slab Wins:** Discount slabs do not stack; the order receives the single highest discount tier it qualifies for.
* 5. `[A46]` **Cross-Product Free Goods:** Cross-SKU promotional items are added at ₹0 value with no additional tax liability.
* 6. `[A47]` **Flat Cash Rebates:** Fixed rupee rebates per case are deducted from taxable value prior to GST computation.
* 7. `[A48]` **Smart Offer Nudges:** The interface displays motivating hints (e.g. "Add 2 more cases to unlock 5% discount") to encourage larger orders.

---

## 7. Reading Hindi and Hinglish Orders

Shopkeepers rarely type clean catalog names like `"Parle-G Gluco Biscuit 75g"`. Instead, they send conversational messages like `"bhaiya 2 peti chhota dettol, 10 packet chips"`. The system turns these raw messages into accurate cart items through a 5-step order parsing cascade.

![Figure 4: From a WhatsApp message to a cart line](project-curation-and-research/Build Docs/diagrams/diagram_3a_retrieval_pipeline.png)

### The 5-Step Order Parsing Cascade
1. **Text Cleanup (< 1 ms):** Converts Hindi digits (`०-९`) to standard digits (`0-9`), removes conversational pleasantries (`"bhaiya bhejo"`), and checks for known shop nicknames.
2. **Quantity & Pack Type Extraction (< 5 ms):** Recognizes trade quantity terms like `"peti"` (case), `"dabba"`, and `"darjan"` (dozen). Converts loose packs to full cases and spots part-case requests.
3. **Candidate Product Retrieval:** Matches spelling similarity, phonetic sound matching, and category classifications. A dedicated pack-size extractor boosts matching sizes by +45% and penalizes competing sizes by -75% to prevent accidental size swaps.
4. **Confidence Scoring Model (< 0.0005 ms):** Evaluates 12 trade signals (candidate separation gap, word overlap, sound similarity, category match, and the shop's ordering history) to calculate an exact confidence percentage.
5. **Action Decision Rule:** Decides whether to auto-confirm, ask for confirmation, or escalate.

![Figure 5: What the app does with each match](project-curation-and-research/Build Docs/diagrams/diagram_3b_scorer_decision.png)

![Calibrated Scorer Formula](project-curation-and-research/Build Docs/diagrams/formulas/formula_platt_scorer.png)

### How the System Handles Uncertainty, Ambiguity & Mistakes
A key requirement of a production system is how it responds when it is unsure or when a message contains mistakes:
- **Missing or Ambiguous Units ("dabba", missing unit):** In Jabalpur, "dabba" can mean a small retail pack or an entire tin/case. Rather than guessing, the system strictly blocks auto-confirming (0% auto-confirm). It displays an interactive **Disambiguation Card** asking the merchant to choose "Full Case" or "Loose Packs".
- **Look-Alike Pack Sizes:** Products with multiple sizes (e.g. Parle-G 75g vs 250g, Ghadi 500g vs 1kg, Fortune 1L vs 15L) are held to a strict 94.5% confidence threshold. Single-variant products (Tata Salt, Vim Bar) auto-confirm safely at 75%.
- **Top-2 Choice Cards:** When confidence is between 50% and 94.5%, the UI displays the top-2 product choices as 1-tap chips, letting the shopkeeper or clerk confirm with one touch.
- **10× Typo Slip Protection:** If a merchant who usually orders 2 cases types 20 cases (more than 3 times their median and above their historical maximum), the system flags a gentle soft warning card ("Confirm 20 cases?"). However, if they ordered 10 cases specifically to unlock the "Buy 10 Get 1 Free" scheme, the system recognizes the promo quantity and does not bother them with a false alarm!
- **Uncatalogued Products ("cycle tyre", gibberish):** Clearly marked as `UNKNOWN_SKU` with helpful explanatory notes and fallback assignment chips, preventing catalog pollution.
- **Human-in-the-Loop Guarantee:** Every parsed message generates a draft cart; no order is booked into the database without human review and confirmation.

![Figure 6: How product words are sorted into categories](project-curation-and-research/Build Docs/diagrams/diagram_4_knowledge_graph.png)

### 3-Way Comparative Benchmark Across 444 Recorded Queries

To evaluate order reading reliability, we tested three engine architectures across 444 recorded trade queries:

| Evaluation Metric | Engine 1: Original V1 Baseline | Engine 2: Intermediate V2 Scorer | Engine 3: V3 Enhanced (Production App on Main) | Operational Impact |
| :--- | :---: | :---: | :---: | :--- |
| **Top-1 Match Accuracy (All 444)** | 67.3% | 67.3% | **76.8%** | **+9.5% accuracy gain via size grounding** |
| **Top-1 Match Accuracy (In-Catalog 427)** | 70.0% | 70.0% | **79.9%** | **+9.9% in-catalog candidate accuracy** |
| **Top-3 Retrieval Recall** | 91.3% | 91.3% | **91.6%** | High recall floor across all queries |
| **Auto-Confirm Precision** | **97.1%** | **100.0%** | **100.0%** | **Zero silent errors across all auto-confirms** |
| **Auto-Confirm Precision 95% Wilson LCB** | 0.929 (92.9%) | 0.936 (93.6%) | **0.969 (96.9%)** | **Strongest statistical confidence** |
| **Silent Cart Errors (False Positives)** | **4 wrong items** | **0 errors** | **0 errors** | **100% false auto-confirm elimination** |
| **Auto-Confirmed Volume (Lines Accepted)** | 140 lines | 56 lines | **119 lines** | **+112.5% throughput vs V2 (2.1× higher)** |
| **Auto-Confirm Coverage Rate** | 31.5% | 12.6% | **26.8%** | Safe zero-touch line processing |
| **Expected Calibration Error (ECE)** | 0.0737 | **0.0419** | **0.0803** | Calibrated probability distribution |
| **Packaging Ambiguity Rate (`DABBA`)** | 17.1% asked | 17.1% asked | **17.1% asked** | Guaranteed 0% auto-confirm on ambiguous units |
| **Quantity Slips Caught (10× Typos)** | 0% (No prior) | 0% (No prior logged) | **100.0% caught (3 of 3)** | Proactive soft warning card on order typos |
| **Promo Scheme False Alarms** | N/A | N/A | **0.0% (1 of 1 allowed)** | Suppressed when ordering promo quantities (Buy 10) |
| **Normal Habitual Orders Allowed** | N/A | N/A | **100.0% (1 of 1 allowed)**| Zero false alarms on normal orders |
| **End-to-End Pipeline Latency** | 14.86 ms | 15.19 ms | **15.04 ms** | Real measured full parsing + retrieval runtime |
| **Vector Scorer Inference Latency** | N/A | **0.00045 ms** | **0.00048 ms** | Sub-microsecond pure vector execution |

**ASSUMPTIONS ** :
* 1. `[A16]` **Strict Packaging Clarification:** In Jabalpur trade, "peti" strictly means a full wholesale case. If the packaging unit is omitted or ambiguous ("dabba"), the system always asks the user (0% auto-confirm).
* 2. `[A17]` & `[A59]` **Instant Rules First:** Rules and product category maps resolve queries locally; Gemini AI is escalated only for difficult edge cases with score $\ge 0.15$ capped at 100 tokens.
* 3. `[A18]` **Human-in-the-Loop:** All automated parsing results in draft cart lines; no order is placed without human confirmation.
* 4. `[A33]` **Pluggable Architecture:** The order parser is built behind an adapter interface so it can be swapped for another service anytime.
* 5. `[A34]` **Devanagari Normalization:** Numerals and trade words are cleaned and normalized prior to matching.
* 6. `[A35]` **Loose Pack Conversion:** Loose packs are rounded up to the nearest wholesale case for ordering.
* 7. `[A36]` **Part-Case Clarification:** Requests for fractional cases prompt the user to choose between rounding up to a case or ordering loose packs.
* 8. `[A58]` **Multi-Tier Audio Transcription:** Voice notes use fast local transcription models first, then Gemini Audio, with a pre-recorded offline fallback.
* 9. `[A60]` **Client-Side Image Compression:** Slip photos (up to 8 MB) are compressed in the browser to ~120 KB before upload to ensure fast transmission over 3G networks.
* 10. `[A61]` **Category Guardrails:** The knowledge graph prevents absurd cross-category recommendations (such as suggesting biscuits when detergent was requested).
* 11. `[A66]` **Calibrated Scorer & Quantity Guard:** High-confidence lines require $\ge 99\%$ precision policy (100% empirical precision, 96.9% Wilson LCB). Slip guards flag orders $> 3	imes$ median and above maximum, suppressed on promo tiers.

---

## 8. Live Stock Updates Across Screens

When a shop places an order, the updated stock count must appear on every screen immediately. Otherwise, two shops might attempt to order the same remaining cases at the same time.

![Figure 7: How a stock change reaches every screen](project-curation-and-research/Build Docs/diagrams/diagram_5_stock_sync.png)

### Four Ways Screens Stay in Sync
1. **Local Browser Tabs (0 ms):** Other tabs open on the same device update immediately via browser events.
2. **Live Feed from Server (under 50 ms):** Server-Sent Events (SSE) push stock changes to all connected devices in real time.
3. **Periodic Backup Check (every 2.5 seconds):** A lightweight 49-byte version ping verifies stock status if the live feed drops.
4. **Database Master Lock:** Stock counts are deducted safely in the database so inventory can never dip below zero.

If stock reaches zero, add-to-cart buttons are disabled, an "OUT OF STOCK" banner appears, and checkout is blocked.

**ASSUMPTIONS ** :
* 1. `[A9]` & `[A52]` **Out of Stock Lock:** Out-of-stock items cannot be added to cart or checked out.
* 2. `[A10]` **Clear Price Display:** Prices are shown exclusive of GST, with GST percentage and GST-inclusive totals clearly displayed.
* 3. `[A15]` & `[A30]` **Single Transaction Inventory Deduction:** Paid cases and free promotional cases are deducted simultaneously during checkout.
* 4. `[A24]` **Case-Insensitive Search:** Product search covers code, name, brand, and category, ignoring capital letters.
* 5. `[A26]` **Stock Restock Notifications:** Tapping "Notify me when available" records demand without allowing checkout.
* 6. `[A62]` **Complete Cache Scrub on Reset:** Database resets clear all active sessions and stored draft carts.
* 7. `[A63]` **Automatic Cart Cleansing:** When a desk clerk removes an item from the catalogue, it is automatically purged from active draft carts.

---

## 9. Security, Avoiding Clashes & Account Safety

The application protects merchant account data and prevents operational conflicts during busy morning ordering hours.

### Core Security & Concurrency Controls
- **Secure Sign-In:** After phone OTP verification, the user receives a secure sign-in cookie that lasts 7 days. It cannot be accessed by scripts in the browser, preventing account theft.
- **Shops Only See Their Own Data:** The server identifies the shop solely from the secure sign-in cookie, never from parameters sent by the client. One shop cannot view another shop's orders or balance.
- **One Person Per Shop at a Time:** If a salesman tries to access a shop's account while the shopkeeper is already placing an order, the system displays a conflict message (HTTP 409) to prevent overwriting.
- **Clerks Cannot Overwrite Each Other:** Orders carry a version number. If Clerk B tries to save changes to an order that Clerk A just edited, the system rejects the second save and prompts Clerk B to reload the fresh data.

![Optimistic Concurrency Control SQL Formula](project-curation-and-research/Build Docs/diagrams/formulas/formula_occ_sql.png)

- **Credit Limit Enforcement:** If an order pushes a shop's unpaid balance beyond its approved credit limit, the order automatically pauses in `CREDIT_HOLD` status for clerk approval.

**ASSUMPTIONS ** :
* 1. `[A4]` **Authorized Access Only:** The system requires authentication for all operations; public endpoints are strictly limited to login and catalogue preview.
* 2. `[A5]` & `[A27]` **Pre-Seeded Directory & Self-Registration:** All 1,800 Jabalpur kiranas are pre-loaded; new shops can register and receive a default ₹25,000 credit limit.
* 3. `[A6]` **OTP Security Policy:** Login codes expire in 5 minutes, can be requested once per 30 seconds, and lock after 3 failed attempts.
* 4. `[A7]` **7-Day Session Longevity:** Sign-in sessions persist for 7 days to eliminate daily login friction for busy merchants.
* 5. `[A14]` **Credit Hold Trigger:** Orders pushing a shop's unpaid balance beyond its credit limit are routed to `CREDIT_HOLD`.
* 6. `[A28]` **Unique Phone Enforcement:** Each phone number can only be registered once.
* 7. `[A29]` **Deterministic Order Progression:** Order status transitions strictly through `PLACED` $	o$ `CREDIT_HOLD` (if needed) $	o$ `CONFIRMED` $	o$ `DISPATCHED` $	o$ `DELIVERED`.
* 8. `[A37]` **Audited Credit Release:** Only office clerks can release credit holds, and must enter a mandatory remark.
* 9. `[A38]` **Full Recalculation on Edit:** When a clerk adjusts an order line, the entire order is recomputed by the pricing engine.
* 10. `[A49]` **Non-Destructive Session Conflict:** A login clash does not consume the OTP code, allowing immediate re-trial.
* 11. `[A53]` **Dual-Layer Cart Resilience:** Draft carts are stored in both memory and browser local storage, surviving accidental refreshes.
* 12. `[A64]` **Demo Master Codes:** In sandbox mode, master OTPs (`123456`, `716716`) allow instant 1-tap evaluator login.

---

## 10. Downstream Integration: Tally ERP, Logistics & Retention

Confirmed wholesale orders feed directly into distributor logistics, accounting, and sales operations.

### A. Tally ERP 9 / Prime Sales Voucher Export
- Each confirmed order exports as a standard Sales Order XML voucher ready for direct import into Tally ERP 9 or Tally Prime.
- Free goods are handled cleanly: the voucher records the delivered quantity (e.g. 11 cases) and the billed quantity (10 cases) so accounting stock matches warehouse inventory.
- Dual-entry accounting: the shop's ledger debit balances to ₹0.00 against sales and GST accounts.

![Tally Dual-Entry Balancing Formula](project-curation-and-research/Build Docs/diagrams/formulas/formula_tally_balance.png)

### B. Warehouse Logistics & Delivery Run Lists
- **Totals Confirmed Orders:** Aggregates morning orders by delivery route (e.g. Napier Town Route 4, Gorakhpur Route 2).
- **Consolidated Loading Lists:** Shows the total paid and free cases needed per product so warehouse crews can load delivery vans quickly.
- **Cargo Weight Calculations:** Calculates vehicle payload weight from product pack specifications to prevent overloading delivery vans.

### C. Inactive Shop Retention Desk
- Identifies shops that have stopped ordering: marks accounts with no orders for 14+ days as "High Risk" and 21+ days as "Critical".
- Generates a ready-to-send WhatsApp message in Hindi and English containing the shopkeeper's name and active trade schemes to encourage re-ordering.

**ASSUMPTIONS ** :
* 1. `[A1]` **2:00 PM Order Cut-Off:** Orders placed before 2:00 PM are scheduled for next-morning delivery runs.
* 2. `[A21]` **Standard Tally XML Format:** The Tally export follows the standard Sales Order voucher XML specification compatible with Tally ERP 9 and Tally Prime.
* 3. `[A22]` & `[A41]` **Unified Pick Lists:** Warehouse pick sheets display combined paid and free cases to load.
* 4. `[A23]` & `[A43]` **Dormancy Tiers:** 14 days without an order triggers a warning; 21 days marks the counter as critical.
* 5. `[A39]` **Delivered vs Billed Parity:** Tally vouchers record delivered and billed quantities separately to ensure inventory reflects actual goods handed over.
* 6. `[A40]` **Zero-Balance Accounting:** Ledger debits and credits balance to exactly ₹0.00.
* 7. `[A42]` **Cargo Weight Calculation:** Vehicle load weights are computed from product case specifications.
* 8. `[A44]` **Personalized WhatsApp Messages:** Re-engagement messages include shopkeeper greeting, inactive days, and live promotional offers.

---

## 11. Verification Matrix & 18-Step Test Journey

To verify that the system is fully operational and reliable, we mapped the complete user journey into 18 verifiable steps. An automated test suite executes this full journey from start to finish.

![Figure 8: The 18-step test journey](project-curation-and-research/Build Docs/diagrams/diagram_6_verification_matrix.png)

### Automated Test Suite Coverage

All 258 automated tests across 31 test files pass cleanly in under 5 seconds with zero external dependencies:

| Area | Test Files | Tests | What is Checked |
| :--- | :--- | :---: | :--- |
| **Walkthrough** | `walkthrough.test.ts` | 19 | All 18 steps executed in order with celebratory feedback |
| **Login and Locks** | `auth.test.ts`, `session-lock.test.ts` | 19 | OTP security, rate limits, one user per shop exclusivity |
| **Pricing Engine** | `engine` (7 test suites) | 68 | Trade offers, slab discounts, half-up rounding, MP GST split |
| **Scoring Model** | `ml-parity.test.ts` | 4 | Parity with Python training tool to machine epsilon |
| **Text and Speech** | `text-parser`, `cascaded-parser` | 30 | Digits, unit conversion, part-case clarification |
| **Product Category Map** | `knowledge-graph.test.ts` | 5 | Category boundaries and trade synonym routing |
| **Product Matching** | `candidate-retriever.test.ts` | 11 | Spelling, sound, and pack-size match scoring |
| **Confidence & Slip Check** | `calibrated-scorer.test.ts` | 7 | Adaptive thresholds and 10× typo outlier detection |
| **Catalogue & Live Stock** | `catalogue`, `realtime-stock` | 13 | Pricing, inventory deduction, multi-tab sync |
| **Cart and Orders** | `orders`, `cart-storage` | 11 | Credit limits, credit holds, draft cart isolation |
| **Order Desk** | `desk.test.ts` | 9 | Version conflict detection, hold release, alias learning |
| **Tally and Delivery** | `tally`, `manifest` | 12 | XML voucher formatting, zero balance, van pick lists |
| **Inactive Shops** | `dormant.test.ts` | 4 | 14-day and 21-day dormancy tiers, WhatsApp links |
| **Excel & Database Sync** | `excel-import`, `reset-sync-and-auth` | 11 | Sheet import flexibility, complete cache flush |
| **Fallback & Hindi Names** | `gemini-random-words`, `dynamic-transliteration` | 8 | Out-of-catalog explanations, Hindi transliteration |
| **Deterministic Safety** | `deterministic-guardrails`, `gemini-chooser` | 17 | Audio fallbacks, closed-set candidate whitelists |
| **Total** | **31 Test Files** | **258** | **100% Passing (0 Failures)** |

**ASSUMPTIONS ** :
* 1. `[A65]` **Programmatic Journey Verification:** The 18-step interactive walkthrough UI includes 1-tap bulk progress controls and a celebration card, verified by automated end-to-end tests.

---

## 12. Performance & 3G Mobile Budget

The system was benchmarked against strict latency and payload budgets to guarantee fast performance on budget smartphones over 3G cellular connections:

| What We Measured | Budget Target | Actual Result | Operational Status |
| :--- | :---: | :---: | :---: |
| **Reading a Text Message** | Under 50 ms | **2 to 5 ms** | Target Met |
| **Scoring One Match** | Under 0.05 ms | **0.00048 ms** | Target Met (~2,100,000 checks/sec) |
| **Gemini AI Answer for Hard Cases** | Under 2.0 s | **1.1 to 1.45 s** | Target Met |
| **Production Build Execution** | Under 10 s | **3.8 s** | Target Met |
| **All 258 Automated Tests** | Under 30 s | **4.8 s** | Target Met |
| **Compressed CSS Bundle Size** | Under 50 KB | **17.4 KB** | Target Met |
| **First Screen Load on 3G Phone** | Under 3.0 s | **1.8 s** | Target Met |

---

## 13. Deliberate Scope Cuts & Known Limitations

To deliver a reliable, working product on schedule, we made deliberate architectural trade-offs and kept candid notes on system boundaries:

### What We Cut on Purpose
1. **Online Payment Gateway (UPI / NetBanking / Cards):**  
   Kirana shops in Jabalpur operate on weekly credit ledgers (typically 14-day terms) or pay cash on delivery when the van arrives. Adding mandatory online payment at checkout would create friction, delay morning orders, and slow down shop adoption.
2. **Live GPS Delivery Van Tracking:**  
   Wholesale delivery routes in Jabalpur are fixed daily morning runs. Real-time GPS tracking requires continuous background mobile data and drains smartphone batteries on cheap counter devices, providing little business value compared to fixed van loading manifests.
3. **Direct Government E-Invoicing (IRN) Generation:**  
   Company A already has government e-invoicing configured directly inside their Tally ERP. Rebuilding an e-invoicing tax portal inside the web app would duplicate compliance efforts. Instead, our system generates the exact XML structure Tally requires to generate IRNs automatically.

### Candid Known Limitations
1. **Tally Ledger Name Mapping:**  
   The Tally export uses standard sales and tax ledger names (such as "Sales-Local @ 18%"). When connecting to Company A's live Tally company file for the first time, an accountant must perform a one-time mapping if their ledger names differ.
2. **SMS Gateway in Production:**  
   In sandbox mode, OTP codes display directly on-screen for instant testing. In live production deployment, the application connects to a DLT-registered Indian SMS provider (such as Fast2SMS or Twilio India) to deliver SMS messages to shopkeepers.
3. **Cloud Media Storage Configuration:**  
   Paper slip photos and audio notes use S3-compatible cloud storage URLs. If cloud storage credentials are not provided in the environment file, the system safely falls back to local browser storage previews.

### What We Would Do Next (Future Roadmap)
- **Multi-Warehouse Route Optimization:** Automated delivery van load-balancing across multiple regional godowns based on traffic and live order volumes.
- **Continuous Trade Alias Learning:** An automated feedback queue that periodically updates product synonym dictionaries as office clerks correct unrecognized dialect words.
- **Offline Service Worker Ordering:** Full offline order drafts allowing shopkeepers in deep basement counters with zero cellular signal to compose orders that sync automatically when connection resumes.
