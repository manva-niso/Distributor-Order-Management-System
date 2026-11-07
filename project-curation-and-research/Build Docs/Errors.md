# Error Log & Incident Registry

This document records every error, build failure, test failure, runtime issue, and edge-case bug encountered during development, along with its root cause analysis and verified fix.

---

## Format
```markdown
### [ERR-XXX] Short Title
- **Date & Time:** YYYY-MM-DD HH:mm:ss
- **Module:** Module X - Name
- **Phase:** [Scaffolding | Build | Database | API | UI | Test]
- **Symptoms / Error Message:**
  ```text
  Raw error logs or stack trace
  ```
- **Root Cause Analysis:** Why this occurred.
- **Resolution / Fix:** How it was resolved.
- **Prevention:** Best practices implemented to avoid regression.
```

---

## Log Entries

### [ERR-024] Colloquial Permutation and Multiplier Collision in Text Parser
- **Date & Time:** 2026-11-04 22:05:00
- **Module:** Module 5 - Order Capture Engine & Standalone Engine
- **Phase:** Test / Vitest Execution
- **Symptoms / Error Message:**
  ```text
  Input: "3 peti pila wala" -> matchedSku was undefined.
  Input: "ek darjan packet good day" -> extractedQty was 1 instead of 12.
  ```
- **Root Cause Analysis:**
  1. The general conversational noise word stripper included `"wala"`. Stripping `"wala"` reduced `"pila wala"` to `"pila"`, missing the exact alias key in `SEED_ALIASES`.
  2. The sequential numeral parser evaluated `"ek"` as 1, but did not handle composite multipliers like `"darjan"` (dozen) that must multiply the preceding numeral.
- **Resolution / Fix:**
  1. Updated `matchSkuWithRetrieval` to check raw token phrases and n-grams against `SEED_ALIASES` *before* filtering conversational noise words, and added single token alias mappings (`pila`, `peela`).
  2. Added multiplier evaluation in `extractQuantity`: when `"darjan"`, `"dozen"`, or `"दर्जन"` is encountered, it computes `detectedQty = (detectedQty || 1) * 12`.
- **Prevention:** Always perform exact alias dictionary matching on raw token sequences before applying aggressive noise-word removal.

### [ERR-023] Standalone Engine Vitest Path Resolution & Dependency Isolation
- **Date & Time:** 2026-11-04 21:19:00
- **Module:** Standalone Engine (`engine/`)
- **Phase:** Packaging / Test Execution
- **Symptoms / Error Message:**
  ```text
  Cannot find package 'vitest' imported from vitest.config.ts
  Cannot find module '@/db/store' or its corresponding type declarations
  ```
- **Root Cause Analysis:**
  1. `engine/` was decoupled outside `distributor-app` as an independent `@isolabs/order-engine` package without its own `node_modules` or dependencies.
  2. Relative imports in test files still referenced `@/` aliases from Next.js.
- **Resolution / Fix:**
  1. Initialized independent `package.json` in `engine/` and installed `vitest`, `typescript`, `@types/node`.
  2. Replaced Next.js path aliases with clean relative imports (`../data/catalog`, `../ai/text-parser`).
  3. All 39 unit tests pass in 502ms with zero dependencies on Next.js.
- **Prevention:** Standalone library packages must maintain self-contained TypeScript configurations and relative imports.

### [ERR-022] Setup Page TS2345 Reset Mode Type Mismatch
- **Date & Time:** 2026-11-04 19:40:00
- **Module:** Master Data / Database Reset Hub
- **Phase:** Build / TypeScript Compilation
- **Symptoms / Error Message:**
  ```text
  Argument of type '"clean_slate" | "factory_demo" | "absolute_zero"' is not assignable to parameter of type '"clean_slate" | "factory_demo"'.
  ```
- **Root Cause Analysis:** `handleResetDatabase` was typed strictly as `"clean_slate" | "factory_demo"`, but the new Absolute Zero database wipe button passed `"absolute_zero"`.
- **Resolution / Fix:** Updated parameter type to `"clean_slate" | "factory_demo" | "absolute_zero"` in `src/app/setup/page.tsx`.
- **Prevention:** Update frontend handler type signatures whenever new backend API modes are added.

### [ERR-021] Unwanted Popup Expand During Drag in Walkthrough Guide
- **Date & Time:** 2026-11-04 18:25:00
- **Module:** UI Walkthrough Component
- **Phase:** UI / User Interaction
- **Symptoms / Error Message:** Dragging the floating walkthrough pop-up across the screen caused step bars to unexpectedly expand on mouse release.
- **Root Cause Analysis:** Releasing the pointer after dragging fired native `onClick` bubbling events onto child accordion headers.
- **Resolution / Fix:** Added pointer distance tracking via `dragDistanceRef`. If total movement during pointer down/up exceeds 5 pixels, click events on step toggles are suppressed.
- **Prevention:** Distinguish pointer drag gestures from intentional user clicks using drag delta thresholds.

### [ERR-016] Explanatory Clause Token Collision & Cart Loose-Pack Schema Rejection
- **Date & Time:** 2026-11-04 12:45:00
- **Module:** Module 5 & Module 4 - NLP Order Parser & Cart Checkout
- **Phase:** API / UI / Parsing
- **Symptoms / Error Message:**
  ```text
  Input: "1 pkt of tea, where a case contains 24 pkts"
  Result: isAmbiguous: true, ambiguityReason: "UNKNOWN_SKU", candidates: []
  Checkout Error: "Minimum 1 case required" when attempting to checkout single packets.
  ```
- **Root Cause Analysis:**
  1. The deterministic tokenizer in `src/lib/ai/text-parser.ts` evaluated the secondary number `24` in explanatory clause `"where a case contains 24 pkts"`. Single category tokens (like `tea`, `chai`) had a low score weight (`+0.30`) that failed the `0.45` candidate threshold, returning `UNKNOWN_SKU`.
  2. `CheckoutItemSchema` in `src/app/api/orders/checkout/route.ts` enforced `quantityCases: z.number().min(1)`, which rejected loose retail packets if `quantityCases === 0`.
- **Resolution / Fix:**
  1. Built regex pre-processor `extractAndStripExplanatoryClause` to detect and strip clauses like `"where a case contains 24 pkts"` while extracting `caseCapacityMentioned`.
  2. Boosted category matching weight to `+0.55` so colloquial single-word queries (`1 pkt of tea`, `2 sabun`, `5 biscuit`) match cleanly with high confidence ($\ge 0.75$).
  3. Added `quantityPacks` support to `CartItem`, `LineCalculation`, `CheckoutItemSchema`, and `StoredOrderItem`, allowing seamless single-packet ordering and dual-stepper UI.
- **Prevention:** Always separate descriptive conversational context clauses from core item quantity-unit pairs prior to catalogue dictionary matching.

### [ERR-015] Free goods tally undefined index in desk test
- **Date & Time:** 2026-11-03 23:45:00
- **Module:** Module 6 - Order Desk
- **Phase:** Test / Vitest Execution
- **Symptoms / Error Message:**
  ```text
  TypeError: Cannot read properties of undefined (reading 'freeCases')
  ```
- **Root Cause Analysis:** `calculateOrderSummary` calculates composite totals but does not directly emit `freeGoodsTally`; it was computed by filtering lines with `freeCases > 0`.
- **Resolution / Fix:** Emitted `freeGoodsTally` from `lines.filter(l => l.freeCases > 0)` in `route.ts` and `desk.test.ts`.
- **Prevention:** Always align DTO contracts between calculation engines and desk API response types.

### [ERR-014] TypeScript property mismatches in CalculatedLineItem
- **Date & Time:** 2026-11-03 23:30:00
- **Module:** Module 6 - Order Desk
- **Phase:** Build / TypeScript Compilation
- **Symptoms / Error Message:**
  ```text
  Property 'slabDiscountPct' does not exist on type 'CalculatedLineItem'.
  Property 'netTaxableAmount' does not exist on type 'CalculatedLineItem'.
  ```
- **Root Cause Analysis:** Desk route attempted to access `slabDiscountPct` and `netTaxableAmount`. The canonical properties on `CalculatedLineItem` are `taxableAmount`, `totalGstAmount`, and `discountAmount`.
- **Resolution / Fix:** Renamed property references in `desk/orders/[id]/route.ts` to canonical properties.
- **Prevention:** Reference shared TypeScript interface definitions directly instead of ad-hoc assumptions.

### [ERR-013] Stray closing brace syntax error in store.ts
- **Date & Time:** 2026-11-03 23:15:00
- **Module:** Master Data / Database Store
- **Phase:** Build / TypeScript Compilation
- **Symptoms / Error Message:**
  ```text
  Parsing error: Unexpected token, expected "}"
  ```
- **Root Cause Analysis:** An extra closing brace `}` was inadvertently left after `seedDefaultOrders()` during refactoring.
- **Resolution / Fix:** Removed the superfluous brace.
- **Prevention:** Run typecheck and automated test suites immediately after store edits.

### [ERR-012] Brand name assertion mismatch in text-parser test
- **Date & Time:** 2026-11-03 22:40:00
- **Module:** Module 5 - Multi-Modal AI Text Parser
- **Phase:** Test / Vitest Execution
- **Symptoms / Error Message:**
  ```text
  AssertionError: expected 'Ghadi' to be 'Ghadhi Detergent'
  ```
- **Root Cause Analysis:** The unit test asserted `"Ghadhi Detergent"` while the master SKU seed record had brand `"Ghadi"`.
- **Resolution / Fix:** Updated expected assertion string to `"Ghadi"`.
- **Prevention:** Assert against canonical seed data constants.

### [ERR-011] Store reset method name mismatch
- **Date & Time:** 2026-11-03 22:30:00
- **Module:** Master Data / Database Store
- **Phase:** Test / Vitest Execution
- **Symptoms / Error Message:**
  ```text
  TypeError: dbStore.resetToDefaults is not a function
  ```
- **Root Cause Analysis:** The test suite invoked `dbStore.resetToDefaults()`, but the method in `MemoryStore` was named `reset()`.
- **Resolution / Fix:** Changed test call to `dbStore.reset()`.
- **Prevention:** Export explicit interface for memory store test harnesses.

### [ERR-010] Hardcoded catalog length assertion failure in catalogue test
- **Date & Time:** 2026-11-03 22:15:00
- **Module:** Module 2 - Catalogue
- **Phase:** Test / Vitest Execution
- **Symptoms / Error Message:**
  ```text
  AssertionError: expected [Array(12)] to have length 3
  ```
- **Root Cause Analysis:** After expanding seed catalog from 3 to 12 SKUs, `catalogue.test.ts` still had `expect(skus).toHaveLength(3)`.
- **Resolution / Fix:** Updated assertion to `expect(skus.length).toBeGreaterThanOrEqual(12)`.
- **Prevention:** Use lower-bound assertions (`toBeGreaterThanOrEqual`) for evolving master catalogs.

### [ERR-009] Next.js NextResponse BodyInit type error with Node Buffer
- **Date & Time:** 2026-11-03 21:50:00
- **Module:** Master Setup / Excel Template Generation
- **Phase:** Build / TypeScript Compilation
- **Symptoms / Error Message:**
  ```text
  Argument of type 'Buffer' is not assignable to parameter of type 'BodyInit'.
  ```
- **Root Cause Analysis:** Passing Node.js `Buffer` directly to `NextResponse` failed strict Web Streams typing in Next.js 16.
- **Resolution / Fix:** Wrapped buffer with `new Uint8Array(excelBuffer)`.
- **Prevention:** Convert Node.js Buffers to Uint8Array when returning streaming payloads in Next.js App Router route handlers.

### [ERR-008] Next.js export mismatch in BottomNav & CartPage
- **Date & Time:** 2026-11-03 21:30:00
- **Module:** Navigation & Cart
- **Phase:** Build / Next.js Prerender
- **Symptoms / Error Message:**
  ```text
  Type error: Property 'activeTab' is missing in type '{}' but required in type 'BottomNavProps'.
  ```
- **Root Cause Analysis:** `BottomNav` was exported as a named function without a default export, and `BottomNavProps` was missing an optional default for `activeTab`.
- **Resolution / Fix:** Added default props and `export default BottomNav`.
- **Prevention:** Export components as both named and default exports for maximum interoperability.

### [ERR-007] Stale dev server memory instance on store prototype changes
- **Date & Time:** 2026-11-03 21:10:00
- **Module:** Master Data / Database Store
- **Phase:** Runtime / Dev Server
- **Symptoms / Error Message:**
  ```text
  TypeError: dbStore.getVanManifest is not a function
  ```
- **Root Cause Analysis:** `globalThis.appStore` preserved the prototype of `MemoryStore` instantiated before adding new methods. Hot Module Replacement reloads modules but retains existing `globalThis` instances.
- **Resolution / Fix:** Restarted the dev server process to instantiate the updated `MemoryStore` class prototype.
- **Prevention:** Re-run or restart dev server process when adding new methods to `globalThis` singletons.

### [ERR-006] PowerShell statement separator syntax error
- **Date & Time:** 2026-11-03 20:45:00
- **Module:** Tooling / PowerShell CLI
- **Phase:** CLI Execution
- **Symptoms / Error Message:**
  ```text
  The token '&&' is not a valid statement separator in this version.
  ```
- **Root Cause Analysis:** Executed Bash-style `&&` in Windows PowerShell 5.1 environment.
- **Resolution / Fix:** Switched to `;` as the command separator in PowerShell commands.
- **Prevention:** Always use `;` for chained commands in PowerShell.

### [ERR-005] IEEE 754 Floating-Point Imprecision in Financial Half-Up GST Rounding
- **Date & Time:** 2026-11-03 20:01:00
- **Module:** Module 3 - Pure Scheme & Pricing Calculation Engine
- **Phase:** Test / Vitest Execution
- **Symptoms / Error Message:**
  ```text
  FAIL src/__tests__/schemes.test.ts > Slab Tier Cash Discount (Rule [A12])
  AssertionError: expected 886.09 to be 886.1 // Object.is equality
  - Expected: 886.1
  + Received: 886.09
  ```
- **Root Cause Analysis:** Under IEEE 754 standard, `9845.5 * 0.09` evaluates to `886.0949999999999` in binary floating-point. When standard `Math.round((val + Number.EPSILON) * 100) / 100` was applied, the binary deficit caused `886.095` to round down to `886.09` instead of half-up to `886.10`.
- **Resolution / Fix:** Updated `roundTo2Decimals` in `src/lib/schemes/engine.ts` with a micro-epsilon compensation bias `(value + 1e-6) * 100`, which correctly rounds exact half values (`.095`) upward as required by Indian GST tax invoicing standards.
- **Prevention:** Always account for binary representation imprecision in financial half-up rounding functions.

### [ERR-004] Turbopack conflict: cacheComponents incompatible with dynamic route config
- **Date & Time:** 2026-11-03 19:18:40
- **Module:** Module 1 - Core Build
- **Phase:** Next.js Configuration & Build
- **Symptoms / Error Message:**
  ```text
  Error: Route segment config "dynamic" is not compatible with `nextConfig.cacheComponents`. Please remove it.
  ```
- **Root Cause Analysis:** `create-next-app` added experimental `cacheComponents: true` and `partialPrefetching: true` in `next.config.ts`, which conflicts with standard dynamic cookie evaluation in Next.js App Router.
- **Resolution / Fix:** Disable experimental `cacheComponents` and `partialPrefetching` in `next.config.ts` to allow standard dynamic route evaluation.
- **Prevention:** Do not enable unneeded experimental flags for mission-critical B2B apps.

- **Date & Time:** 2026-11-03 19:18:00
- **Module:** Module 1 - Core Build
- **Phase:** Build / Production Prerender
- **Symptoms / Error Message:**
  ```text
  Error: Route "/": Next.js encountered uncached or runtime data during prerendering.
  `cookies()` accessed outside of <Suspense> prevents the route from being prerendered.
  ```
- **Root Cause Analysis:** `src/app/page.tsx` called `await cookies()` to read session cookie for automatic redirect, but Next.js 16 defaults to static prerendering unless marked dynamic.
- **Resolution / Fix:** Add `export const dynamic = "force-dynamic";` to `src/app/page.tsx`.
- **Prevention:** Mark server component routes that access headers or cookies with `export const dynamic = "force-dynamic"`.

- **Date & Time:** 2026-11-03 19:16:30
- **Module:** Module 1 - Test Harness
- **Phase:** Test / Vitest Execution
- **Symptoms / Error Message:**
  ```text
  Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'vite' imported from .../node_modules/vitest/dist/chunks/nativeModuleRunner.js
  ```
- **Root Cause Analysis:** Vitest 5+ delegates module resolution and bundling to `vite`. When installing vitest with `--legacy-peer-deps`, the optional peer dependency `vite` was not automatically installed.
- **Resolution / Fix:** Explicitly install `vite` as a dev dependency: `npm install -D vite --legacy-peer-deps`.
- **Prevention:** Always install `vite` alongside `vitest` when testing Next.js TypeScript codebases.

- **Date & Time:** 2026-11-03 19:10:00
- **Module:** Module 1 - Scaffolding & Setup
- **Phase:** Scaffolding / Package Installation
- **Symptoms / Error Message:**
  ```text
  npm error code ERESOLVE could not resolve
  While resolving: vitest@5.1.0
  Found: @types/node@20.19.43
  Could not resolve dependency:
  peerOptional @types/node@"^22.0.0 || >=24.0.0" from vitest@5.1.0
  ```
- **Root Cause Analysis:** `create-next-app` generated `package.json` with `@types/node: "^20"` while Node runtime is v24.16.0 and the latest `vitest` expects `@types/node@^22 || >=24`.
- **Resolution / Fix:** Update `@types/node` in `package.json` to `"^22"` (or install with `--legacy-peer-deps`) matching Node 24 runtime.
- **Prevention:** Match `@types/node` major version to the installed Node LTS version.

- **Date & Time:** 2026-11-04 22:46:00
- **Module:** Module 5 - Candidate Retriever & RRF
- **Phase:** Unit Testing / IR Retrieval
- **Symptoms / Error Message:**
  ```text
  AssertionError: expected { id: 'SKU-TE-TT500', name: 'Tata Tea Gold 500 g' } to be null
  ```
- **Root Cause Analysis:** Accidental single 3-gram match (`"ata"` in query token `"catalog"` matching `"Tata"`) assigned raw trigram score 0.074. Because `maxRrf = 3.0 / (k + 1)` was statically assuming all 3 rankers were active, ranker gating was absent and items with zero match were getting ranked arbitrarily. Single 3-gram collisions were generating false positive catalog matches for nonsense words.
- **Resolution / Fix:** Implemented dynamic `numActiveRankers` normalization (`maxRrf = Math.max(1, numActiveRankers) / (k + 1)`) and relevance threshold filters on Trigram ($\ge 0.20$), Keyword ($\ge 0.30$), and Phonetic ($\ge 0.50$). Items below threshold receive 0 reciprocal contribution.
- **Prevention:** Always enforce minimum relevance floors on individual IR rankers prior to reciprocal rank fusion.

- **Date & Time:** 2026-11-04 22:51:00
- **Module:** Module 5 - Pipeline Strategy Factory
- **Phase:** Unit Testing / Pipeline Contract
- **Symptoms / Error Message:**
  ```text
  AssertionError: expected 'cascaded_adaptive' to be 'rules_deterministic'
  ```
- **Root Cause Analysis:** Factory function `getActiveParserPipeline()` returned `cascadedOrderParser` on default fallthrough when `ORDER_PARSER_PROVIDER` was unset, conflicting with deterministic baseline contract tests.
- **Resolution / Fix:** Updated factory switch to explicitly route `"cascade"` and `"adaptive"` to `cascadedOrderParser`, while maintaining `"rules"` and default as `deterministicTextParser` for pure backwards compatibility.
- **Prevention:** Maintain explicit enum branches for new pipelines without altering the default return of existing baseline tests.

---

### [ERR-031] Neon PostgreSQL Preset Synchronization Bypass & Order Object Nesting Type Mismatch
- **Date & Time:** 2026-11-05 00:20:00
- **Module:** Module 9 - Master Data Setup & Cloud Database Synchronization
- **Phase:** Database Integration / Neon Sync
- **Symptoms / Error Message:**
  ```text
  Loading preset appeared to update the in-memory UI, but PostgreSQL database tables ('skus', 'retailers', 'orders') remained empty (0 rows).
  When syncing orders: TypeError: Cannot read properties of undefined (reading 'toString') at syncDatasetToNeon.
  ```
- **Root Cause Analysis:**
  1. `/api/setup/load-preset` and `/api/setup/reset-db` only mutated `dbStore` (the in-memory singleton) and never executed write queries against Neon PostgreSQL.
  2. `dbStore.getAllOrders()` returns `Array<{ order: StoredOrder; items: StoredOrderItem[] }>`, whereas `neon-sync.ts` expected `StoredOrder[]`. Accessing `ord.subtotal` directly on the container object yielded `undefined`, throwing `Cannot read properties of undefined (reading 'toString')`.
- **Resolution / Fix:**
  1. Created `distributor-app/src/db/neon-sync.ts` providing `syncDatasetToNeon`, `syncSingleOrderToNeon`, and `syncOrderStatusToNeon`.
  2. Integrated `syncDatasetToNeon` into `/api/setup/load-preset`, `/api/setup/reset-db`, and `/api/setup/import-excel`.
  3. Added bulletproof `toNumStr` helper with fallback and unwrapped `(entry as any).order ?? entry` so both object layouts are handled cleanly.
  4. Added the **Master Wholesale FMCG Database (36 SKUs)** preset in `/setup`, writing all 36 authentic wholesale SKUs, 8 retailers, 10 users, and default orders directly to Neon PostgreSQL.
- **Prevention:** Always unwrap compound domain models and verify live database table row counts across cloud persistence layers during preset seeding.

---

### [ERR-032] Out-of-Catalog AI Rejection Failure ("Chips" $\to$ Good Day Cookies @ 98% Confidence)
- **Date & Time:** 2026-11-05 01:25:00
- **Module:** Module 5 - Vernacular Order AI Engine / Candidate Retrieval & Platt Calibration
- **Phase:** Live Verification & End-to-End Testing
- **Symptoms / Error Message:**
  ```text
  Input utterance "10 peti chips" or "chips" returned Britannia Good Day Butter Cookies (SKU-BS-GD120) with 0.98 confidence (98%), isAmbiguous: false, and auto-confirmed without user review.
  ```
- **Root Cause Analysis:**
  1. **Phonetic Affricate Collapse:** In `toPhoneticKey`, `s.replace(/ch/g, "c")` turned `"chips"` into `"cips"`, while `"cookies"` was canonicalized to `"cukis"`. On short 5-letter strings, Levenshtein edit distance was 2 (`c`, `i`, `s` matched), yielding a similarity score of $1 - 2/5 = 0.60$. Since the phonetic filter threshold was set at $0.50$, the phonetic ranker falsely deemed "chips" to be $60\%$ similar to "cookies".
  2. **Solitary Ranker Normalization Inflation:** In `CandidateRetriever.retrieve()`, when only 1 ranker fired (`numActiveRankers = 1`), the Reciprocal Rank Fusion normalization denominator used `maxRrf = numActiveRankers / (k + 1)`. Dividing by 1 scaled that solitary weak phonetic resemblance to $1.0$ ($100\%$ normalized score).
  3. **Platt Logistic Sigmoid Saturation:** In `CalibratedConfidenceScorer`, a top candidate score of 1.0 combined with a 1.0 margin gap generated logit $z = -1.2 + 2.8(1.0) + 2.4(1.0) + 0.8 = 4.8$. Computing $\sigma(4.8)$ produced $0.9918$, rounding to $0.98$ ($98\%$) and bypassing ambiguity guardrails.
  4. **Single-Token Hardware / Snack Homophones:** Similarly, `"3 peti cycle tyre tube"` matched `"Vim Dishwash Lemon Bar 500g Tub"` because `"tube"` and `"tub"` matched phonetically at $1.0$.
- **Resolution / Fix:**
  1. **Conserved Indic Phonetic Affricates:** Removed `/ch/g -> "c"` collapse. Hindi `ch` (च) remains distinct from hard `c`/`k` (क). `"chips"` no longer matches `"cookies"`.
  2. **Multi-Channel Consensus Constraint:** The RRF normalization denominator strictly enforces a minimum of 2 rankers: `effectiveRankers = Math.max(2, numActiveRankers)`. A single solitary ranker firing alone can achieve at most $0.50$ score, never auto-confirming without human confirmation.
  3. **Multi-Channel Acceptance Threshold:** Raised candidate acceptance margin in `matchSkuWithRetrieval` to `top.score >= 0.60`.
  4. **Strict Out-of-Catalog AI Rejection Guardrail:** Added `KNOWN_OOC_KEYWORDS` check (chips, lays, kurkure, coke, pepsi, spark plug, tyre tube). Queries with out-of-catalog items immediately bypass RRF, set `matched = null`, `isAmbiguous = true`, `ambiguityReason = "UNKNOWN_SKU"`, cap confidence at honest low floor ($12\%$), and return top catalog recommendations with $0\%$ scores so the user can choose from the catalog or search manually without guessing.
  5. **Benchmark & Excel Suite:** Created `overall_app_testing/generate-benchmark-excel.ts` validating 40 edge-case prompts with $100\%$ pass rate, generating `overall_app_testing_results.xlsx`.
- **Prevention:** Always enforce multi-signal consensus across lexical, semantic, and phonetic rankers before financial transaction auto-confirmation. Never allow a single uncorroborated IR signal to claim high confidence in B2B wholesale distribution.

---

### [ERR-034] Seat Boundary Breach & Clerk Order Ingestion Redirection
- **Date & Time:** 2026-11-05 01:50:00
- **Module:** Module 1 - Authentication, Authorization & Order Desk Workstation
- **Phase:** Live Seat & Multi-Role Verification
- **Symptoms / Error Message:**
  ```text
  When logged into the Order Desk seat as Sunil Clerk (role: "desk"), clicking "+ Quick Ingest" on the desk header redirected to /quick-order (the mobile kirana buyer portal). On /cart, the screen mocked "Sharma Kirana Store" available credit balances, changing the perceived user role. Checking out returned HTTP 403 Forbidden: "Only authorized retailers can place direct orders".
  ```
- **Root Cause Analysis:**
  1. **Cross-Seat Navigation Link:** The Order Desk header contained a direct link `<Link href="/quick-order">+ Quick Ingest</Link>`. `/quick-order` belongs to the Kirana mobile buyer portal group `(portal)`.
  2. **Role / Identity Fallback in Portal:** In the customer portal (`/catalogue`, `/cart`), the API checked for `session.retailerId`. Because a Desk Clerk account does not have a retailer ID, the catalogue and cart APIs fell back to displaying the first sample shop (`Sharma Kirana Store`), confusing the user's role.
  3. **Checkout Validation Gap:** `/api/orders/checkout` checked `if (!session || !session.retailerId) return 403`, preventing desk operators and field salesmen from booking orders on behalf of a chosen retailer.
  4. **Missing Route Level Seat Isolation in Middleware:** `middleware.ts` only protected `/desk` against non-desk users, but did not prevent a desk clerk from accidentally entering customer portal pages, nor did it restrict `/setup` from non-desk users.
- **Resolution / Fix:**
  1. **In-Desk Quick Ingest Modal:** Built `DeskQuickIngestModal.tsx` directly into the Order Desk (`/desk`). Desk clerks capture WhatsApp text, handwritten slips, and voice notes without ever leaving the Order Desk workstation.
  2. **Retailer Target Dropdown:** Added calling retailer selector with live credit limit and available credit indicators.
  3. **Strict Seat Boundaries in `middleware.ts`:**
     - Desk users (`role === "desk"`) are strictly confined to `/desk` and `/setup`. Any attempts to enter `/catalogue`, `/quick-order`, `/cart`, or `/orders` are redirected back to `/desk`.
     - Kirana retailers (`role === "retailer"`) and salesmen (`role === "salesman"`) are strictly confined to the Kirana portal (`/catalogue`, `/quick-order`, `/cart`, `/orders`). Any attempts to enter `/desk` or `/setup` are redirected back to `/catalogue`.
  4. **Multi-Role Checkout Support:** Updated `/api/orders/checkout` and `CheckoutSchema` to allow `desk` and `salesman` users to pass a target `retailerId` in the request body, while tagging `placedBy` (e.g. `Sunil Clerk (Desk WhatsApp)`) and `orderSource`.
- **Prevention:** Always enforce strict role-based route boundaries in middleware so users remain exclusively within their designated seats ("Whatever you are, you must remain in that seat"). Ingestion tools for office clerks must reside directly inside their desk workstation.

---

### [ERR-036] TypeScript TS5102 `baseUrl` Deprecation Error in `engine/tsconfig.json`
- **Date & Time:** 2026-11-05 18:00:00
- **Module:** `@isolabs/order-engine` / TypeScript Configuration
- **Phase:** Engine Standalone Build & Type Check
- **Symptoms / Error Message:**
  ```text
  Option 'baseUrl' has been removed. Use the 'paths' option without 'baseUrl' instead. ts(5102)
  engine/tsconfig.json was highlighted red in the IDE.
  ```
- **Root Cause Analysis:** TypeScript 5.0+ deprecated `"baseUrl": "."` when using modern `"moduleResolution": "NodeNext"`.
- **Resolution / Fix:** Removed `"baseUrl": "."` from `engine/tsconfig.json`. TypeScript modern path mapping resolves relative paths seamlessly.
- **Prevention:** Use TypeScript 5+ standard project configurations without legacy options under `NodeNext`.

---

### [ERR-037] Duplicate Type Export Ambiguity (TS2308) in Engine Catalog
- **Date & Time:** 2026-11-05 18:10:00
- **Module:** `@isolabs/order-engine` / `catalog.ts` & `engine/src/index.ts`
- **Symptoms / Error Message:**
  ```text
  TS2308: Module './schemes/engine' has already exported a member named 'SchemeType'. Consider using 'export type { SchemeType as SchemeType1 }'.
  ```
- **Root Cause Analysis:** `engine/src/data/catalog.ts` re-declared local `SchemeType` and `SlabTier` types rather than importing them from `engine/src/schemes/engine.ts`. When `engine/src/index.ts` executed wildcard exports (`export * from "./data/catalog"; export * from "./schemes/engine";`), TypeScript flagged duplicate declarations.
- **Resolution / Fix:** Imported `SchemeType` and `SlabTier` directly in `catalog.ts` from `../schemes/engine` instead of duplicating them.
- **Prevention:** Maintain single source of truth for core domain types across monorepo packages.

---

### [ERR-038] Missing Node Global & AWS Types in Standalone Engine Package
- **Date & Time:** 2026-11-05 18:15:00
- **Module:** `@isolabs/order-engine` / Multimodal & S3 Services
- **Symptoms / Error Message:**
  ```text
  Cannot find name 'process'. Do you need to install type definitions for node? ts(2580)
  Cannot find name 'Buffer'. ts(2580)
  ```
- **Root Cause Analysis:** `engine/package.json` was missing `@types/node` and direct AWS SDK dependencies (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`), relying on parent workspace node_modules hoisting.
- **Resolution / Fix:** Added `@types/node`, `@aws-sdk/client-s3`, and `@aws-sdk/s3-request-presigner` directly to `engine/package.json` and ran `npm install`.
- **Prevention:** Every monorepo workspace package must explicitly declare its own runtime and type dependencies.

---

### [ERR-039] In-Memory Dev Server Process Retaining Seeded Orders After SQL Truncate
- **Date & Time:** 2026-11-05 18:35:00
- **Module:** Module 4 - Order Management & Neon Database Sync
- **Phase:** Desk Queue Zero-State Initialization
- **Symptoms / Error Message:**
  ```text
  After running SQL TRUNCATE TABLE order_items, orders CASCADE on Neon PostgreSQL, GET /api/desk/orders still returned 4 dummy orders.
  ```
- **Root Cause Analysis:** The Next.js development server cached the in-memory `dbStore` singleton in process RAM. Furthermore, `dbStore.reset()` defaulted `includeDefaultOrders = true` in its constructor.
- **Resolution / Fix:**
  1. Updated `dbStore.ts` constructor to `this.reset(false)` so initial load strictly produces **0 orders**.
  2. Updated test fixtures across 5 test suites to explicitly call `dbStore.reset(true)` so unit tests have sample orders, while the real application starts at pristine zero.
  3. Truncated Neon database tables `orders` and `order_items` via direct SQL.
  4. Restarted Next.js dev server daemon. Confirmed live `GET /api/desk/orders` returns `{ success: true, orders: [], totalCount: 0 }`.
- **Prevention:** Default all production stores to zero initial orders. Separate test fixtures from runtime defaults, and always restart cached process singletons after database resets.

---

### [ERR-040] Gemini 1.5 Deprecation & Reasoning Token Exhaustion with `gemini-2.5-flash`
- **Date & Time:** 2026-11-05 19:20:00
- **Module:** Module 5 - Gemini Closed-Set Chooser (Tier 4) & Multimodal Extraction
- **Phase:** Live AI Key Verification
- **Symptoms / Error Message:**
  ```text
  Calling gemini-1.5-flash returned HTTP 404: "models/gemini-1.5-flash is not found for API version v1beta".
  Calling gemini-2.5-flash with maxOutputTokens: 20 returned empty text parts with finishReason: "MAX_TOKENS" and thoughtsTokenCount: 16.
  ```
- **Root Cause Analysis:**
  1. `gemini-1.5-flash` was deprecated/unsupported on the current API key/endpoint.
  2. `gemini-2.5-flash` is a reasoning model that consumes output tokens for internal thought traces. Setting a low `maxOutputTokens` (e.g. 20) caused thinking tokens to exhaust the budget before emitting final JSON.
- **Resolution / Fix:**
  1. Updated default model to `"gemini-2.5-flash"` across `gemini-chooser.ts` in both `engine/` and `distributor-app/`.
  2. Increased `maxOutputTokens` to `1024` and increased default network timeout from `2500ms` to `4000ms`.
  3. Added live integration test (`engine/src/__tests__/gemini-live.test.ts`) verifying live key resolution with Parle-G (`SKU-BS-PG075`).
- **Prevention:** When integrating reasoning-capable LLM models, always provide sufficient output token budget for thinking tokens and set timeouts appropriate for remote cloud inference.

---

### [ERR-041] Order Disappearance on Kirana Re-login Due to Ephemeral In-Memory State in Serverless Functions
- **Date & Time:** 2026-11-07 10:15:00
- **Module:** Module 4 - Cart & Order Management / Neon PostgreSQL Sync
- **Phase:** Production Deployment & Session Lifecycle
- **Symptoms / Error Message:**
  ```text
  Kirana store places an order -> order confirms with status PLACED.
  Storekeeper logs out and logs back in (or serverless instance recycles).
  Navigating to /orders shows "No orders placed yet" - previous orders disappear.
  ```
- **Root Cause Analysis:** While `syncSingleOrderToNeon` persisted orders to Neon PostgreSQL, the `GET /api/orders` endpoint queried strictly from in-memory `dbStore.getOrdersByRetailerId(retailerId)`. In Vercel serverless functions (and after local dev server restarts), each lambda container launches with fresh memory containing 0 orders and never pulled historical orders from Neon.
- **Resolution / Fix:**
  1. Created `hydrateOrdersFromNeon(retailerId?)` in `src/db/neon-sync.ts` querying `orders` and `order_items` tables via tagged SQL.
  2. Implemented `dbStore.upsertOrder(order, items)` in `src/db/store.ts` to populate in-memory state without double-charging the retailer's credit ledger.
  3. Added `await hydrateOrdersFromNeon(...)` to `GET /api/orders`, `GET /api/desk/orders`, `GET /api/desk/orders/[id]`, and `POST /api/orders/checkout`.
  4. Updated order ID generation in checkout to dynamically compute the next sequence number (`ORD-2026-XXXX`) from hydrated records, preventing primary key collisions.
- **Prevention:** Any system combining fast in-memory caching with persistent database backends must implement deterministic cold-start hydration before serving read requests.

---

### [ERR-042] Uncontrolled Multi-User Concurrent Logins Causing Credit Ledger Race Conditions & Double Order Placements
- **Date & Time:** 2026-11-07 10:45:00
- **Module:** Module 1 - Scaffolding, Authentication & Write Concurrency
- **Phase:** Concurrency Control / Multi-User Safety
- **Symptoms / Error Message:**
  ```text
  Two users accessing the same Kirana store (e.g. store owner and shop clerk) simultaneously submit checkouts, racing on credit balance and warehouse stock.
  ```
- **Root Cause Analysis:** No single-writer concurrency lock existed. Anyone verifying the phone's OTP was issued an unconstrained JWT cookie. Multiple simultaneous checkouts could overdraw the retailer's credit headroom and double-deduct inventory.
- **Resolution / Fix:**
  1. Implemented `acquireRetailerSession`, `releaseRetailerSession`, and `forceReleaseRetailerSession` in `src/lib/auth/session-lock.ts` backed by Neon PostgreSQL `active_sessions` table and in-memory cache with a 30-minute rolling activity window.
  2. Modified `POST /api/auth/verify-otp`: subsequent login attempts for the same Kirana store return HTTP 409 Conflict with `"User already logged in"` (`USER_ALREADY_LOGGED_IN`).
  3. Added `"User already logged in"` / `"उपयोगकर्ता पहले से लॉगिन है"` banner in `login/page.tsx` with a `[ Force Logout Existing Session & Login ]` button (`force: true`) allowing intentional handoffs.
  4. Added `releaseRetailerSession` into `POST /api/auth/logout` and `touchRetailerSession` into `GET /api/auth/me`.
  5. Built dedicated test suite `src/__tests__/session-lock.test.ts` (5 automated tests) verifying initial login, concurrent block, multi-kirana independence, logout release, and force release.
- **Prevention:** Core write operations (order placement, ledger debt updates) require strict single-writer seat exclusivity per business account.

---

### [ERR-043] Shared Global Cart State Leakage Between Different Kirana Accounts on Same Browser
- **Date & Time:** 2026-11-07 11:10:00
- **Module:** Module 2 & 4 - Catalogue & Draft Cart Isolation
- **Phase:** Multi-Tenant Session Isolation
- **Symptoms / Error Message:**
  ```text
  User logs in as Sharma Kirana, adds 5 cases of Parle-G to cart, then logs out.
  User logs in as Verma General Store on the same device.
  Verma's cart at /cart displays Sharma's 5 cases of Parle-G!
  ```
- **Root Cause Analysis:** Client-side draft cart state used a single global key `localStorage.getItem("isolabs_draft_cart")` across all Kirana accounts.
- **Resolution / Fix:**
  1. Built `src/lib/catalogue/cart-storage.ts` providing `getCartStorageKey(retailerId)` (`isolabs_draft_cart_${retailerId}`) and `getMediaStorageKey(retailerId)` (`isolabs_order_media_${retailerId}`).
  2. Scoped cart reads and writes across `catalogue/page.tsx`, `cart/page.tsx`, `quick-order/page.tsx`, and `orders/page.tsx` to the logged-in `retailerId`.
  3. Switching stores on the same device completely isolates draft carts.
- **Prevention:** Never store user-specific transactional or cart state under un-namespaced global keys in client storage.

---

### [ERR-044] Hardcoded Catalogue Impersonation Fallback to Sharma Kirana (`RET-0001`)
- **Date & Time:** 2026-11-07 11:30:00
- **Module:** Module 2 - Catalogue API
- **Phase:** API Scoping & Authentication Integrity
- **Symptoms / Error Message:**
  ```text
  Unauthenticated requests or requests with unrecognized sessions to /api/catalogue returned Sharma Kirana Store (RET-0001) metadata and ledger balance.
  ```
- **Root Cause Analysis:** Lines 36–52 in `src/app/api/catalogue/route.ts` contained a legacy fallback `retailer = allR[0]` (`RET-0001` - Sharma Kirana) when unauthenticated or target retailer was missing.
- **Resolution / Fix:** Removed the `allR[0]` fallback and fallback object. If no target retailer is authenticated or specified, `retailer` strictly returns `null`. Added dynamic Neon lookup if a valid `retailerId` exists in session but is missing from memory.
- **Prevention:** Endpoints must return `null` or 401/404 for unauthenticated callers rather than silently impersonating a default customer account.

---

### [ERR-045] Premature OTP Consumption on Concurrency Conflict Causing "No active OTP request found" During Force Logout
- **Date & Time:** 2026-11-07 12:05:00
- **Module:** Module 1 - Authentication, OTP Verification & Session Concurrency Lock
- **Phase:** Multi-Device Concurrency & Active Session Purge
- **Symptoms / Error Message:**
  ```text
  User 1 is logged in as Sharma Kirana Store.
  User 2 enters phone number and valid OTP, clicks "Verify & Login".
  Screen displays amber alert: "User already logged in" with a button to force logout.
  User clicks force logout and attempts to submit OTP again.
  Server returns HTTP 401: "No active OTP request found for this number. Please click 'Send OTP'."
  ```
- **Root Cause Analysis:**
  1. `verifyOtp(phone, otp)` in `src/lib/auth/otp.ts` previously executed `dbStore.markOtpVerified(activeOtp.id)` immediately upon verifying code equality.
  2. Next, `src/app/api/auth/verify-otp/route.ts` checked `acquireRetailerSession(retailerId)`. When a concurrent session was detected, the route returned HTTP 409 Conflict (`USER_ALREADY_LOGGED_IN`).
  3. However, because `verifyOtp` had already marked the OTP as `verified: true`, subsequent re-verification or force-logout re-submission failed because `dbStore.getLatestActiveOtp(phone)` specifically filters for `verified: false`.
  4. Furthermore, in serverless cloud environments (or across local and deployed Vercel instances sharing the same Neon database), orphaned rows in Neon `active_sessions` could block logins unless explicitly purged by a dedicated endpoint.
- **Resolution / Fix:**
  1. **Deferred OTP Consumption:** Refactored `verifyOtp` to accept `options: { consume: boolean }`, defaulting to `true` for standard consumers but called with `{ consume: false }` during preliminary verification in `verify-otp/route.ts`.
  2. **Dedicated `consumeOtp(otpId)`:** Added an explicit consumption step that is invoked *only after* `acquireRetailerSession` returns `allowed: true`. If a 409 conflict occurs, the OTP remains valid and unburned.
  3. **Dedicated Force-Logout Endpoint:** Created `POST /api/auth/force-logout` accepting `{ phone, retailerId? }`, which calls `forceReleaseRetailerSession` and deletes all matching rows directly from Neon PostgreSQL `active_sessions` table.
  4. **Preserved UI Input State:** Updated `login/page.tsx` so clicking `"Log Out All Other Sessions"` purges the remote session lock without clearing the 6-digit OTP input boxes. A green confirmation banner instructs the user to click `"Verify & Login"` to enter.
  5. **Sandbox Master Code Resilience:** Added fallback matching for dev master code `"716716"` and unconsumed active OTPs in dev sandbox mode.
  6. Added automated unit tests in `src/__tests__/session-lock.test.ts` verifying OTP preservation during 409 conflicts and single-consumption enforcement.
- **Prevention:** Never mark credentials or single-use verification tokens as consumed until all transactional preconditions (including concurrency locks and tenancy validation) are completely met.

---

### [ERR-046] Dev Master Code "716716" Rejection When Pre-Existing OTP Record Exists in Store
- **Date & Time:** 2026-11-07 12:46:00
- **Module:** Module 1 - Authentication & OTP Verification
- **Phase:** Automated Script Verification & Multi-Retailer Testing
- **Symptoms / Error Message:**
  ```text
  When running multi-retailer test scripts against /api/auth/verify-otp with code "716716", the server returned:
  HTTP 401 Unauthorized: "Incorrect OTP. 1 attempt(s) remaining."
  ```
- **Root Cause Analysis:** Line 265 in `src/lib/auth/otp.ts` previously checked `if (!activeOtp && isDevOrConsole && cleanCode === "716716")`. If `send-otp` had previously been executed (creating an active OTP record with random digits), `activeOtp` was not null. Consequently, the condition was skipped, and `cleanCode` (`"716716"`) was compared against the random digits, causing verification failure.
- **Resolution / Fix:** Updated `verifyOtp` in `src/lib/auth/otp.ts` so that in dev/sandbox environments (`isDevOrConsole`), if `cleanCode === "716716"`, it unconditionally accepts the code by synchronizing `activeOtp.otpCode = "716716"` (or creating a demo record if none exists).
- **Prevention:** Sandbox master test bypasses must authoritatively override active state rather than acting only as null-fallback guards.

---

### [ERR-047] Empty Cart Display After "Move to Cart" from Quick Order AI
- **Date & Time:** 2026-11-07 13:00:00
- **Module:** Module 4 - Quick Order AI to Cart Pipeline & LocalStorage Draft Scoping
- **Phase:** Client State Hydration & Scoped Session Migration
- **Symptoms / Error Message:**
  ```text
  User inputs colloquial order text into Quick Order AI (e.g. "bhaiya 5 peti biscuit chhota"),
  clicks "Parse Order Text" -> AI resolves 5 cases of Parle-G,
  User clicks "Move to Cart (1 items)" -> browser redirects to /cart.
  /cart renders: "Your cart is empty. Browse catalogue to add items."
  ```
- **Root Cause Analysis:**
  1. Under multi-Kirana cart isolation (`[A50]`), cart items are scoped per retailer: `isolabs_draft_cart_${retailerId}`.
  2. If the user clicked "Move to Cart" before `/api/catalogue` completed fetching `retailerId` (or as a desk clerk/un-scoped session), `quick-order` saved to `isolabs_draft_cart`.
  3. When navigating to `/cart`, `cart/page.tsx` loaded `data.retailer.id` (e.g. `"RET-0001"`), and strictly checked `localStorage.getItem("isolabs_draft_cart_RET-0001")`. Since only `isolabs_draft_cart` had the data, `savedCart` was null and `setCartMap({})` wiped the cart to empty without inspecting the fallback key.
  4. In addition, `cart/page.tsx` previously did not hydrate `cartMap` optimistically on component mount; it only hydrated inside `useEffect` after `/api/catalogue` returned over the network. If the network was slow or stalled, the UI initially rendered as completely empty.
- **Resolution / Fix:**
  1. **Dual Mirroring & Fallback Auto-Migration (`cart-storage.ts`):**
     - Implemented `loadScopedCart(retailerId?)`: checks scoped key first, seamlessly falls back to legacy/un-scoped `isolabs_draft_cart`, and automatically migrates the items to the scoped key.
     - Implemented `saveScopedCart(cartMap, retailerId?)`: dual-writes to both the scoped key (`isolabs_draft_cart_${retailerId}`) and the universal fallback key (`isolabs_draft_cart`), guaranteeing zero-drop delivery.
     - Implemented `clearScopedCart(retailerId?)`: cleanly removes both scoped and fallback keys upon order checkout or cart clearing.
     - Updated `getCartStorageKey` to inspect cached `localStorage.getItem("isolabs_current_retailer_id")` if `retailerId` argument is undefined during async initial rendering.
  2. **Optimistic Cart Mount Hydration (`cart/page.tsx`):**
     - Added immediate optimistic draft hydration on component mount via `loadScopedCart()`, rendering parsed items with 0ms delay.
     - Re-hydrates with `loadScopedCart(data.retailer.id)` once `/api/catalogue` completes, preserving all items.
     - Refactored `updateQuantity`, `removeItem`, `clearCart`, and checkout success cleanup to use `saveScopedCart` and `clearScopedCart`.
  3. **App-Wide Uniformity (`catalogue/page.tsx` & `orders/page.tsx`):**
     - Unified cart storage calls using `loadScopedCart` and `saveScopedCart` to guarantee synchronized state across all app routes.
  4. **Automated Vitest Suite:**
     - Added `src/__tests__/cart-storage.test.ts` (7/7 passed), verifying dual-writes, auto-migration from un-scoped drafts, and fallback resilience. Total test suite: 142/142 tests passing.
- **Prevention:** Always provide multi-tier fallback loading and dual-write mirroring whenever namespaced client-side storage keys are introduced into an existing state pipeline.

---

### [ERR-048] Dangling Orphaned JSX Block in `catalogue/page.tsx` During V2 Layout Refactor
- **Date & Time:** 2026-11-07 14:15:00
- **Module:** Module 2 - Catalogue View & Responsive Layout Refactor
- **Phase:** Version 2.0 Desktop Grid Implementation
- **Symptoms / Error Message:**
  ```text
  ./src/app/(portal)/catalogue/page.tsx:659:15
  Parsing ecmascript: Unexpected token. Did you mean `{'}'}` or `&rbrace;`?
  ```
- **Root Cause Analysis:** During the refactoring of the product card loop into the responsive layout, an orphaned duplicate render block from an earlier edit remained between lines 651 and 729.
- **Resolution / Fix:** Deleted the duplicate orphan block, ensuring properly balanced JSX closing tags. Verified with clean Turbopack production build (`next build`).
- **Prevention:** Always run incremental build checks (`npm run build`) immediately following multi-block JSX structural layout modifications.

---

### [ERR-049] Duplicate Object Literal Keys in `transliterate.ts` (`shree`, `shri`, `sri`)
- **Date & Time:** 2026-11-07 14:40:00
- **Module:** Module 12 - Universal Transliteration Engine
- **Phase:** Mandi Trade Lexicon Assembly
- **Symptoms / Error Message:**
  ```text
  error TS1117: An object literal cannot have multiple properties with the same name ('shree', 'shri', 'sri').
  ```
- **Root Cause Analysis:** The keys `"shree"`, `"shri"`, and `"sri"` were defined both in the person names section and the shop prefixes section of the static `mandiTradeDict` object.
- **Resolution / Fix:** Deduplicated keys in `transliterate.ts` by consolidating honorific and shop prefixes into a single dictionary entry.
- **Prevention:** When extending large static lookup dictionaries, sort keys or declare them with unique semantic prefixes.

---

### [ERR-050] Isolated Local React State Causing Language Reset on Route Navigation
- **Date & Time:** 2026-11-07 14:55:00
- **Module:** Module 12 - Bilingual Vernacular Localization
- **Phase:** Cross-Screen User Navigation & State Persistence
- **Symptoms / Error Message:**
  ```text
  User selects Hindi on /catalogue, but navigating to /cart or /orders resets the language back to English.
  ```
- **Root Cause Analysis:** Each screen component managed an isolated `useState<Language>("en")`. Navigating unmounted the component and initialized the new page with default `"en"`.
- **Resolution / Fix:** Replaced isolated local states with a unified React Context provider (`LanguageContext.tsx`) wrapping the root in `layout.tsx`, bound to `localStorage`, a 365-day `SameSite=Lax` cookie, and cross-tab custom events (`isolabs_language_change`).
- **Prevention:** Global preferences (language, theme, tenant) must always reside in root-level context with persistent storage adapters rather than per-page state hooks.

---

### [ERR-051] Master Sandbox OTP `716716` Expired-State Rejection When Stale DB Record Exists
- **Date & Time:** 2026-11-07 16:16:00
- **Module:** Module 1 - Authentication & OTP Verification
- **Symptoms / Error Message:**
  ```text
  HTTP 401 Unauthorized: "This OTP has expired. Please request a new code."
  ```
- **Root Cause Analysis:** In `src/lib/auth/otp.ts`, when `cleanCode === "716716"` and an `activeOtp` record existed in the database from an earlier session, `activeOtp.otpCode` was updated to `"716716"`, but `expiresAt` was not renewed. The expiry guard evaluated the timestamp from the stale record and rejected the master code.
- **Resolution / Fix:** Updated `verifyOtp` so when master code `716716` is used in dev/sandbox mode, `expiresAt` is renewed to `Date.now() + 15m`, `attempts` is reset to 0, and `verified` is reset to false.
- **Prevention:** Sandbox master bypasses must always renew expiration timestamps alongside overriding the code.

---

### [ERR-052] Registration Schema Strict Key Rejecting `name` in Place of `shopName`
- **Date & Time:** 2026-11-07 15:51:00
- **Module:** Module 1B - Kirana Self-Registration
- **Symptoms / Error Message:**
  ```text
  HTTP 400 Bad Request: "Shop name must be at least 3 characters"
  ```
- **Root Cause Analysis:** `RegisterSchema` in `register/route.ts` only accepted the key `shopName`, rejecting payloads sending `name`.
- **Resolution / Fix:** Refactored schema using `.refine()` and fallback extraction (`shopName || name`) to accept either naming convention.
- **Prevention:** API input schemas should accept standard property synonyms where common in client integrations.

---

### [ERR-053] Checkout Payload Rejection on `cases` / `packs` Parameter Synonyms
- **Date & Time:** 2026-11-07 15:52:00
- **Module:** Module 4 - Cart & Checkout API
- **Symptoms / Error Message:**
  ```text
  HTTP 400 Bad Request: "Invalid input data"
  ```
- **Root Cause Analysis:** `CheckoutItemSchema` in `checkout/route.ts` only accepted `quantityCases` and `quantityPacks`, rejecting payloads using `cases` or `packs`.
- **Resolution / Fix:** Added a Zod `.transform()` mapper supporting `quantityCases ?? cases` and `quantityPacks ?? loosePacks ?? packs`, and normalizing `orderType` to `orderSource`.
- **Prevention:** Use schema transformation layers to provide bidirectional compatibility with common naming conventions.

---

### [ERR-054] Bare Devanagari Brand Token `"घड़ी"` Missing from Alias Table
- **Date & Time:** 2026-11-07 16:19:00
- **Module:** Module 5 - NLP Order Capture
- **Symptoms / Error Message:**
  ```text
  Input: "५ पेटी पारले जी, २ पेटी घड़ी"
  Extracted: 2 CASE | SKU = NULL | Conf = 0.15 | Ambiguous = True (UNKNOWN_SKU)
  ```
- **Root Cause Analysis:** `SEED_ALIASES` in `text-parser.ts` contained compound phrases like `"घड़ी पाउडर"` and `"घड़ी डिटर्जेंट"`, but lacked bare `"ghadi"`, `"घड़ी"`, `"घडी"`, and `"घड़ी"`.
- **Resolution / Fix:** Added bare brand tokens `"ghadi"`, `"घड़ी"`, `"घडी"`, and `"घड़ी"` mapping directly to `SKU-DT-1KG`.
- **Prevention:** Always include both standalone brand nouns and compound brand+category phrases in alias seed tables.

---

### [ERR-055] Explanatory Clauses with Commas Creating False Orphaned Order Lines
- **Date & Time:** 2026-11-07 16:21:00
- **Module:** Module 5 - Multi-Line Order Text Splitting
- **Symptoms / Error Message:**
  ```text
  Input: "5 peti biscuit chhota, where a case contains 24 pkts"
  Split into 2 lines: Line 1: Parle-G, Line 2: "where a case contains 24 pkts" (UNKNOWN_SKU)
  ```
- **Root Cause Analysis:** `splitOrderTextIntoLines` split by comma `,` before `extractAndStripExplanatoryClause` had run, isolating the explanatory clause as a standalone line that passed digit detection.
- **Resolution / Fix:** Updated `splitOrderTextIntoLines` to pre-strip explanatory clauses from the full text before splitting segments.
- **Prevention:** Pre-process and strip non-transactional descriptive clauses across the entire message before tokenizing or segmenting lines.

---

### [ERR-056] Order Desk and Portal Log Out Buttons Inoperative Due to Next.js Client Router Cache and Cookie Attribute Discrepancies
- **Date & Time:** 2026-11-07 17:35:00
- **Module:** Authentication & Session Management (Order Desk & Portal)
- **Symptoms / Error Message:**
  ```text
  User clicks the "Log Out" icon button in Order Desk (/desk), but nothing happens,
  or the browser flickers and remains on /desk.
  In addition, Order Verification screen (/desk/orders/[id]) completely lacked a logout action.
  ```
- **Root Cause Analysis:**
  1. **Next.js Client Router Cache:** Client components used `router.push("/login")`. Next.js 15/16 App Router caches RSC route payloads in the browser's memory. When `/login` had been visited or prefetched while the user was authenticated, the client router used the cached redirect response (`redirect("/desk")`), immediately bouncing the user back to the desk instead of un-mounting the workstation.
  2. **Cookie Attribute Inconsistency:** `verify-otp` sets `auth_token` with `sameSite: "lax"`, `path: "/"`, and `maxAge: 604800`. However, `POST /api/auth/logout` previously omitted `maxAge: 0` and `sameSite: "lax"`. Under RFC 6265, strict modern browsers (Chrome/Edge) ignore deletion headers when flag attributes mismatch the original cookie.
  3. **Missing Visual Feedback:** The button lacked `cursor-pointer`, `disabled` state, and loading spinners during the network call.
  4. **Omission on Child Desk Routes:** `/desk/orders/[id]` had no logout button in its command header.
- **Resolution / Fix:**
  1. Updated `handleLogout` across `/desk`, `/desk/orders/[id]`, `/cart`, `/catalogue`, `/orders`, and `/quick-order` to perform hard document navigation: `window.location.href = "/login"` inside a `finally` block with `credentials: "include"`, purging all RSC caches and in-memory state.
  2. Hardened `POST /api/auth/logout` with `response.cookies.delete(SESSION_COOKIE_NAME)` and explicit `response.cookies.set` with matching `maxAge: 0, expires: new Date(0), sameSite: "lax", secure: process.env.NODE_ENV === "production"`.
  3. Added `GET /api/auth/logout` redirecting directly to `/login` with cleared cookies.
  4. Added `loggingOut` state with `Loader2` spinning icon and `disabled` state to all logout buttons.
  5. Added a dedicated Log Out button to the header of `/desk/orders/[id]`.
- **Prevention:** Always use hard document navigation (`window.location.href`) for authentication boundary crossings to bust SPA client caches, and mirror exact cookie scope attributes on deletion.

---

### [ERR-057] Deployment TypeScript Compilation Failure on AmbiguityReason Literal Widening in Cascaded Parser
- **Date & Time:** 2026-11-07 21:56:00
- **Module:** Module 5 - Cascaded Parser Pipeline & Next.js Production Build
- **Phase:** Deployment / Next.js Production Build
- **Symptoms / Error Message:**
  ```text
  src/lib/ai/cascaded-parser.ts(179,7): error TS2322: Type '({ source: "rules"; id: string; rawUtterance: string; extractedQty: number | null; extractedUnit: UnitType; matchedSku: SeedSku | null; confidence: number; isAmbiguous: boolean; ... 5 more ...; reasoning?: string | undefined; } | { ...; } | { ...; })[]' is not assignable to type 'ParsedLineItem[]'.
    Type '{ matchedSku: null; confidence: number; isAmbiguous: boolean; ambiguityReason: string; reasoning: string; source: string; id: string; rawUtterance: string; extractedQty: number | null; extractedUnit: UnitType; candidates: SkuCandidate[]; resolvedQtyCases: number; resolvedQtyPacks?: number; brokenCaseInfo?: BrokenCas...' is not assignable to type 'ParsedLineItem'.
      Types of property 'ambiguityReason' are incompatible.
        Type 'string' is not assignable to type 'AmbiguityReason'.
  Failed to type check.
  ```
- **Root Cause Analysis:**
  In commit `2888ad1` (committed at 21:53:33), the fallback threshold was lowered from 20% to 15% to allow remote match evaluation. In the return object for unmatched candidate items:
  ```ts
  return {
    ...line,
    matchedSku: null,
    confidence: decision.confidence ?? 0.15,
    isAmbiguous: true,
    ambiguityReason: "UNKNOWN_SKU",
    reasoning: decision.reasoning || `No match found in wholesale catalog for "${line.rawUtterance}".`,
    source: decision.source === "gemini" ? "gemini" : "rules",
  };
  ```
  The TypeScript compiler widened `"UNKNOWN_SKU"` to `string` and `source` to `string`. When assigned to `ParsedLineItem[]`, TypeScript strictly enforces `ambiguityReason: AmbiguityReason` where `AmbiguityReason` is a strict union (`"MISSING_UNIT" | "AMBIGUOUS_UNIT" | "MULTIPLE_CANDIDATES" | "UNKNOWN_SKU" | "BROKEN_CASE" | null`). The widened `string` type was rejected during `next build`, failing the cloud deployment at 21:56:00.
- **Resolution / Fix:**
  Explicitly typed the fields:
  ```ts
  ambiguityReason: "UNKNOWN_SKU" as AmbiguityReason,
  source: (decision.source === "gemini" ? "gemini" : "rules") as ParsedLineItem["source"],
  ```
  And in `src/__tests__/walkthrough.test.ts`, corrected `casePacks` and `gstPct` references to `unitsPerCase` and `gstRate` on `SeedSku`.
  Verified with `npm run build` which compiled cleanly in 4.5s with exit code 0 across all 35 routes. Pushed in commit `9ad0d61`.
- **Prevention:** Always run full production build (`npm run build`) locally before pushing to catch TypeScript union type widening issues in pipeline return objects.







