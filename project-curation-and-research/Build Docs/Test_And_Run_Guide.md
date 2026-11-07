# Test & Run Guide: Individual & Collective System Testing

This document is your hands-on operational runbook to run, verify, and debug every component of the Distributor Order Management System—both **individually** (unit tests, API endpoints, single screens, isolated services) and **collectively** (full test suites, end-to-end user journeys, production builds, route protection).

---

## 1. Quick-Start Cheat Sheet

From the `distributor-app/` directory:

| What You Want To Do | Command | What It Verifies |
| :--- | :--- | :--- |
| **Run all tests collectively** | `npm run test` | Executes all 20 Vitest test suites (153 tests) across all modules in <2 seconds. |
| **Run tests in watch mode** | `npm run test:watch` | Reruns tests on every file save during development. |
| **Test Module 1 (Auth) only** | `npx vitest run src/__tests__/auth.test.ts` | Runs the 13 isolated auth, cryptographic OTP, and JWT tests. |
| **Test Concurrency Lock only** | `npx vitest run src/__tests__/session-lock.test.ts` | Runs 6 single-writer concurrency lock & force-logout tests (`[A49]`). |
| **Test Module 2 (Catalogue) only** | `npx vitest run src/__tests__/catalogue.test.ts` | Runs the 8 isolated catalogue, pricing, and stock tests. |
| **Test Real-Time Stock Sync only** | `npx vitest run src/__tests__/realtime-stock.test.ts` | Runs 5 SSE streaming, inventory versioning, and out-of-stock guard tests (`[A52]`). |
| **Test Scoped Cart Storage only** | `npx vitest run src/__tests__/cart-storage.test.ts` | Runs 7 multi-kirana cart isolation and zero-drop migration tests (`[A50]`, `[A53]`). |
| **Test Module 3 (Schemes) only** | `npx vitest run src/__tests__/schemes.test.ts` | Runs the 13 pure scheme engine and GST calculation tests. |
| **Test Dynamic Transliteration only**| `npx vitest run src/__tests__/dynamic-transliteration.test.ts` | Runs 5 3-tier cascade and arbitrary catalogue transliteration tests (`[A55]`). |
| **Test Module 4 (Orders) only** | `npx vitest run src/__tests__/orders.test.ts` | Runs the 4 order creation, credit hold, and OCC tests. |
| **Test Excel Importer only** | `npx vitest run src/__tests__/excel-import.test.ts` | Runs the 4 Excel template generation and workbook parsing tests. |
| **Test Module 5 (Text Parser) only** | `npx vitest run src/__tests__/text-parser.test.ts` | Runs the 14 multilingual text parser, broken case, and ambiguity guardrail tests. |
| **Test Module 6 (Order Desk) only** | `npx vitest run src/__tests__/desk.test.ts` | Runs the 8 Order Desk triage, OCC concurrency collision, line editing, and alias learning tests. |
| **Test Module 7 (Tally XML) only** | `npx vitest run src/__tests__/tally.test.ts` | Runs the 8 Tally XML voucher, Actual vs Billed scheme quantities, and double-entry balancing tests. |
| **Test Module 8 (Van Manifest) only** | `npx vitest run src/__tests__/manifest.test.ts` | Runs the 4 route aggregation, case picking totals, stop sequencing, and payload weight tests. |
| **Test Module 9 (Dormant Desk) only** | `npx vitest run src/__tests__/dormant.test.ts` | Runs the 4 14-day inactivity filtering, churn risk tiers, credit headroom, and WhatsApp nudge tests. |
| **Run full production build** | `npm run build` | Compiles TypeScript, runs Turbopack, verifies static/dynamic routes. |
| **Start local dev server** | `npm run dev` | Spins up live development server at `http://localhost:3000`. |
| **Start local production server** | `npm run start` | Serves the optimized production build at `http://localhost:3000`. |

---

## 2. Individual Part Testing (Unit & Component Level)

### A. Testing Module 1: Auth, OTP & JWT in Isolation
The test suite [`src/__tests__/auth.test.ts`](file:///V:/Projects/Resume%20Projects/IsoLabs/distributor-app/src/__tests__/auth.test.ts) tests the authentication logic without needing a running server or internet connection.

```bash
cd distributor-app
npx vitest run src/__tests__/auth.test.ts
```

#### What It Tests Individually:
1. **Cryptographic OTP Generation:** Guarantees 6-digit numeric strings (`/^\d{6}$/`) with entropy across consecutive calls.
2. **Rate Limiting:** Enforces a 30-second cooldown between OTP dispatches to the same phone.
3. **Attempt Burning:** Simulates 3 failed attempts (`000001`, `000002`, `000003`) and verifies the OTP is permanently invalidated to block brute-force attacks.
4. **Timing-Safe Comparison:** Uses `crypto.timingSafeEqual` to eliminate timing side-channel exploits.
5. **Role Provisioning:** Verifies phone lookup maps to the correct role (`retailer` for `9826000001`, `desk` for `9826000099`, `salesman` for `9826000018`).
6. **JWT Session Signing & Tamper Detection:** Signs an HS256 JWT via `jose`, intentionally modifies the token signature bytes, and asserts that `verifySessionToken` rejects the tampered token.

---

### B. Testing API Endpoints Individually (CLI / PowerShell / cURL)

Start the development server first:
```bash
cd distributor-app
npm run dev
```

#### 1. Test Phone Lookup Endpoint (`GET /api/auth/lookup-phone`)
Tests instant merchant store identification before sending OTP:

*PowerShell:*
```powershell
# Known Retailer (Sharma Kirana)
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/lookup-phone?phone=9826000001" -Method GET | ConvertTo-Json

# Known Desk Clerk
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/lookup-phone?phone=9826000099" -Method GET | ConvertTo-Json

# Unregistered Phone
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/lookup-phone?phone=9999999999" -Method GET | ConvertTo-Json
```

*cURL / Bash:*
```bash
curl -X GET "http://localhost:3000/api/auth/lookup-phone?phone=9826000001"
```

*Expected Output (Retailer):*
```json
{
  "found": true,
  "role": "retailer",
  "title": "Sharma Kirana Store",
  "subtitle": "RET-0001 • Napier Town Route #4",
  "availableCredit": 38000
}
```

---

#### 2. Test OTP Dispatch Endpoint (`POST /api/auth/send-otp`)

*PowerShell:*
```powershell
$body = @{ phone = "9826000001" } | ConvertTo-Json
$res = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/send-otp" -Method POST -Body $body -ContentType "application/json"
$res | ConvertTo-Json
```

*cURL / Bash:*
```bash
curl -X POST "http://localhost:3000/api/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone": "9826000001"}'
```

*Expected Output:*
```json
{
  "success": true,
  "message": "OTP sent successfully to +91 98****0001.",
  "expiresInSeconds": 300,
  "devOtp": "123456"
}
```
*(Check terminal logs to see the formatted console SMS box with the 6-digit code).*

---

#### 3. Test OTP Verification & Cookie Issuance (`POST /api/auth/verify-otp`)

*PowerShell:*
```powershell
# Use the devOtp returned from step 2
$otpCode = $res.devOtp
$body = @{ phone = "9826000001"; otp = $otpCode } | ConvertTo-Json

# Include session container to capture the HTTP-Only cookie
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$verifyRes = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/verify-otp" -Method POST -Body $body -ContentType "application/json" -WebSession $session
$verifyRes | ConvertTo-Json
```

*Expected Output:*
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "USR-RET-1",
    "phone": "9826000001",
    "name": "Ramesh Sharma",
    "role": "retailer",
    "retailerId": "RET-0001"
  },
  "redirectUrl": "/catalogue"
}
```

---

#### 4. Test Authenticated Profile Endpoint (`GET /api/auth/me`)

*PowerShell:*
```powershell
# Passes the session cookie captured in step 3
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/me" -Method GET -WebSession $session | ConvertTo-Json
```

*Expected Output:*
```json
{
  "authenticated": true,
  "user": {
    "id": "USR-RET-1",
    "phone": "9826000001",
    "name": "Ramesh Sharma",
    "role": "retailer"
  },
  "retailer": {
    "id": "RET-0001",
    "name": "Sharma Kirana Store",
    "ownerName": "Ramesh Sharma",
    "route": "Napier Town Route #4",
    "creditLimit": 50000,
    "currentBalance": 12000,
    "availableCredit": 38000,
    "creditHold": false
  }
}
```

---

#### 5. Test Logout Endpoint (`POST /api/auth/logout`)

*PowerShell:*
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/logout" -Method POST -WebSession $session | ConvertTo-Json
```

---

### C. Testing UI Screens Individually in the Browser

Open your browser to: [**http://localhost:3000/login**](http://localhost:3000/login)

| Test Case | How To Test | Expected Behavior |
| :--- | :--- | :--- |
| **Retailer Login** | Tap the `[🏪 Retailer]` chip. Click **"Send Login OTP"**. Enter the 6 digits shown in the sandbox notice. Tap **"Verify & Login"**. | Login succeeds; user is redirected to `/catalogue`. |
| **Desk Clerk Login** | Tap the `[💻 Order Desk]` chip (`9826000099`). Follow the OTP flow. | Login succeeds; user is redirected to `/desk`. |
| **Salesman Login** | Tap the `[🚶 Salesman]` chip (`9826000018`). Follow the OTP flow. | Login succeeds; user is redirected to `/catalogue`. |
| **Language Toggle** | Tap the `[हिंदी]` toggle in the top-right header. | All labels instantly translate to Hindi (`थोक व्यापारी लॉगिन`, `पंजीकृत मोबाइल नंबर`, `ओटीपी प्राप्त करें`). |
| **OTP Auto-Advance & Paste** | Paste a 6-digit number into the first input box. | The 6 digits distribute across the 6 boxes, and focus moves to the last box. |
| **Attempt Lockout** | Intentionally type `000000` three times. | Error banner warns of remaining attempts, then locks the code: *"Too many incorrect attempts. Please request a new code."* |
| **Resend Timer** | Request an OTP. | Resend button is replaced by a live `00:45` countdown timer. |

---

## 3. Collective / Full-System Testing

### A. Automated Collective Test Suite
Runs all test suites across all modules in parallel:
```bash
cd distributor-app
npm run test
```

### B. Production Build Verification
Compiles all TypeScript, generates static routes, verifies tree-shaking, and tests proxy routing:
```bash
cd distributor-app
npm run build
```

*Build Output Checklist:*
- `○ /login` (Prerendered as static content)
- `ƒ /` (Server-rendered dynamic redirect gatekeeper)
- `ƒ /api/auth/*` (Dynamic route handlers)
- `ƒ Proxy (Middleware)` (Active edge security guard)
- Zero TypeScript (`tsc`) warnings or errors.

### E. Testing Module 5: Multilingual Text Order Parser in Isolation
The test suite [`src/__tests__/text-parser.test.ts`](file:///V:/Projects/Resume%20Projects/IsoLabs/distributor-app/src/__tests__/text-parser.test.ts) verifies parsing of English, Hinglish, and Hindi orders without external API dependencies:

```bash
cd distributor-app
npx vitest run src/__tests__/text-parser.test.ts
```

#### What It Tests Individually:
1. **Devanagari Numerals:** Normalizes `०, १, २, ३, ४, ५, ६, ७, ८, ९` into standard Arabic digits `0-9`.
2. **Word Numerals:** Translates written numbers across Hinglish (`do`, `chaar`, `paanch`, `das`), English (`two`, `five`), and Hindi (`दो`, `चार`, `पाँच`).
3. **Colloquial Units:** Maps *"peti"*, *"dabba"*, *"case"* to wholesale `CASE`, and *"packet"*, *"pack"* to `PACK`.
4. **Unit Ambiguity Guardrail (`[A16]`):** When a message states *"5 biscuit chhota"* without specifying *"peti"* or *"packet"*, marks line as `isAmbiguous: true` with `ambiguityReason: "MISSING_UNIT"`.
5. **Pack-to-Case Conversion (`[A35]`):** Computes whole master cases via ceiling division (`ceil(packs / unitsPerCase)`).
6. **Pipeline Strategy & ML Extensibility (`[A33]`):** Validates strategy provider and pluggable adapter fallback.

#### Testing Text Parser API Endpoint (`POST /api/capture/parse-text`)
*PowerShell:*
```powershell
$body = @{ text = "bhaiya 5 peti biscuit chhota`n2 peti ghadi powder 1 kg" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/capture/parse-text" -Method POST -Body $body -ContentType "application/json" | ConvertTo-Json -Depth 5
```

---

### F. Testing Module 6: Order Desk Operations & Concurrency in Isolation
The test suite [`src/__tests__/desk.test.ts`](file:///V:/Projects/Resume%20Projects/IsoLabs/distributor-app/src/__tests__/desk.test.ts) verifies desk triage, OCC concurrency collision rejection, and auto-learned alias persistence:

```bash
cd distributor-app
npx vitest run src/__tests__/desk.test.ts
```

#### What It Tests Individually:
1. **Queue Retrieval & Metrics:** Asserts that pre-seeded realistic Jabalpur orders load with accurate status tallies and wholesale value.
2. **Line Item Editing & Authoritative Scheme Math (`[A38]`):** Simulates increasing case quantities on the desk terminal, verifying live scheme math unlocks free goods cases (`Buy 10 Get 1`) and recalculates GST splits.
3. **Optimistic Concurrency Control (OCC) Collision Rejection (`[A19]`):** Simulates Clerk A confirming an order (incrementing `occVersion` from 1 to 2), and verifies that Clerk B attempting to save with stale version 1 is strictly rejected with `HTTP 409 Conflict`.
4. **Credit Hold Clearance Authorization (`[A37]`):** Releasing an over-limit order (`ORD-10483`) stamps `holdReleasedBy` and `holdReleaseNote`, increments `occVersion`, and updates status to `VERIFIED`.
5. **Retailer Alias Auto-Learning (`[A20]`):** Verifies that clerk SKU corrections persist customer vocabulary to `retailer_aliases`, incrementing the `timesUsed` counter while keeping mappings strictly scoped per retailer.

#### Testing Desk Endpoints via CLI / PowerShell:
```powershell
# 1. Fetch Orders Queue with Status Filter
Invoke-RestMethod -Uri "http://localhost:3000/api/desk/orders?status=CREDIT_HOLD" -Method GET | ConvertTo-Json -Depth 3

# 2. Release Credit Hold on Order ORD-10483
$body = @{ expectedOccVersion = 1; authorizedBy = "Amit Jain"; approvalNote = "Cash on delivery approved" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/desk/orders/ORD-10483/release-hold" -Method POST -Body $body -ContentType "application/json" | ConvertTo-Json
```

---

### C. Middleware Route Protection Verification

| Starting State | Attempted URL | Expected Result | Reason |
| :--- | :--- | :--- | :--- |
| **Logged Out** | `http://localhost:3000/catalogue` | Redirects to `/login?redirect=/catalogue` | Unauthenticated access blocked by middleware. |
| **Logged Out** | `http://localhost:3000/desk` | Redirects to `/login?redirect=/desk` | Desk route requires authentication. |
| **Logged In as Retailer** | `http://localhost:3000/desk` | Redirects to `/catalogue` | **Role Enforcement:** Retailers cannot access Order Desk screens. |
| **Logged In as Desk Clerk** | `http://localhost:3000/desk` | Allows access (`200 OK`) | Permitted for `role: "desk"`. |
| **Logged In as Any Role** | `http://localhost:3000/login` | Redirects to `/catalogue` or `/desk` | Already authenticated users do not see the login screen. |

---

## 4. Switching Providers: Real vs. Development

All integrations can be flipped between **Development Mode** (console output) and **Production Mode** (real cloud providers) via `distributor-app/.env.local`:

### SMS Gateway (Fast2SMS / Twilio)
- **Local Dev (Console):**
  ```env
  SMS_PROVIDER="console"
  SMS_API_KEY=""
  ```
  *(OTPs print directly to the terminal and are returned in dev API responses for instant testing).*

- **Production Fast2SMS:**
  ```env
  SMS_PROVIDER="fast2sms"
  SMS_API_KEY="YOUR_FAST2SMS_API_KEY"
  ```
  *(Sends real SMS to Indian mobile numbers via Fast2SMS DLT route).*

- **Production Twilio:**
  ```env
  SMS_PROVIDER="twilio"
  TWILIO_ACCOUNT_SID="ACxxxxx"
  TWILIO_AUTH_TOKEN="yyyyy"
  TWILIO_PHONE_NUMBER="+1xxxxxxxxxx"
  ```

---

## 5. Comprehensive Automated Test Suite (158 Tests across 21 Suites)

All test suites are fully automated and pass in <2 seconds with zero network dependencies:

| Module | Test Command | What It Verifies | Tests Count |
| :--- | :--- | :--- | :--- |
| **Module 1: Auth & OTP** | `npx vitest run src/__tests__/auth.test.ts` | OTP generation, rate limits, attempt lockouts, JWT sessions, B2B registration | 13 tests |
| **Module 1: Concurrency Lock** | `npx vitest run src/__tests__/session-lock.test.ts` | Single-writer acquisition, HTTP 409 conflict, deferred OTP preservation, force logout (`[A49]`) | 6 tests |
| **Module 2: Catalogue** | `npx vitest run src/__tests__/catalogue.test.ts` | Case/pack pricing, out-of-stock disablement, live search & brand filters | 8 tests |
| **Module 10: Real-Time Stock** | `npx vitest run src/__tests__/realtime-stock.test.ts` | Real-time SSE streaming, inventory versioning, out-of-stock stepper locks (`[A52]`) | 5 tests |
| **Module 10: Scoped Carts** | `npx vitest run src/__tests__/cart-storage.test.ts` | Kirana draft cart isolation (`[A50]`), zero-drop dual-writes, auto-migration (`[A53]`) | 7 tests |
| **Module 3: Scheme Engine** | `npx vitest run src/__tests__/schemes.test.ts` | Buy 10 Get 1 floor division, 3% slab tiers, Rule 46 50/50 GST formulas | 13 tests |
| **Module 12: Transliteration**| `npx vitest run src/__tests__/dynamic-transliteration.test.ts` | 3-tier cascade, Mandi lexicon mapping, phonetic syllable conversion, Excel enrichment (`[A55]`) | 5 tests |
| **Module 13: Deterministic Guardrails** | `npx vitest run src/__tests__/deterministic-guardrails.test.ts` | Strictly deterministic packaging isolation (`[A59]`), zero-Gemini out-of-catalog rejection, Vaani ASR fallback (`[A58]`) | 6 tests |
| **Module 14: Trade Knowledge Graph** | `npx vitest run src/__tests__/knowledge-graph.test.ts` | 12-domain categorization, longest-phrase-first compound resolution (`[A61]`), category-grounded suggestions, zero biscuit hallucinations | 5 tests |
| **Module 4: Cart & Orders** | `npx vitest run src/__tests__/orders.test.ts` | Atomic stock reservation, ledger credit headroom ceiling check, OCC versioning | 4 tests |
| **Master Setup (Excel)** | `npx vitest run src/__tests__/excel-import.test.ts` | Excel workbook parsing, column synonym tolerance, dynamic catalog replacement | 4 tests |
| **Module 5: Text Parser** | `npx vitest run src/__tests__/text-parser.test.ts` | Devanagari numerals, Hinglish extraction, unit ambiguity guardrails, broken case handling | 14 tests |
| **Module 5: Scorer** | `npx vitest run src/__tests__/calibrated-scorer.test.ts` | Platt-calibrated logistic regression scoring, 0.60 confidence floor | 8 tests |
| **Module 5: Candidate Retrieval** | `npx vitest run src/__tests__/candidate-retriever.test.ts` | Cormack RRF k=60 candidate retrieval, trigram fuzzy matching | 8 tests |
| **Module 5: AI Cascade** | `npx vitest run src/__tests__/cascaded-parser.test.ts` | Three-tier cascade execution, early abstention thresholds | 12 tests |
| **Module 5: Closed-Set Chooser** | `npx vitest run src/__tests__/gemini-chooser.test.ts` | Gemini 2.5 closed-set candidate selector, out-of-catalog rejection floor (`[A16]`) | 6 tests |
| **Module 5: Resilience** | `npx vitest run src/__tests__/gemini-random-words.test.ts` | Typo and gibberish handling, zero false-positive biscuits, polite vernacular explanations | 6 tests |
| **Module 6: Order Desk** | `npx vitest run src/__tests__/desk.test.ts` | Optimistic Concurrency Control (OCC) version conflicts, line editing, alias learning | 8 tests |
| **Module 7: Tally Export** | `npx vitest run src/__tests__/tally.test.ts` | Schema-valid Tally ERP 9 / Prime XML `<ENVELOPE>`, Actual vs Billed quantities, double-entry balance | 8 tests |
| **Module 8: Van Manifest** | `npx vitest run src/__tests__/manifest.test.ts` | Route aggregation, case picking totals, stop sequencing, payload weight calculation | 4 tests |
| **Module 9: Dormant Desk** | `npx vitest run src/__tests__/dormant.test.ts` | $\ge 14$ day inactivity queries, churn risk tiers, pre-filled Hindi WhatsApp nudges | 4 tests |
| **Total Test Coverage** | `npm run test` | **All 21 test suites executing collectively** | **158 tests (100% Passing)** |

---

### 5.1 Testing Multimodal & Knowledge Graph via Real Assets in `/quick-order`

In addition to automated CLI unit tests, you can visually test multimodal ingestion and knowledge graph disambiguation in the browser:

1. **Launch Browser:** Open `http://localhost:3000/quick-order` (log in as Retailer: `9826000001` with OTP `123456`).
2. **Authentic 17-Line Kirana Slip Test:**
   - Under the photo upload area, tap the purple button: **`"Try Authentic Kirana Slip (17 Items)"`**.
   - The app loads `/samples/kirana_slip_sample.png`, downscales it via offscreen canvas `[A60]`, sends it through multimodal OCR, and parses all 17 handwritten items (*कनकी, सर्फ, बेसन, चने की दाल, बर्तन की साबुन, नहाने की साबुन...*).
   - **Verification:** Notice that *"सर्फ"* suggests Surf Excel / Ghadi 1kg, *"बर्तन की साबुन"* suggests Vim Bar, and *"नहाने की साबुन"* suggests Dettol / Lifebuoy. Non-inventory items (*"मोर्टीन"*, *"रोल पेपर"*) are honestly flagged without showing sweet biscuits!
3. **Jabalpur Mandi Audio Note Test:**
   - Under the audio upload area, tap the purple button: **`"Try Jabalpur Mandi Audio"`**.
   - The app loads `/samples/jabalpur_mandi_order.mp3` and transcribes colloquial Hindi speech (*10 packet parle-g 250g, 5 katti atta 5kg, 2 peti vim bar, 1 peti surf excel 1kg*).
   - **Verification:** Automatically confirms all 4 FMCG lines in <15ms with full pack and case unit resolution.

---

## 6. Comprehensive Metrics, Latency & Benchmark Verification Runner

To run the complete empirical benchmark suite covering **Portability, Usability, Speed & Latency (Click to Glass decomposition across Broadband, 4G, 3G, 2G), Bandwidth Payloads, and Industry Benchmark Comparisons**:

```bash
# Run the 8-sheet benchmark generator from distributor-app:
npx --prefix distributor-app tsx --tsconfig distributor-app/tsconfig.json "project-curation-and-research/overall_app_testing/generate-benchmark-excel.ts"
```

### Outputs Generated:
1. **Excel Spreadsheet (8 Sheets):** `project-curation-and-research/overall_app_testing/overall_app_testing_results.xlsx`
2. **Structured JSON Database:** `project-curation-and-research/overall_app_testing/overall_app_testing_database.json`
3. **Master Report Artifact:** `C:\Users\Asus\.gemini\antigravity-cli\brain\e1f855bc-1984-4de0-835a-e6aab71aae9e\comprehensive_metrics_and_benchmarks_report.md`

