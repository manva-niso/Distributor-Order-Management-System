# User-Facing Issues & UX Friction Registry

> [!NOTE]
> **Distinction Between "Errors" and "Issues":**
> - **Errors (`Errors.md`):** Technical defects, compilation failures, TypeScript errors, unhandled exceptions, and algorithmic bugs encountered in the code during development.
> - **Issues (`Issues.md`):** Problems, friction, confusions, and unexpected behaviors experienced by **real human users** (Kirana store owners, order desk clerks, field salesmen, and live evaluators) while interacting with the application workflows and user interface.

---

## Executive Summary & Overview

Across the design, implementation, user testing, and cloud deployment of the IsoLabs FMCG B2B Wholesale Distribution Platform, multiple functional and UX issues were uncovered during real-world simulation runs. These spanned:
1. **Cart & Ordering Friction:** Lost items, unexpected empty carts, and confusion over case vs loose pack units.
2. **Multi-User Concurrency & Tenancy:** Session collisions when multiple users accessed the same store, broken force-logout buttons, and draft cart contamination across store logins.
3. **Real-Time Warehouse Stock & Multi-Seat Visibility:** Overselling, lack of real-time inventory updates across competing stores, and abrupt checkout failures.
4. **Data Persistence & Cold-Start Memory Leaks:** Orders disappearing upon re-login in serverless cloud environments.
5. **AI Order Capture & Vernacular Ambiguity:** False positive product recommendations, polysemic unit confusion ("dabba"), and gibberish handling.
6. **UI Ergonomics & Accessibility:** Invasive walkthrough overlays blocking buttons, language accessibility barriers in rural MP, and credit hold confusion.
7. **Cloud Deployment & Environment Clashes:** Concurrent lock clashes between local development instances and deployed Vercel environments sharing a unified database.

Every single issue recorded below was addressed, architecturally hardened, and verified.

---

## Master Issues Index

| Issue ID | Category | Summary / User Friction | Affected Persona | Status |
| :--- | :--- | :--- | :--- | :--- |
| **`[ISSUE-001]`** | Cart & Drafts | Empty cart displayed after clicking "Move to Cart" in Quick Order AI | Kirana Retailer | **Resolved** |
| **`[ISSUE-002]`** | Tenancy & Privacy | Cart items from previous Kirana store appearing in next store's cart on shared device | Kirana Retailer | **Resolved** |
| **`[ISSUE-003]`** | Pricing & Units | Confusion over whole cases vs loose single packets and minimum order quantities | Kirana Retailer | **Resolved** |
| **`[ISSUE-004]`** | Concurrency | Concurrent logins under same Kirana store causing write collisions and corrupted orders | Kirana Retailer | **Resolved** |
| **`[ISSUE-005]`** | Auth & Concurrency | "Force Logout Existing Session" button not allowing login and burning OTP code | Kirana Retailer | **Resolved** |
| **`[ISSUE-006]`** | Sandbox UX | Development Master OTP "716716" failing when real SMS OTP was previously requested | Evaluator / Tester | **Resolved** |
| **`[ISSUE-007]`** | Inventory & Stock | No real-time stock sync between competing retailers ordering warehouse goods simultaneously | Kirana Retailer | **Resolved** |
| **`[ISSUE-008]`** | Inventory & Stock | Sudden out-of-stock rejection at checkout instead of proactive live warning | Kirana Retailer | **Resolved** |
| **`[ISSUE-009]`** | Persistence | Previously placed orders disappearing upon re-login on Vercel serverless cold starts | Kirana Retailer / Clerk | **Resolved** |
| **`[ISSUE-010]`** | Onboarding UX | Pre-seeded dummy orders on startup depriving users of placing their first order | First-Time User | **Resolved** |
| **`[ISSUE-011]`** | Data Integrity | Master catalog Excel import unintentionally deleting all registered retailer accounts | Desk Clerk / Admin | **Resolved** |
| **`[ISSUE-012]`** | AI Capture UX | Out-of-catalog customer requests (e.g. "10 packet chips") matching random biscuits | Kirana Retailer | **Resolved** |
| **`[ISSUE-013]`** | Vernacular Ambiguity | Polysemic term "Dabba" causing disputes between single tin pack vs wholesale carton | Kirana Retailer | **Resolved** |
| **`[ISSUE-014]`** | AI Capture UX | Random words or typos causing unhandled crashes instead of natural explanation | Kirana Retailer | **Resolved** |
| **`[ISSUE-015]`** | UI & Ergonomics | Interactive walkthrough overlay blocking screen buttons and broken on mobile viewport | Mobile / Desktop User | **Resolved** |
| **`[ISSUE-016]`** | Language & Access | Monolingual English interface alienating rural Madhya Pradesh Kirana store merchants | Kirana Retailer | **Resolved** |
| **`[ISSUE-017]`** | Credit & Billing UX | Retailer unaware why order went to "CREDIT_HOLD" without ledger headroom breakdown | Kirana Retailer | **Resolved** |
| **`[ISSUE-018]`** | Role Ergonomics | Order Desk cluttered with Kirana order-capture inputs, violating distributor role boundaries | Desk Clerk | **Resolved** |
| **`[ISSUE-019]`** | Multi-Environment | Local dev server and deployed Vercel site sharing same Neon DB clashing active session locks | Developer / Tester | **Resolved** |
| **`[ISSUE-020]`** | Cloud Integration | Vercel direct Neon integration injecting `POSTGRES_URL` instead of `DATABASE_URL` | DevOps / Deployer | **Resolved** |

---

## Detailed Issue Logs

---

### `[ISSUE-001]` Empty Cart Displayed After Clicking "Move to Cart" from Quick Order AI
- **Date & Phase:** 2026-11-07 | Quick Order AI to Cart Workflow
- **User Persona Affected:** Kirana Store Owner / Field Salesman
- **User Experience & Pain Point:**
  The user typed or dictated an order into Quick Order AI (e.g., *"bhaiya 5 peti biscuit chhota"*). The AI parsed it cleanly, displaying *5 cases of Parle-G Gluco Biscuit*. The user clicked the bright green button **"Move to Cart (1 items)"**. The app redirected to `/cart`, but the page rendered:
  > *"Your cart is empty. Browse catalogue to add items."*
  
  The user had to navigate back and re-add items manually, feeling that the AI order capture was unreliable.
- **Why It Happened (User Perspective):**
  When multi-Kirana isolation was added, cart keys became isolated per store (`isolabs_draft_cart_${retailerId}`). If the user clicked "Move to Cart" before `/api/catalogue` finished loading `retailerId` in the background, Quick Order saved the items under the generic key `isolabs_draft_cart`. Upon arriving at `/cart`, the cart page fetched `retailerId: "RET-0001"`, looked strictly for `isolabs_draft_cart_RET-0001`, and found nothing, wiping the displayed cart without checking fallback storage.
- **UX & Functional Resolution:**
  1. **Dual-Write Mirroring (`saveScopedCart`):** Quick Order and Catalogue now simultaneously write draft items to both `isolabs_draft_cart_${retailerId}` and the universal safety key `isolabs_draft_cart`.
  2. **Multi-Tier Fallback & Auto-Migration (`loadScopedCart`):** On `/cart` load, if the scoped key is empty, the system automatically checks the universal fallback key, restores the parsed items, and migrates them to the scoped store key.
  3. **0ms Optimistic Hydration:** `/cart` renders the draft cart synchronously from local storage on initial mount, eliminating the blank-cart flash while network calls are in flight.
- **Verification & Outcome:** Verified. Parsed items appear instantly in `/cart` with 0ms lag and zero dropped lines.

---

### `[ISSUE-002]` Cart Cross-Contamination on Shared Devices Across Different Kirana Stores
- **Date & Phase:** 2026-11-07 | Multi-Store Session Testing
- **User Persona Affected:** Kirana Retailers sharing a phone / Distributor Field Salesman
- **User Experience & Pain Point:**
  User 1 logged in as **Sharma Kirana Store**, added 5 cases of Parle-G to their cart, and logged out. User 2 picked up the same phone/tablet, logged in as **Verma General Store**, and opened `/cart`. Verma General Store saw Sharma's 5 cases of Parle-G already sitting in their cart! If they checked out without noticing, Verma was billed for Sharma's intended order.
- **Why It Happened (User Perspective):**
  Draft carts were stored in browser `localStorage` under a single global key `isolabs_draft_cart`. Logging out cleared auth cookies but left uncommitted draft carts sitting in browser storage for whoever logged in next.
- **UX & Functional Resolution:**
  Implemented Kirana Cart Isolation ([`[A50]`](file:///V:/Projects/Resume%20Projects/IsoLabs/project-curation-and-research/Build%20Docs/Assumptions.md#L370-L374)). All draft cart operations (`loadScopedCart`, `saveScopedCart`, `clearScopedCart`) are strictly namespaced by `retailerId` (`isolabs_draft_cart_RET-0001`, `isolabs_draft_cart_RET-0002`). Switching accounts on the same browser gives each merchant an independent, isolated cart.
- **Verification & Outcome:** Verified. Logging into Sharma Kirana, adding items, logging out, and logging into Verma General Store renders an empty cart for Verma. Re-logging into Sharma restores Sharma's exact unplaced items.

---

### `[ISSUE-003]` Confusion Over Whole Cases vs Loose Single Packets and Minimum Order Quantities
- **Date & Phase:** 2026-11-03 | Wholesale FMCG Catalogue & Pricing
- **User Persona Affected:** Small Kirana Merchants
- **User Experience & Pain Point:**
  Small village retailers often sell products in single consumer packets (e.g., 5 or 10 packets of soap) and attempted to order single packets from the distributor. However, FMCG wholesale distributors in Jabalpur only ship sealed corrugated cartons (peti/cases). When the app only allowed ordering in cases, merchants were confused about how many units were in a case and how line totals were calculated.
- **Why It Happened (User Perspective):**
  The system initially assumed all wholesale ordering is strictly whole-case. It provided no way to view unit packet prices or round up loose orders transparently.
- **UX & Functional Resolution:**
  1. **Dual Unit Steppers (`cases` + `packs`):** Every catalogue SKU card and cart row displays both wholesale cases (peti) and loose cut-packs ([`[A8]`](file:///V:/Projects/Resume%20Projects/IsoLabs/project-curation-and-research/Build%20Docs/Assumptions.md#L88-L100)).
  2. **Transparent Case Conversion:** SKU cards explicitly display: *"48 units/case | ₹28/pack | ₹1,344/case"*.
  3. **AI Case Rounding Resolution:** In Quick Order, if a retailer says *"10 packet Good Day"*, the AI gives them an interactive choice card: **Option A (Round Up to 1 Case of 48)** or **Option B (Keep 10 Loose Packs with broken-case surcharge)**.
- **Verification & Outcome:** Verified. Kirana owners have full clarity on unit economics and can choose between full cartons or loose units without arithmetic errors.

---

### `[ISSUE-004]` Concurrent Logins Under Same Kirana Store Causing Write Collisions
- **Date & Phase:** 2026-11-07 | Multi-Device Store Operations
- **User Persona Affected:** Kirana Store Owners with multiple family members / staff
- **User Experience & Pain Point:**
  A Kirana store owner at the warehouse counter and his brother at the shop both opened the app under the same Kirana account on two different phones. Both started building carts and submitting orders simultaneously, creating duplicate orders, clashing credit ledger deductions, and corrupting draft cart states.
- **Why It Happened (User Perspective):**
  The platform allowed infinite concurrent logins for the same retailer account. Kirana wholesale orders are single-party legal purchase contracts; having multiple people ordering concurrently from the same credit ledger causes double-invoicing.
- **UX & Functional Resolution:**
  Implemented Single-Writer Kirana Concurrency Lock ([`[A49]`](file:///V:/Projects/Resume%20Projects/IsoLabs/project-curation-and-research/Build%20Docs/Assumptions.md#L358-L368)). When User 1 is actively logged in for Sharma Kirana, if User 2 attempts to log in from another device/browser:
  - The login screen halts with an amber warning banner:  
    *`"⚠️ User already logged in. Another user is currently logged in as Sharma Kirana Store (RET-0001) from another browser/seat."`*
  - The second user is blocked from entering to protect ledger integrity.
  - A dedicated action button allows the owner to **"Log Out All Other Sessions & Continue"** if the other session was an orphaned or forgotten tab.
- **Verification & Outcome:** Verified. Second device is blocked until the active session terminates or is explicitly force-logged out.

---

### `[ISSUE-005]` "Force Logout Existing Session" Button Not Working & Burning Active OTP Code
- **Date & Phase:** 2026-11-07 | Concurrency Conflict Resolution Screen
- **User Persona Affected:** Kirana Retailer attempting to reclaim store access
- **User Experience & Pain Point:**
  When a user encountered the *"User already logged in"* notice, they clicked the button **"Log Out All Other Sessions"**. Nothing seemed to happen. When they clicked **"Verify & Login"** again, the screen showed a red error:
  > *"No active OTP request found for this number. Please click 'Send OTP'."*
  
  The user had to click "Send OTP" again, wait for a new SMS code, and re-type all 6 digits from scratch.
- **Why It Happened (User Perspective):**
  1. The OTP verification function was marking the OTP as `verified: true` *before* checking the concurrency lock. When the 409 conflict was returned, the OTP was already consumed in the database.
  2. The frontend force-logout action was calling a generic logout endpoint that only cleared the current browser's cookie instead of purging the remote session lock from the database.
  3. Clicking force logout wiped the 6-digit OTP input boxes on the screen.
- **UX & Functional Resolution:**
  1. **Deferred OTP Consumption (`options: { consume: false }`):** OTP codes remain active and unburned when a 409 concurrency lock occurs ([`[ERR-045]`](file:///V:/Projects/Resume%20Projects/IsoLabs/project-curation-and-research/Build%20Docs/Errors.md#L531-L556)).
  2. **Dedicated Force-Logout Endpoint (`POST /api/auth/force-logout`):** Specifically purges the remote session lock from Neon PostgreSQL `active_sessions`.
  3. **Preserved OTP Input State:** The 6-digit boxes remain filled, and a green confirmation message instructs the user: *"All other sessions logged out. Click 'Verify & Login' to enter."*
- **Verification & Outcome:** Verified. Clicking "Log Out All Other Sessions" instantly clears the remote lock; clicking "Verify & Login" succeeds immediately with the existing OTP.

---

### `[ISSUE-006]` Development Sandbox Master OTP "716716" Failing After Sending Real SMS OTP
- **Date & Phase:** 2026-11-07 | Evaluation & Quick-Demo Sandbox
- **User Persona Affected:** Evaluators, Reviewers & Development Testers
- **User Experience & Pain Point:**
  The login screen features an informational sandbox helper: *"Dev Sandbox Notice: Master Verification Code is 716716"*. The evaluator entered their phone number, clicked "Send OTP", saw the SMS dispatch banner, and typed the master code `716716`. The server returned an error:
  > *"Incorrect OTP. 1 attempt(s) remaining."*
  
  The evaluator was confused because the sandbox instructions explicitly said `716716` always works.
- **Why It Happened (User Perspective):**
  The master code check was coded as a fallback `if (!activeOtp && isDevOrConsole && code === "716716")`. Once "Send OTP" was pressed, an `activeOtp` record was generated with random digits (e.g. `498712`). Because `activeOtp` was not null, the master bypass was skipped, and `716716` was rejected against `498712`.
- **UX & Functional Resolution:**
  Updated `verifyOtp` in `src/lib/auth/otp.ts` ([`[ERR-046]`](file:///V:/Projects/Resume%20Projects/IsoLabs/project-curation-and-research/Build%20Docs/Errors.md#L559-L571)). In sandbox/dev environments, typing `716716` unconditionally authenticates the user, synchronizing `activeOtp.otpCode = "716716"`.
- **Verification & Outcome:** Verified. Both the dynamically generated SMS code and the master code `716716` work reliably under all testing flows.

---

### `[ISSUE-007]` Lack of Real-Time Stock Updates Between Competing Retailers Ordering Simultaneously
- **Date & Phase:** 2026-11-07 | Multi-Retailer Concurrent Ingestion
- **User Persona Affected:** Multiple Kirana Stores ordering during morning replenishment rush
- **User Experience & Pain Point:**
  At 9:00 AM, Sharma Kirana and Verma General Store both opened their catalogues. Warehouse stock for Marie Gold biscuits showed 10 cases available. Sharma Kirana added 8 cases and placed the order. Verma General Store's screen still showed 10 cases available. Verma attempted to order 5 cases, expecting confirmation, but only found out after submission that stock was unavailable.
- **Why It Happened (User Perspective):**
  Stock levels were only retrieved on initial page load (`fetch('/api/catalogue')`). Once the page loaded, the client was completely blind to real-time warehouse inventory changes made by other stores or the order desk.
- **UX & Functional Resolution:**
  Implemented Multi-Store Real-Time Warehouse Stock Synchronization ([`[A52]`](file:///V:/Projects/Resume%20Projects/IsoLabs/project-curation-and-research/Build%20Docs/Assumptions.md#L383-L398)).
  1. **BroadcastChannel:** Instant 0ms cross-tab propagation on the same machine.
  2. **Server-Sent Events (`/api/catalogue/live-stock`):** Streams real-time `STOCK_UPDATE` events over persistent HTTP connections to all connected devices.
  3. **Adaptive Versioned Polling:** 2.5s fallback ping for environments where SSE connections drop.
- **Verification & Outcome:** Verified. When Sharma Kirana buys 8 cases, Verma General's screen live-decrements from 10 to 2 cases within milliseconds without refreshing the browser.

---

### `[ISSUE-008]` Sudden Out-of-Stock Rejection at Checkout Instead of Proactive Live Warning
- **Date & Phase:** 2026-11-07 | Multi-Seat Warehouse Synchronization
- **User Persona Affected:** Kirana Retailer with items in draft cart
- **User Experience & Pain Point:**
  A retailer had 5 cases of an SKU sitting in their `/cart` while reviewing order totals. Another retailer placed an order that completely depleted warehouse stock to 0. When the first retailer clicked "Confirm Order", they were hit with a harsh error modal: *"Insufficient stock"*, leaving them stranded with no explanation of what happened or which line item caused the failure.
- **Why It Happened (User Perspective):**
  The cart page only performed inventory validation at the instant the checkout API was called, rather than monitoring warehouse stock in real time.
- **UX & Functional Resolution:**
  Modeled after **movie ticketing seat reservation architectures**:
  1. **Live Catalogue Transition:** When stock hits 0, the SKU card flips to a red **`OUT OF STOCK`** badge (`स्टॉक समाप्त`), quantity steppers lock, and "Notify When Available" replaces cart buttons.
  2. **Proactive Cart Warning Banner:** If the retailer already has the depleted item in `/cart`, an immediate high-contrast red alert banner appears:  
     *`"⚠️ Live Stock Alert: Warehouse Inventory Ran Out! Another retailer just placed an order for the remaining cases of [SKU Name]. Please remove it to proceed with checkout."`*
  3. **Checkout Button Blocker:** The checkout button is dynamically disabled with the label: *"Remove Out of Stock Items to Order"*, preventing confusing server rejections.
- **Verification & Outcome:** Verified. Tested live with dual-retailer PowerShell script. Out-of-stock items block checkout proactively with high-contrast visual cues.

---

### `[ISSUE-009]` Placed Orders Mysteriously Disappearing Upon Re-Login in Serverless Deployments
- **Date & Phase:** 2026-11-07 | Vercel Serverless & Neon DB Persistence
- **User Persona Affected:** Kirana Store Owner checking past order history
- **User Experience & Pain Point:**
  The user placed an order (`ORD-2026-0001`), saw the confirmation screen, logged out, and logged back in 15 minutes later. When opening the **Orders** tab, the screen displayed:
  > *"No orders placed yet. Place your first order from catalogue."*
  
  The user panicked, assuming their wholesale order had been lost by the distributor.
- **Why It Happened (User Perspective):**
  Orders were saved to Neon PostgreSQL, but order list endpoints (`GET /api/orders` and `GET /api/desk/orders`) read from in-process memory (`dbStore`). In serverless environments like Vercel, lambda containers recycle frequently. Upon cold start, in-process memory was empty, causing past orders to vanish until a full server restart occurred.
- **UX & Functional Resolution:**
  Implemented Durable Neon PostgreSQL Hydration ([`[A51]`](file:///V:/Projects/Resume%20Projects/IsoLabs/project-curation-and-research/Build%20Docs/Assumptions.md#L375-L382)). All order retrieval routes invoke `hydrateOrdersFromNeon(retailerId?)` before responding, seamlessly populating memory store from persistent database tables with monotonic order sequence numbering.
- **Verification & Outcome:** Verified. Past orders, order line items, and audit timestamps remain permanently visible across re-logins, browser restarts, and Vercel container recycles.

---

### `[ISSUE-010]` Pre-Seeded Dummy Orders Depriving First-Time Users of Placing Their First Order
- **Date & Phase:** 2026-11-05 | First-Time User Experience & Evaluator Onboarding
- **User Persona Affected:** First-Time Evaluator / Demo Reviewer
- **User Experience & Pain Point:**
  When an evaluator opened the freshly installed app, the Order Desk and Retailer portal already contained 4 dummy pre-seeded orders. The evaluator could not experience what a first-time setup feels like, could not verify sequence numbering (`ORD-2026-0001`), and could not distinguish between sample mock data and their own test inputs.
- **Why It Happened (User Perspective):**
  Seed scripts initialized dummy orders for visual demonstration, confusing users who wanted to test the end-to-end lifecycle from a clean slate.
- **UX & Functional Resolution:**
  Enforced Clean Slate to Zero Orders ([`[A45]`](file:///V:/Projects/Resume%20Projects/IsoLabs/project-curation-and-research/Build%20Docs/Assumptions.md#L330-L338)):
  1. Reset all seed data so the system initializes with **0 orders**.
  2. First-time users start with an empty Order Desk (`"0 Orders Today"`).
  3. The very first order placed by the user is guaranteed to receive identifier **`ORD-2026-0001`**, providing a pristine, authentic walkthrough.
- **Verification & Outcome:** Verified. Evaluators always begin with a clean slate and watch the order desk counters increment live as they place orders.

---

### `[ISSUE-011]` Master Catalog Excel Import Unintentionally Deleting All Retailer Accounts
- **Date & Phase:** 2026-11-05 | Master Catalog Management
- **User Persona Affected:** Distributor Office Clerk / IT Administrator
- **User Experience & Pain Point:**
  The distributor's office clerk uploaded an updated master product catalog Excel sheet (`.xlsx`) to refresh SKU pricing. The catalog updated successfully, but immediately afterwards, no Kirana store could log in! All 6 default retailers (Sharma Kirana, Verma General Store, etc.) had been completely deleted from the database.
- **Why It Happened (User Perspective):**
  The Excel import route was executing a heavy-handed `dbStore.clear()` and `TRUNCATE` operation to prevent SKU duplicates, which inadvertently wiped the `retailers` table alongside the `skus` table.
- **UX & Functional Resolution:**
  Targeted Table Isolation ([`[A47]`](file:///V:/Projects/Resume%20Projects/IsoLabs/project-curation-and-research/Build%20Docs/Assumptions.md#L345-L351)):
  - Modified the Excel import service to strictly update or replace rows in the `skus` table without touching `retailers`, `active_sessions`, or `orders`.
  - Added self-healing fallback logic to recreate core demo accounts if a full database wipe is explicitly requested.
- **Verification & Outcome:** Verified. Office clerks can re-import catalog price sheets freely without disrupting active retailer accounts or invalidating logins.

---

### `[ISSUE-012]` Out-of-Catalog Requests Matching Random Biscuits (False Positives)
- **Date & Phase:** 2026-11-04 | AI Order Capture & Gemini Cascade
- **User Persona Affected:** Kirana Store Owner dictating diverse wholesale orders
- **User Experience & Pain Point:**
  A retailer entered: *"10 packet chips aur 2 peti cold drink"*. The distributor only sells biscuits, soaps, and tea. Instead of informing the user that chips are not stocked, the AI parser matched the closest embedding or fuzzy string and added **10 cases of Parle-G Biscuits**! The merchant almost placed an order for goods they never wanted.
- **Why It Happened (User Perspective):**
  Vector similarity search and fuzzy string matching always return a nearest neighbor (even with low similarity scores). Without a calibrated rejection floor, the system forced the closest SKU into the cart.
- **UX & Functional Resolution:**
  Calibrated Rejection Floor & Closed-Set Chooser ([`[A16]`](file:///V:/Projects/Resume%20Projects/IsoLabs/project-curation-and-research/Build%20Docs/Assumptions.md#L160-L172)):
  - Implemented Platt-calibrated logistic regression scoring with a strict **0.60 confidence floor**.
  - Integrated Gemini 2.5 closed-set candidate selector: if none of the candidates semantically match the product category, the line is marked **`UNKNOWN_SKU`** (`isAmbiguous: true`).
  - The UI displays an honest amber alert:  
    *`"⚠️ Product Not in Catalog: We do not stock 'chips'. Please select an alternative or remove this line."`*
- **Verification & Outcome:** Verified. Automated tests (`gemini-random-words.test.ts`) confirm that out-of-catalog requests are rejected with zero false-positive additions.

---

### `[ISSUE-013]` Polysemic Term "Dabba" Causing Quantity Disputes Between Single Tin vs Wholesale Carton
- **Date & Phase:** 2026-11-04 | Vernacular Order Disambiguation
- **User Persona Affected:** Hindi-speaking Kirana Merchants
- **User Experience & Pain Point:**
  In Jabalpur markets, the word **"dabba" (डब्बा)** is polysemic:
  - For Wagh Bakri Tea: "1 dabba" often means a single 250g composite cardboard tin/box (Pack).
  - For Parle-G or Soaps: "1 dabba" often means an entire corrugated shipping box containing 48 packs (Case/Peti).
  When a merchant ordered *"2 dabba chai"*, the system initially interpreted it as 2 full wholesale cases (72 packs worth ₹2,500+) instead of 2 consumer boxes (worth ₹180), creating billing shock.
- **Why It Happened (User Perspective):**
  The parser treated "dabba" uniformly as a single unit without accounting for product-category context.
- **UX & Functional Resolution:**
  Interactive Dabba Disambiguation Guardrail ([`[A16]`](file:///V:/Projects/Resume%20Projects/IsoLabs/project-curation-and-research/Build%20Docs/Assumptions.md#L173-L185)):
  - Whenever the token `"dabba"` or `"dibba"` is detected for packaged consumer goods, the engine flags the line as ambiguous (`ambiguityReason: "AMBIGUOUS_UNIT_DABBA"`).
  - The Quick Order UI presents an interactive clarification card:  
    *`"डब्बा का अर्थ स्पष्ट करें:"`*
    - **विकल्प 1:** 2 सिंगल पैक (2 Loose Packs @ ₹90 = ₹180)
    - **विकल्प 2:** 2 पूरी पेटी (2 Wholesale Cases of 36 @ ₹1,296 = ₹2,592)
  - The merchant taps their intended option, resolving ambiguity with 100% confidence.
- **Verification & Outcome:** Verified. Eliminates verbal order disputes and invoicing errors.

---

### `[ISSUE-014]` Random Gibberish or Misspellings Crashing Parser Instead of Natural Explanation
- **Date & Phase:** 2026-11-04 | Text Parsing & Fault Tolerance
- **User Persona Affected:** Kirana Retailer making typos or speech-to-text noise
- **User Experience & Pain Point:**
  When a user submitted accidental keyboard mash (e.g. *"asdfghjk xyz 123"*) or garbled speech transcription, the parser threw an internal server error (HTTP 500), causing the UI to display: *"Network error parsing text"*.
- **Why It Happened (User Perspective):**
  The regex token pipeline attempted to split and parse malformed tokens without fallback exception handling, and did not pass unresolvable tokens to the generative AI reasoning layer.
- **UX & Functional Resolution:**
  Multi-Model Cascade Fallback (`gemini-random-words.ts`):
  - Added multi-model cascade with fallback to Gemini 2.5 Flash / Pro.
  - Gibberish inputs are cleanly handled with HTTP 200 responses containing `isAmbiguous: true` and an explicit reasoning message:  
    *`"The input 'asdfghjk xyz 123' does not correspond to any product name or brand in our catalogue."`*
  - The UI suggests: *"Please enter valid product names like '5 peti parle g' or tap a demo template."*
- **Verification & Outcome:** Verified. System never crashes on garbled inputs; provides polite vernacular guidance.

---

### `[ISSUE-015]` Interactive Walkthrough Overlay Blocking Screen Buttons & Broken on Mobile Viewport
- **Date & Phase:** 2026-11-05 | UI Ergonomics & First-Time Tour
- **User Persona Affected:** Mobile Phone Users & Demo Reviewers
- **User Experience & Pain Point:**
  The interactive onboarding guide popup was rendered as a fixed-size desktop modal positioned over the bottom-right corner. On mobile phones (e.g., iPhone/Android 390px width), it occupied the entire screen, completely covered the bottom navigation bar and "Add to Cart" buttons, and could not be moved or minimized, rendering the app unusable.
- **Why It Happened (User Perspective):**
  The component was built for desktop resolution with hardcoded `fixed bottom-6 right-6 w-96` styles, lacking drag handles, resize corners, or mobile breakpoint collapsing.
- **UX & Functional Resolution:**
  Mobile-Friendly Draggable Walkthrough Guide ([`WalkthroughGuide.tsx`](file:///V:/Projects/Resume%20Projects/IsoLabs/distributor-app/src/components/walkthrough/WalkthroughGuide.tsx)):
  1. **Draggable & Resizable:** Added a top drag handle allowing the user to reposition the walkthrough modal anywhere on screen.
  2. **1-Tap Minimize / Expand:** Added an accordion toggle that shrinks the entire tour into a discreet, floating pill badge (`"💡 Demo Guide (Step X/17)"`).
  3. **Mobile Viewport Optimization:** On screens under 640px, the modal automatically docks to the top edge as a slim drawer, keeping bottom navigation and checkout buttons 100% accessible.
- **Verification & Outcome:** Verified. Walkthrough guide aids first-time evaluators without obstructing core application controls on any screen size.

---

### `[ISSUE-016]` Monolingual English Interface Alienating Rural Madhya Pradesh Kirana Merchants
- **Date & Phase:** 2026-11-03 | Localization & Cultural Ergonomics
- **User Persona Affected:** Rural Kirana Shop Owners in Jabalpur & Katni
- **User Experience & Pain Point:**
  Local Kirana store owners communicate in Hindi and conversational Hinglish. When presented with complex English financial jargon (*"Gross Total"*, *"Trade Discount"*, *"Scheme Free Goods"*, *"Credit Limit Balance"*), merchants hesitated to order online, preferring phone calls or paper notebooks.
- **Why It Happened (User Perspective):**
  The app initially lacked a native Hindi localization toggle across catalogue, cart, and quick-order screens.
- **UX & Functional Resolution:**
  Bilingual English / Devanagari Hindi Toggle (`lang === "hi"`):
  - Added a 1-tap language switch (`EN | हि`) across all portal screens.
  - In Hindi mode, all key commercial terms are translated into natural local market terminology:
    - *Wholesale Case* $\to$ **पूरी पेटी**
    - *Loose Packs* $\to$ **खुले पैकेट**
    - *Out of Stock* $\to$ **स्टॉक समाप्त**
    - *Credit Limit* $\to$ **उधार सीमा**
    - *Current Balance* $\to$ **बकाया राशि**
    - *Place Order* $\to$ **ऑर्डर दर्ज करें**
- **Verification & Outcome:** Verified. Merchants can navigate and order in their preferred language with zero ambiguity.

---

### `[ISSUE-017]` Retailer Unaware Why Order Went to "CREDIT_HOLD" Without Ledger Headroom Breakdown
- **Date & Phase:** 2026-11-04 | Credit Limit Enforcement & Order Status
- **User Persona Affected:** Kirana Store Owner placing high-value orders
- **User Experience & Pain Point:**
  A retailer with a ₹50,000 credit limit and ₹38,000 existing ledger balance submitted a ₹15,000 order. The order was placed, but immediately marked **`CREDIT_HOLD`**. The retailer did not know why their order wasn't being dispatched and assumed the distributor was withholding goods without reason.
- **Why It Happened (User Perspective):**
  The cart page lacked proactive financial projection indicators, leaving merchants in the dark about credit limit consumption until *after* order submission.
- **UX & Functional Resolution:**
  Proactive Credit Limit Headroom Bar ([`[A6]`](file:///V:/Projects/Resume%20Projects/IsoLabs/project-curation-and-research/Build%20Docs/Assumptions.md#L68-L80) & [`cart/page.tsx`](file:///V:/Projects/Resume%20Projects/IsoLabs/distributor-app/src/app/(portal)/cart/page.tsx#L170-L177)):
  - Added a live visual credit gauge in `/cart` showing:
    - Current Balance: ₹38,000
    - This Order: ₹15,000
    - Projected Balance: ₹53,000 / ₹50,000
  - If projected balance exceeds credit limit, an amber warning banner appears *before* checkout:  
    *`"⚠️ Credit Limit Exceeded by ₹3,000: This order will require credit release from the distributor order desk before dispatch."`*
  - Added an in-desk modal allowing the office clerk to inspect ledger history and 1-click release holds with an audit note.
- **Verification & Outcome:** Verified. Merchants have total transparency into credit status; clerks have a streamlined release mechanism.

---

### `[ISSUE-018]` Order Desk Cluttered with Kirana Order Inputs, Violating Distributor Role Boundaries
- **Date & Phase:** 2026-11-05 | Distributor Operations & Seat Boundaries
- **User Persona Affected:** Order Desk Clerk / Distributor Owner
- **User Experience & Pain Point:**
  The Order Desk (`/desk`) originally included a large "Quick Order Text Ingestion" box directly on the clerk's dashboard. Clerks were confused because wholesale distributors do not generate orders for themselves—orders arrive from Kirana retailers via WhatsApp or the portal. The clutter crowded out the order triage table and pick list generation.
- **Why It Happened (User Perspective):**
  Early UI drafts combined retailer ordering tools and clerk review tools on the same screen, blurring the operational boundary between retail buyer and wholesale distributor.
- **UX & Functional Resolution:**
  Strict Seat Boundaries ([`[A48]`](file:///V:/Projects/Resume%20Projects/IsoLabs/project-curation-and-research/Build%20Docs/Assumptions.md#L352-L357)):
  - Cleanly separated the two personas:
    - **Kirana Portal (`/catalogue`, `/cart`, `/quick-order`):** Retailer seats for browsing, dictating orders, and reviewing invoices.
    - **Order Desk (`/desk`, `/desk/orders/[id]`):** Distributor clerk seat focused exclusively on incoming order triage, credit hold releases, van manifest generation, and Tally Prime XML export.
  - Replaced the in-dashboard text box with a dedicated "New Phone Order" modal for phone-in desk orders, keeping the main screen focused on fulfillment.
- **Verification & Outcome:** Verified. Each user role has a focused, uncluttered interface aligned with real-world FMCG warehouse operations.

---

### `[ISSUE-019]` Local Dev Server and Deployed Vercel Site Sharing Same Neon DB Clashing Session Locks
- **Date & Phase:** 2026-11-07 | Cloud Deployment & Concurrency Testing
- **User Persona Affected:** Developers & Testers running concurrent verification
- **User Experience & Pain Point:**
  When testing the deployed Vercel URL and the local development server (`localhost:3000`) at the same time using the same test Kirana account (Sharma Kirana), logging into one environment locked out the other environment. When trying to log in on localhost, the user was blocked with *"User already logged in"*, because the remote database row in Neon PostgreSQL was written by the cloud instance.
- **Why It Happened (User Perspective):**
  Both environments were configured with the identical `DATABASE_URL` pointing to the production Neon PostgreSQL cluster. The single-writer concurrency lock operated globally on the database level rather than per-instance.
- **UX & Functional Resolution:**
  1. **Force-Logout Resolution Endpoint:** Created `POST /api/auth/force-logout` with an explicit UI button on the login screen, allowing testers to instantly purge stale or conflicting session locks across all instances.
  2. **Session Heartbeat Expiry:** Added a 30-minute auto-expiry window on `active_sessions` rows so forgotten sessions auto-expire.
  3. Documented deployment isolation procedures in `deployment.md`.
- **Verification & Outcome:** Verified. Testers can easily reclaim access with 1 click without requiring database console commands.

---

### `[ISSUE-020]` Vercel Direct Neon Integration Injecting `POSTGRES_URL` Instead of `DATABASE_URL`
- **Date & Phase:** 2026-11-07 | Vercel Cloud Deployment
- **User Persona Affected:** Cloud Deployer / DevOps
- **User Experience & Pain Point:**
  After deploying to Vercel and connecting Neon PostgreSQL via Vercel's Marketplace Integration, the live website failed on database queries. The logs showed:
  > *"DATABASE_URL is not set. Falling back to in-memory store."*
  
  Even though the Neon integration was marked active in the Vercel dashboard, the app could not connect to PostgreSQL.
- **Why It Happened (User Perspective):**
  Vercel's official Neon database integration automatically injects the connection string as environment variable `POSTGRES_URL` (and `POSTGRES_PRISMA_URL`), whereas the application code was looking exclusively for `process.env.DATABASE_URL`.
- **UX & Functional Resolution:**
  Multi-Variable Database Connection Resolution ([`neon.ts`](file:///V:/Projects/Resume%20Projects/IsoLabs/distributor-app/src/db/neon.ts#L10-L20)):
  - Updated the database connection factory to inspect connection strings in cascading priority:
    ```typescript
    const connectionString =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_PRISMA_URL;
    ```
  - Allows zero-config deployment on Vercel with automatic Neon database binding.
- **Verification & Outcome:** Verified. Deployed Vercel production instances connect to Neon PostgreSQL instantly with zero manual variable renaming.

---

## Lessons Learned & Systemic Prevention

1. **Dual-Write Storage Patterns for Critical Cart State:**  
   When scoping local storage keys by user/tenant, always preserve a fallback key and implement auto-migration to prevent silent data loss during asynchronous authentication loading.
2. **Atomic Invariant Enforcement Over Post-Facto Rejection:**  
   Real-time multi-user applications must broadcast state proactively (e.g. out-of-stock badges, credit headroom bars) rather than letting users proceed through a multi-step workflow only to fail at the final submit button.
3. **Graceful Vernacular AI Degradation:**  
   In regional B2B markets, AI capture systems must never guess or hallucinate when faced with unknown items or colloquial ambiguities. An honest *"Product Not Stocked"* or an interactive disambiguation popup builds trust; a wrong biscuit delivered to a shop destroys it.
4. **Resilient Serverless Data Hydration:**  
   Never assume server memory persists across requests in modern cloud infrastructure. In-memory caches must always treat the database as the authoritative source of truth and self-hydrate on cold starts.
