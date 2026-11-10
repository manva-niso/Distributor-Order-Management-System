# B2B Distributor Order Management System & Regional Order Engine

> **Wholesale FMCG Order Management System for Company A, Jabalpur**  
> Serving 1,800 Kirana stores across Jabalpur trade routes with conversational Hindi/Hinglish WhatsApp ordering, trade scheme calculation, split-screen human verification, and Tally Prime ERP export.  
> **Release: Version 3.2 (Production Ready)** — 259 automated tests passing (100%), calibrated logistic regression scoring model, 100% precision (96.9% 95% Wilson LCB), FMCG Trade Knowledge Graph, and 100% order slip protection.

---

## Quick Links

- **Live Production App:** [https://distributor-order-management-system.vercel.app/login](https://distributor-order-management-system.vercel.app/login)
- **GitHub Repository:** [https://github.com/manva-niso/Distributor-Order-Management-System.git](https://github.com/manva-niso/Distributor-Order-Management-System.git)
- **Technical Design Document:** [`tdd_2.pdf`](./tdd_2.pdf) | [`tdd_2.docx`](./tdd_2.docx) | [`tdd_2.md`](./tdd_2.md)
- **Deployment & Run Guide:** [`deployment.md`](./deployment.md)

---

## 1-Click Reviewer Demo Logins (`/login`)

On [https://distributor-order-management-system.vercel.app/login](https://distributor-order-management-system.vercel.app/login), tap any pre-configured test account or use master OTP `123456` or `716716`:

| Persona | Mobile | Shop & Route | Role & What to Test |
| :--- | :--- | :--- | :--- |
| **Kirana Retailer** | `9826000001` | **Sharma Kirana Store**<br/>(Napier Town Route #4) | Browse 36 SKUs, Buy 10 Get 1 free schemes, 3% slab discounts, WhatsApp text/slip ordering within credit limit. |
| **Order Desk Clerk** | `9826000099` | **Sunil Clerk**<br/>(Company A Office) | Triage incoming orders, split-screen review, approve credit holds, export Tally XML, view van manifests. |
| **Field Salesman** | `9826000050` | **Rajesh Kumar**<br/>(Napier Town Beat) | Book orders on behalf of shops during field visits; isolated draft carts per shop. |

---

## Key System Highlights

1. **5-Tier Order Reading Pipeline:**
   - **Tier 0:** In-memory shop nickname matching (`retailer_aliases`) in 0 ms.
   - **Tier 1:** Normalizes Devanagari numerals (`०-९`), strips conversational pleasantries, extracts units (`peti`, `dabba`), and detects fractional cases.
   - **Tier 2:** Tri-vector retrieval combining 3-character spelling, keyword tokens, and phonetic Metaphone matching with deterministic pack-size grounding (+45% match boost, -75% mismatch penalty).
   - **Tier 3:** 12-feature logistic regression scoring model with Platt calibration in 0.00048 ms, applying segmented safety thresholds (0.75 for single products, 0.945 for multi-pack families) and flagging orders > 3x median quantity to catch typos.
   - **Tier 4:** Fast zero-temperature Gemini AI model strictly restricted to catalog candidates for colloquial dialect phrases.
   - **Tier 5:** TypeScript business guardrails strictly blocking ambiguous units ("dabba"), uncatalogued goods, and broken cases.

2. **FMCG Trade Knowledge Graph:**
   - 12 semantic trade categories distinguishing 8 distributor categories (soaps, biscuits, detergents, oils) from non-distributed items.
   - Longest-phrase matching ("बर्तन की साबुन" -> dishwash bar before "साबुन" -> toilet soap).
   - Zero-cost 0 ms rejection of non-catalog products (car parts, cold drinks) without external API costs.
   - Anti-hallucination guardrail ensuring soaps never suggest biscuits.

3. **Authoritative Pricing & GST Engine:**
   - Calculations execute in integer paise (₹1 = 100 paise) preventing floating-point rounding errors.
   - Buy X Get Y Free cases computed first via integer floor division (`floor(qty / buyQty) * getFreeQty`) at ₹0 per CBIC Circular 92/11/2019-GST.
   - Non-stacking slab percentage discounts applied second to paid cases.
   - Madhya Pradesh intra-state GST split 50/50 into CGST and SGST with commercial half-up rounding.

4. **Live Stock Synchronization:**
   - Cross-tab event bus updates tabs on the same device in 0 ms.
   - Server-Sent Events (SSE) push live stock updates to connected devices in < 50 ms.
   - Periodic 2.5s fallback ping checks stock if connection drops.
   - Atomic database row locks prevent inventory from dropping below zero.

5. **Downstream Integration (Tally ERP & Logistics):**
   - Exports standard Sales Order XML vouchers ready for direct import into Tally ERP 9 or Tally Prime.
   - Balanced debits and credits to exactly ₹0.00 across retailer ledgers, sales accounts, and GST classifications.
   - Warehouse loading sheets aggregate total cases (paid + free) grouped by delivery beat.
   - Inactive shop retention desk flags accounts inactive for 14+ days with 1-click pre-filled WhatsApp re-engagement deals.

---

## 18-Step Interactive Walkthrough

The application includes an interactive floating **Walkthrough Widget** that guides reviewers step-by-step through both core customer demands and edge cases:

1. **Step 1 (`/setup`):** Master Wholesale Catalog Ingestion (0 Orders clean start).
2. **Step 2 (`/login`):** Retailer SMS OTP Login (Sharma Kirana `9826000001`).
3. **Step 3 (`/quick-order`):** Vernacular WhatsApp text ordering with Hindi/Hinglish NLP.
4. **Step 4 (`/catalogue` & `/cart`):** Trade scheme volume discounts, free goods, and 50/50 GST split.
5. **Step 5 (`/desk`):** Split-screen order triage and confirmation.
6. **Step 6 (`/desk`):** Van loading manifest and 1-tap Tally XML export.
7. **Step 7:** Honest out-of-catalog product rejection (refuses to guess money).
8. **Step 8:** Polysemic packaging unit guard ("dabba" triggers clarification card, 0% auto-confirm).
9. **Step 9:** Loose cut-pack rounding and broken case warnings.
10. **Step 10:** Credit exposure ceiling triggering `CREDIT_HOLD` for clerk review.
11. **Step 11:** Inactive shop retention desk with personalized WhatsApp nudges.
12. **Step 12:** Multi-clerk OCC locking preventing concurrent edit overwrites.
13. **Step 13:** 1-click clean slate reset back to 0 orders.
14. **Step 14:** Single-writer kirana session lock preventing simultaneous logins.
15. **Step 15:** Reliable order re-hydration from Neon PostgreSQL across restarts.
16. **Step 16:** Real-time multi-seat stock synchronization.
17. **Step 17:** Zero-drop draft cart pipeline across page transitions.
18. **Step 18:** Instant 1-tap bilingual English/Hindi localization with zero matra clipping.

---

## Local Setup & Development

```bash
# 1. Install dependencies
npm --prefix distributor-app install
npm --prefix engine install

# 2. Run local development server
npm --prefix distributor-app run dev

# App runs locally at: http://localhost:3000
```

### Running Automated Tests

```bash
# Run distributor app tests (191 tests across 25 suites)
npm --prefix distributor-app test -- --run

# Run engine tests (68 tests across 7 suites)
npm --prefix engine test -- --run

# Total: 259 tests passing (100%) in < 5 seconds
```

---

## Project Structure

```
├── distributor-app/        # Next.js 16 (App Router) frontend & API routes
│   ├── src/
│   │   ├── app/            # Application pages (login, catalogue, cart, quick-order, desk, setup)
│   │   ├── components/     # UI components & WalkthroughGuide widget
│   │   ├── lib/            # Auth, database schema, AI parser, pricing engine, tally export
│   │   └── __tests__/      # 25 test suites (191 passing tests)
│   └── public/             # Static assets & architecture diagrams
├── engine/                 # Standalone universal FMCG order & scheme engine (@isolabs/order-engine)
│   ├── src/                # Pure TypeScript pricing, GST, and text parser engine
│   └── __tests__/          # 7 test suites (68 passing tests)
├── deployment.md           # Step-by-step local & production deployment guide
├── tdd_2.pdf               # Technical Design Document (clean B&W, 16/14/12pt)
├── tdd_2.md                # TDD markdown source
└── README.md               # Root repository guide
```
