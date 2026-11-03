# Test & Run Guide: Individual & Collective System Testing

This document is your hands-on operational runbook to run, verify, and debug every component of the Distributor Order Management System—both **individually** (unit tests, API endpoints, single screens, isolated services) and **collectively** (full test suites, end-to-end user journeys, production builds, route protection).

---

## 1. Quick-Start Cheat Sheet

From the `distributor-app/` directory:

| What You Want To Do | Command | What It Verifies |
| :--- | :--- | :--- |
| **Run all tests collectively** | `npm run test` | Executes all Vitest test suites across all modules in <1 second. |
| **Run tests in watch mode** | `npm run test:watch` | Reruns tests on every file save during development. |
| **Test Module 1 (Auth) only** | `npx vitest run src/__tests__/auth.test.ts` | Runs the 12 isolated auth, cryptographic OTP, and JWT tests. |
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

## 5. Upcoming Modules Test Plan

As subsequent modules are implemented, their test commands will integrate here:

| Module | Individual Test Command | What It Verifies |
| :--- | :--- | :--- |
| **Module 2: Catalogue** | `npx vitest run src/__tests__/catalogue.test.ts` | Case/pack pricing, out-of-stock disablement, live search. |
| **Module 3: Scheme Engine** | `npx vitest run src/__tests__/schemes.test.ts` | Buy 10 Get 1 calculations, 3% slab tiers, GST tax formulas. |
| **Module 4: Cart & Orders** | `npx vitest run src/__tests__/orders.test.ts` | Atomic stock reservation, ledger credit headroom ceiling check. |
| **Module 5: AI Capture** | `npx vitest run src/__tests__/ai-capture.test.ts` | Hindi phonetic parsing, "peti" unit clarification, Gemini OCR fallback. |
| **Module 6: Order Desk** | `npx vitest run src/__tests__/desk.test.ts` | Optimistic Concurrency Control (OCC) version conflicts, alias learning. |
| **Module 7: Tally Export** | `npx vitest run src/__tests__/tally.test.ts` | Schema-valid Tally ERP 9 / Prime `<ENVELOPE>` XML generation. |
| **Module 8: Van Manifest** | `npx vitest run src/__tests__/manifest.test.ts` | Route aggregation, case picking totals, stop sequencing. |
| **Module 9: Dormant Retailers** | `npx vitest run src/__tests__/dormant.test.ts` | $\ge 14$ day inactivity queries, WhatsApp deep-link generation. |
