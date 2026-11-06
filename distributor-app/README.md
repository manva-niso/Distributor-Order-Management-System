# Distributor Order Management App (`distributor-app`)

> **Wholesale FMCG Order Management System for Company A, Jabalpur**  
> Serving 1,800 Kirana stores across Jabalpur routes with conversational WhatsApp ordering, trade scheme calculation, split-screen human verification, and Tally Prime ERP export.

---

## ⚡ Quickstart (Run in 30 Seconds)

```bash
# 1. From distributor-app directory, install dependencies
npm install

# 2. Start the local server
npm run dev

# 3. Open in your browser
# App runs live at: http://localhost:3000
```

### Run Tests:
```bash
npm test          # Run app test suite (124 tests)
npm run test:all  # Run universal test suite across app & engine (192 tests)
```

---

## 👥 1-Click Test Personas (`/login`)

On [`http://localhost:3000/login`](http://localhost:3000/login), tap any pre-configured test account.  
*(In local dev mode, the 6-digit OTP is shown on-screen in the yellow notice box).*

| Persona | Mobile | Business & Territory | Role & What to Test |
| :--- | :--- | :--- | :--- |
| **Kirana Retailer** | `9826000001` | **Sharma Kirana Store**<br/>(Napier Town Route #4) | Browse 36 SKUs, Buy 10 Get 1 free schemes, 3% slab discounts, WhatsApp text ordering. |
| **Order Desk Clerk** | `9826000099` | **Sunil Clerk**<br/>(Company A Office) | Triage incoming orders, split-screen text verification, approve credit holds, export Tally XML. |
| **Field Salesman** | `9826000018` | **Rajesh Kumar**<br/>(Napier Town Beat) | Book orders on behalf of shops during field visits. |

> [!NOTE]
> **Strict Seat Isolation:** You stay in your assigned seat! Retailers cannot access `/desk`, and clerks cannot access `/catalogue` or place direct buyer orders.

---

## 🧭 The 13-Step Interactive Walkthrough Guide

When the app opens, a floating **Walkthrough Widget** appears on your screen. You can drag it, minimize it, or click any step to jump straight to the route.

### Part 1: Core Customer Demands in Sequence (Happy Path)

| Step | Screen | Action to Take | Expected Result |
| :---: | :--- | :--- | :--- |
| **1** | **`/setup`** | Click **"Master Wholesale FMCG (36 SKUs)"** | Seeds 36 products and 8 Kiranas into Neon PostgreSQL. **Orders = 0** (clean start). |
| **2** | **`/login`** | Log in as **Sharma Kirana (`9826000001`)** | Authenticates via SMS OTP. Enters Kirana buyer portal. |
| **3** | **`/quick-order`** | Type: `bhaiya 5 peti biscuit chhota, 2 peti ghadi powder 1 kg` | Maps to Parle-G and Ghadi (96% confidence). Tap **"Place Order"** $\to$ written to Neon DB. |
| **4** | **`/catalogue`** | Increase Parle-G to **10 cases** and Ghadi to **5 cases** | Unlocks **+1 Free Case** (at ₹0 per Circular 92/11/2019) and **3% Bulk Discount**. View `/cart` for 50/50 CGST+SGST tax split. |
| **5** | **`/desk`** | Log in as **Sunil Clerk (`9826000099`)** and open order | **Split-screen review:** Raw customer WhatsApp message on left, verified products on right. Tap **"Save & Confirm"**. |
| **6** | **`/desk`** | Open **"Van Manifest"** & tap **"Export Tally XML"** | Views vehicle loading sheets by route and downloads Tally Prime XML sales voucher. |

---

### Part 2: Rigorous Edge Cases (After Demands Are Met)

| Step | Edge Case | Test Input / Action | Safety Invariant Enforced |
| :---: | :--- | :--- | :--- |
| **7** | **Out-of-Catalog Rejection** | On `/quick-order`, tap **"🚫 Chips"** (or type `10 peti chips`) | **12% confidence floor:** Refuses to match biscuits or guess customer money! |
| **8** | **Polysemic Packaging ("Dabba")** | On `/quick-order`, tap **"⚖️ Ghee"** (or type `5 dabba ghee`) | **68% confidence cap:** Asks: *"Did you mean 1L Tin or 500ml Jar?"* |
| **9** | **Loose Cut-Pack Rounding** | On `/quick-order`, tap **"📦 Maggi"** (or type `40 packet maggi`) | Detects broken case (case has 96 pkts). Prompts round-up to 1 wholesale case or piece rate. |
| **10** | **Credit Limit Breach** | Log in as **Gupta Daily Needs (`9826000003`)**, order >₹25,000 | Order is placed on **`CREDIT_HOLD`**. Switch to `/desk` $\to$ *Credit Holds* tab to inspect ledger and release. |
| **11** | **14-Day Dormant Retention** | On `/desk`, open **"Dormant Kiranas"** tab | Shows inactive shops (>14 days). Tap WhatsApp icon to send pre-composed Hindi offer deal. |
| **12** | **Multi-Clerk OCC Locking** | Open same order in two browser tabs and save in both | Tab 2 is safely rejected with **HTTP 409 Conflict**, preventing double booking. |
| **13** | **Clean Slate** | Tap **"Clean Slate"** on `/desk` or `/setup` | 1-click wipe back to **0 SKUs, 0 Retailers, 0 Orders** in Neon DB anytime. |

---

## 🎯 Key Features & Problem Goals Verified

* **Zero Dummy Data Lock-in:** The system and desk queue start at true zero (0 orders). Real orders are placed exclusively by shopkeepers.
* **Hinglish & Dialect AI Engine:** Understands Devanagari numerals (`५ पेटी`), Hindi words (`aadha`, `derh`, `dhai`), weight fusion (`"1 kg"` $\to$ `"1kg"`), and trade nicknames (`"pila wala"` $\to$ Parle-G).
* **Ask, Never Guess Guardrails (Invariant [A16]):** Never guesses money or units. Out-of-catalog items are rejected, and polysemic words trigger clarification prompts.
* **GST & Promotion Engine:** Buy X Get Y Free items billed at ₹0 under GST Circular 92/11/2019. Madhya Pradesh intra-state GST split 50/50 into CGST and SGST with commercial half-up rounding.
* **ERP Ready:** Generates valid Tally Prime XML vouchers (`VCHTYPE="Sales Order"`) with exact HSN codes and ledger mappings.
* **Live Neon PostgreSQL:** Relational cloud persistence with SSL encryption.

---

## 🛠️ Environment Configuration (`.env.local`)

```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgres://user:password@ep-sample.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# JWT Authentication (HS256)
JWT_SECRET="isolabs_jabalpur_distributor_secure_session_jwt_secret_key_2026"

# Google Gemini AI (Optional - for slip OCR and closed-set tie-breaker)
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-3.1-flash-lite"

# S3 / MinIO Storage (Optional - falls back to local preview if empty)
AWS_ENDPOINT_URL_S3=""
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION="ap-southeast-1"
S3_BUCKET_NAME="order-uploads"

# Strategy ("rules" or "cascade")
ORDER_PARSER_PROVIDER="rules"
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```
