# Real-World FMCG Wholesale Catalog & WhatsApp Order Benchmark

This folder contains an authentic wholesale FMCG catalog and a real-world testing benchmark representing the daily order intake of a mid-sized wholesale distributor in Jabalpur, Madhya Pradesh (600 orders/day, ₹90 Crore annual turnover).

---

## 1. Catalog Architecture (`catalog-data.ts` / `catalog-data.json`)

The catalog reflects 36 high-velocity wholesale SKUs across 7 primary manufacturer lines:

| Category | Key Brands | Typical Master Case (Peti) | GST Rate | Real HSN Code |
| :--- | :--- | :--- | :--- | :--- |
| **Biscuits & Confectionery** | Parle, Britannia, Cadbury, Sunfeast | 36 to 96 retail packs | 18% | `19053100` |
| **Tea, Coffee & Beverages** | Tata Tea, Wagh Bakri, Red Label, Nescafe | 24 to 48 retail packs | 5% (Tea), 18% (Coffee) | `09024020`, `21011110` |
| **Edible Oils & Ghee** | Fortune, Mahakosh, Amul | 16 pouches (1L) / 1 Tin (15L) | 5% (Oil), 12% (Ghee) | `15121910`, `15149110`, `04059020` |
| **Laundry & Detergents** | Ghadi, Surf Excel, Wheel, Rin | 16 to 40 bags (1kg/500g) / 72 bars | 18% | `34029011`, `34011941` |
| **Personal Care & Toilet Soaps** | Dettol, Lifebuoy, Lux, Colgate, Clinic Plus | 36 to 72 units | 18% | `34011110`, `33061020`, `33051090` |
| **Packaged Foods & Spices** | Maggi, YiPPee, Tata Salt, Everest | 25 to 96 retail packets | 5% (Salt/Spices), 12% (Noodles) | `19023010`, `25010010`, `09109100` |
| **Home Care & Cleaning** | Vim Bar, Harpic, Good Knight | 24 to 48 units | 18% | `34011942`, `38089191`, `34029099` |

### Packaging Hierarchy & Nomenclature
In wholesale FMCG, items are sold in strict packaging tiers:
1. **Loose Pack / Pouch / Retail Unit:** The single unit sold to consumers over the counter (e.g. Parle-G 75g @ ₹10 MRP, Maggi 70g @ ₹14 MRP).
2. **Inner Display Carton / Shrink Pack:** Counter dispenser containing 12 to 24 loose packs.
3. **Master Corrugated Shipper (Peti / Case):** The outer box loaded onto delivery vans and billed in Tally (e.g. 96 packs of Parle-G, 16 pouches of Fortune 1L, 20 bags of Ghadi 1kg).
4. **Master Tin (15L / 15kg):** Heavy industrial tin for bulk mustard / sunflower oil.

---

## 2. Real-World Trade Scheme Structures

The catalog models 4 authentic trade promotion mechanisms used by FMCG manufacturers in central India:

1. **Free Goods Schemes (`FREE_GOODS`):**
   - *Example:* Buy 10 Cases of Parle-G 75g $\to$ Get 1 Case Free (`buyQty: 10, getFreeQty: 1`).
   - *Example:* Buy 10 Cases of Ghadi Powder 1kg $\to$ Get 1 Case Free.
   - Billed at ₹0 rate in Tally ERP, but deducts physical stock from the warehouse.
2. **Slab Tier Discounts (`SLAB_DISCOUNT`):**
   - *Example:* Buy 4+ Cases of Britannia Good Day Butter $\to$ Get 5% Off gross wholesale invoice.
   - *Example:* Buy 3+ Cases of Tata Tea Gold 500g $\to$ Get 4% Off.
3. **Flat Cash Rebates (`FLAT_REBATE`):**
   - *Example:* Fortune Sunflower 1L Pouch: Flat ₹40 rebate per case on 5+ cases.
   - *Example:* Everest Garam Masala: Flat ₹50 rebate per case on 2+ cases.
4. **Non-Promotional Everyday Low Price (`NONE`):**
   - High-demand staples with tight distributor margins (Tata Salt, Rin Bar, Nescafe).

---

## 3. Realistic WhatsApp & Call Order Dataset (`datasets/realistic-orders.ts`)

A curated collection of 9 realistic ordering scenarios encountered daily in Jabalpur:

| Scenario ID | Communication Type | Distinctive Real-World Characteristic | Expected Guardrail / Outcome |
| :--- | :--- | :--- | :--- |
| **Scenario 1** | Daily WhatsApp Order | Mixed Hinglish, pleasantries ("bhaiya order likho"), vernacular nicknames ("pila wala", "shakti chai") | **AUTO_CONFIRM ($P \ge 0.90$)**; greeting headers & footers automatically stripped |
| **Scenario 2** | The "Dabba" Polysemy | Shopkeeper wrote "2 dabba fortune tel" & "3 dabba parle g" | **Invariant [A16] Guardrail triggered**: $P \le 0.70$, routes to 1-tap disambiguation card |
| **Scenario 3** | Broken Case / Cut Packs | Rural shopkeeper asks for "case of 20 mai se 15 dedo" | **Invariant [A36] Guardrail triggered**: flags `BROKEN_CASE`, offers loose pack vs full case |
| **Scenario 4** | Regional Vernacular Weights | Uses local multipliers: "aadha peti" (0.5), "derh peti" (1.5), "do darjan" (24 packs) | Multipliers computed mathematically ($0.5$, $1.5$, $24$) |
| **Scenario 5** | Rural Devanagari Script | Pure Hindi text with Devanagari numerals ("५ पेटी पीला वाला", "२ पेटी घड़ी पाउडर") | Converted to Arabic digits and matched to catalog SKUs |
| **Scenario 6** | Spoken Phone Call Audio Transcript | Run-on speech-to-text with hesitations ("hello bhaiya suniye... arey ramesh bol raha hu...") | Conversational noise stripped; exact products and case counts isolated |
| **Scenario 7** | Missing Packaging Unit | "5 dettol sabun", "10 maggi packet" | **MISSING_UNIT / BROKEN_CASE** card triggered; never assumes case vs loose pack |
| **Scenario 8** | Out-of-Catalog Items | "3 peti cycle tyre tube", "2 peti motorcycle spark plug" | **Zero hallucination rejection**: routed to `UNKNOWN_SKU` with $P \le 0.15$ |
| **Scenario 9** | 10-Item Wholesale Bulk Order | Dense multi-category wholesale parchi covering biscuits, tea, oil, soap, and paste | All 10 lines parsed with **$P \ge 0.95$ and zero false positives** |

---

## 4. Automated Verification (`catalogue/__tests__/realistic-orders.test.ts`)

Run the test suite directly:
```bash
npx vitest run "catalogue/__tests__/realistic-orders.test.ts"
```
- **9 / 9 Scenarios passing (100% success rate)**
- Validates the 5-Tier Adaptive Architecture against real-world kirana ordering behavior.
