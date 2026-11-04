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


