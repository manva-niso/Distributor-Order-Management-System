# Distributor Order Management System (IsoLabs)

**Client:** Company A, Jabalpur (FMCG Distributor for 4 packaged food and home care brands, serving 1,800 kirana shops with 18 salesmen and ~600 orders/day).

---

## First-Time User Interactive Tour (The Golden Path)

If you are opening this project for the first time, follow this step-by-step walkthrough to experience the entire B2B wholesale workflow across **6 to 8 core screens**—from raw WhatsApp order capture to Tally ERP export.

> [!NOTE]
> The development server is running at **[http://localhost:3000](http://localhost:3000)**.
> All credentials and test accounts are pre-seeded with 1-click test buttons.

```
                     THE END-TO-END 6-STEP FIRST USER JOURNEY:
                     =========================================

  [1. Login / Persona] ──► [2. Catalogue & Schemes] ──► [3. AI Quick Order]
  1-Click Dev Logins        36 FMCG SKUs & GST rates     WhatsApp / Voice / Photo
           │                                                        │
           ▼                                                        ▼
  [6. Order Desk & Tally] ◄── [5. Order History] ◄── [4. Cart & Credit Headroom]
  Split-Screen & XML Export    Status Tracker & OCC       10+1 Schemes & Credit Limit
```

---

### Step 1: Open the App & Choose a Persona (`/login`)
1. Open your browser and navigate to **[http://localhost:3000](http://localhost:3000)** (redirects to `/login`).
2. The login screen features a bilingual toggle (**EN / HI**) and an **Active Accounts Directory** for instant 1-click role selection:
   - **Retailer Persona:** Click **"Sharma Kirana"** (`9826000001` — Napier Town Route #4, Ramesh Sharma, Credit Limit: ₹50,000, Outstanding: ₹12,000).
   - **Order Desk Operator Persona:** Click **"Order Desk"** (`9826000099` — Central Depot, Amit Jain).
   - **Field Salesman Persona:** Click **"Salesman Beat"** (`9826000018` — Beat #4, Rajesh Kumar).
3. Click **"Get OTP" / "ओटीपी प्राप्त करें"**.
4. The dev verification OTP code appears **directly above the input box** (and is printed to your terminal). Enter the 6 digits (or use dev code) to sign in.

---

### Step 2: Browse the Retailer Catalogue & Scheme Engine (`/catalogue`)
Once logged in as **Ramesh Sharma (Sharma Kirana)**:
1. Browse 36 authentic wholesale SKUs across 7 FMCG categories (Biscuits, Edible Oils, Tea, Detergents, Soaps, Packaged Foods, Home Care).
2. Notice the **Live Trade Schemes**:
   - **Parle-G 75g:** *"Buy 10 Get 1 Free"* (`FREE_GOODS`).
   - **Britannia Good Day:** *"Buy 4+ Cases $\to$ 5% Off"* (`SLAB_DISCOUNT`).
   - **Fortune Refined Oil 1L:** *"Flat ₹40 rebate per case on 5+ cases"* (`FLAT_REBATE`).
3. Toggle between **Ex-GST** and **Inc-GST** prices to inspect the 50/50 CGST + SGST tax calculation.

---

### Step 3: Experience AI Quick Order Capture (`/quick-order`)
Navigate to **"Quick Order"** (or `/quick-order`). Kirana merchants rarely navigate catalogs; they send messy WhatsApp messages, voice notes, or photos of paper slips.

Try copying and pasting any of these real-world test snippets into the **Text** tab:

#### 🧪 Test Snippet A: Standard Daily WhatsApp List (with conversational filler)
```text
namaste bhaiji
10 peti pila wala
4 peti good day butter
2 peti fortune refine 1L
kal subah bhej dena
```
*Click **"Parse Order Text"** $\to$ The engine automatically filters conversational greetings/footers, resolves *"pila wala"* to Parle-G 75g, extracts quantities in wholesale cases (*peti*), and scores line confidence at $\ge 0.95$.*

#### 🧪 Test Snippet B: The "Dabba" Polysemy Dilemma ("Ask, Never Guess")
```text
2 dabba parle g
1 dabba surf excel
```
*Click **"Parse Order Text"** $\to$ Notice how the engine **refuses to guess**! In Jabalpur trade slang, *"dabba"* can mean a single inner retail display box or a master corrugated case. The engine triggers an interactive **1-Tap Disambiguation Card**: select *"Box"* or *"Case"* with one click.*

#### 🧪 Test Snippet C: Broken-Case Cut Pack Alert
```text
15 out of 20 ghadi powder
3 packet maggi
```
*Click **"Parse Order Text"** $\to$ The engine detects that 15 bags is a broken master case (case size = 20). It displays a **Broken-Case Warning** with a 1-tap option to round up to 1 full case or bill loose pouches.*

#### 🧪 Test Snippet D: Devanagari Hindi Shorthand
```text
५ पेटी पार्ले जी
२ टीन मीठा तेल
३ पैकेट शक्ति चाय
```
*Click **"Parse Order Text"** $\to$ The engine converts Devanagari numerals (`५` $\to$ 5) and maps regional nicknames (*"मीठा तेल"* $\to$ edible oil).*

Click **"Confirm & Move to Cart"** to transfer the parsed items directly into the wholesale checkout.

---

### Step 4: Inspect Cart, Automatic Schemes & Credit Headroom (`/cart`)
Navigate to **Cart** (`/cart`):
1. **Automatic Trade Schemes:**
   - If you ordered 10 cases of Parle-G, notice an extra **+1 Free Case** automatically added at ₹0 billing rate.
   - If you ordered 4+ cases of Good Day, notice the **5% Slab Discount** applied directly before tax.
2. **Transparent GST Breakdown:**
   - Clear itemized split of Central GST (CGST) and State GST (SGST) matching Jabalpur intra-state tax laws.
3. **Dynamic Credit Limit Meter:**
   - Sharma Kirana has a ₹50,000 credit limit with ₹12,000 existing balance.
   - The interactive meter shows the new order against remaining credit headroom.
4. Click **"Place Order"** (ऑर्डर भेजें). The order is assigned an ID (e.g. `ORD-XXXXX`) and sent to the Order Desk.

---

### Step 5: View Order Tracking (`/orders`)
Navigate to **Orders** (`/orders`) to see the newly submitted order in **"Pending Review"** or **"Credit Hold"** status with full itemized breakdown.

---

### Step 6: Switch to Order Desk Operator (`/desk`)
Now step into the shoes of the distributor's desk clerk, **Amit Jain**:
1. Log out or open a new incognito window, navigate to `/login`, and click **"Order Desk"** (`9826000099`).
2. Enter the dev OTP and sign in. You will land on the **Central Operations Terminal** (`/desk`):
   - **Triage Queue:** Filter orders by Route (e.g., *Napier Town Route #4*) or Status (*Pending Review*, *Credit Hold*, *Approved*).
   - **Split-Screen Verification Workspace (`/desk/orders/[id]`):**
     * Click on any pending order.
     * Left pane displays the **original raw WhatsApp text / OCR photo / audio recording**.
     * Right pane displays the **structured SKU lines, scheme adjustments, and pricing**.
   - **Clerk Alias Learning Loop:**
     * Correcting or modifying an item stores the retailer's custom nickname `(retailer_id, raw_phrase, resolved_sku_id)` in the database so future orders match automatically with $P \ge 0.95$.
   - **Optimistic Concurrency Control (OCC):**
     * Open the same order in two browser tabs. Make and save an edit in Tab 1. Now try to save an edit in Tab 2.
     * The system rejects the stale edit with an OCC conflict modal, preventing silent data overwrites between multiple desk clerks.
   - **Approve Order:**
     * Approve the order to move it to the fulfillment pipeline.
3. **Tally ERP 9 / Prime XML Batch Export:**
   - On the Order Desk dashboard, click **"Export Tally XML"** (or visit `/api/tally/export`).
   - Generates production-ready Tally accounting voucher XML with exact HSN codes, ledger mappings, and 50/50 CGST/SGST splits ready for 1-click import into Tally.
4. **Van Loading Route Manifest:**
   - Click **"Van Manifest"** to generate the driver picking list grouped by delivery vehicle and route beat, highlighting loose broken cases vs sealed master shippers.
5. **14-Day Dormant Retailers Dashboard:**
   - Switch to the **"Dormant"** tab to review kiranas with no orders in $>14$ days, complete with a 1-tap Hindi WhatsApp retention nudge generator.

---

### Step 7: Master Data Hub & Reset (`/setup`)
Need to reset data or test from a clean slate?
- Visit **`/setup`** anytime.
- Choose **"Reset to Demo State"** (restores default 8 retailers, 36 SKUs, and seed orders) or **"Absolute Zero Reset"**.
- Upload custom Excel spreadsheets (`.xlsx`) to bulk-import catalogs or retailer customer lists.

---

## Technical Architecture & Core Modules

The solution is divided into modular, decoupled packages:

```
├── distributor-app/       # Full-Stack Next.js 15 App (PWA, Tailwind CSS, SQLite/Drizzle ORM)
│   ├── src/app/          # 34 production pages & API routes
│   └── src/__tests__/    # 14 Vitest suites (121 automated tests)
├── engine/                # Pure Vernacular Order Parsing Engine (@isolabs/order-engine)
│   ├── src/pipeline/     # 5-Tier Cascaded Adaptive Order Engine
│   └── src/__tests__/    # 6 Vitest suites (67 automated tests)
├── catalogue/             # Authentic 36-SKU FMCG Wholesale Catalog & Benchmarks
│   ├── catalog-data.ts   # Multi-tier packaging, HSN codes, GST rates, and schemes
│   ├── datasets/         # 9 real-world Jabalpur WhatsApp/Call test scenarios
│   └── __tests__/        # Scenario benchmark suite (9 automated tests)
├── research/              # Comprehensive research document & Hindi NLP benchmark papers
└── Build Docs/            # Living build documentation, runbooks, and incident logs
    ├── Laymans_Guide.md  # Plain-English non-technical guide to the Order Engine
    ├── Modules_And_Features.md # Complete feature registry across 9 modules
    ├── Assumptions.md    # Verified business & technical assumptions [A1]-[A44]
    ├── Errors.md         # Incident log with root causes and fixes [ERR-001]-[ERR-030]
    └── Test_And_Run_Guide.md # Comprehensive test runbook
```

---

## 5-Tier Cascaded Order Engine Architecture

The vernacular order parsing engine (`engine/`) handles high-velocity WhatsApp text and speech transcripts across 5 sequential tiers:

```
   Raw Order Line: "10 peti pila wala aur 2 dabba tel"
                      │
                      ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Tier 0: Regional Alias Lookup (Instant DB / Seed Cache)     │
 │ "pila wala" -> SKU-BS-PG075 (Parle-G 75g)                   │
 └────────────────────────────┬────────────────────────────────┘
                              ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Tier 1: Deterministic Structural Parser                     │
 │ Numerals, Hindi words (aadha/derh), cut-packs (15 out of 20)│
 └────────────────────────────┬────────────────────────────────┘
                              ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Tier 2: Reciprocal Rank Fusion (RRF, k=60)                  │
 │ Combines Trigram Jaccard + Keyword Synonyms + Indic Phonetic│
 └────────────────────────────┬────────────────────────────────┘
                              ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Tier 3: Calibrated Scorer (Platt Logistic Calibration)      │
 │ Honest probability P ∈ [0.05, 0.98]                         │
 │ P ≥ 0.85 -> AUTO_CONFIRM                                    │
 │ 0.45 ≤ P < 0.85 -> DISAMBIGUATION (1-tap card)              │
 │ P < 0.45 -> ESCALATE_CHOOSER                                │
 └────────────────────────────┬────────────────────────────────┘
                              ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Tier 4: Constrained Gemini Closed-Set Chooser (Optional)    │
 │ Strict JSON schema enum over top 3 candidate IDs only       │
 └────────────────────────────┬────────────────────────────────┘
                              ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Tier 5: Plain-Code Packaging Guardrails                     │
 │ "dabba" -> AMBIGUOUS_UNIT | Cut-pack -> BROKEN_CASE         │
 └─────────────────────────────────────────────────────────────┘
```

---

## Automated Testing Suite (197 / 197 Passing)

Run the full automated test suite across all packages from the root directory:

```bash
# Run all 197 tests across app, engine, and catalog benchmarks
npm test
```

Or run each subsystem individually:

```bash
# Run distributor app tests (121 tests across 14 suites)
npm run test:app

# Run standalone engine tests (67 tests across 6 suites)
npm run test:engine

# Run real-world WhatsApp/call catalog benchmark (9 scenario suites)
npm run test:catalogue
```

### Production Build Verification
Verify production compilation across all 34 routes:
```bash
npm run build
```

---

## Documentation Links

- [Plain-English Guide to the Order Engine](file:///V:/Projects/Resume%20Projects/IsoLabs/Build%20Docs/Laymans_Guide.md) — Simple, non-technical explanation of the engine for any audience.
- [Research & Architecture Benchmark](file:///V:/Projects/Resume%20Projects/IsoLabs/research/README.md) — Grounding economics, Hindi NLP papers, and retrieval architecture.
- [Authentic FMCG Wholesale Catalog](file:///V:/Projects/Resume%20Projects/IsoLabs/catalogue/README.md) — 36 SKUs, packaging tiers, and scheme configurations.
- [Feature & Module Registry](file:///V:/Projects/Resume%20Projects/IsoLabs/Build%20Docs/Modules_And_Features.md) — Comprehensive technical reference for all 9 modules.
- [Assumptions Registry](file:///V:/Projects/Resume%20Projects/IsoLabs/Build%20Docs/Assumptions.md) — Formal documentation of assumptions `[A1]` through `[A44]`.
- [Incident & Bug Log](file:///V:/Projects/Resume%20Projects/IsoLabs/Build%20Docs/Errors.md) — Root-cause analysis and resolutions for `[ERR-001]` through `[ERR-030]`.
- [Step-by-Step Test Runbook](file:///V:/Projects/Resume%20Projects/IsoLabs/Build%20Docs/Test_And_Run_Guide.md) — Comprehensive test guide for every subsystem.
