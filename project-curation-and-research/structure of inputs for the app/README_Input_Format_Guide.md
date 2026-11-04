# Input Structure & Catalogue Master Sheet Guide

This directory contains the standard input templates and sample dummy sheets used by distributors and retailers to onboard or update products, wholesale pricing, physical inventory, and trade promotional schemes in the system.

---

## 1. Directory Contents

| File Name | Format | Target Screen / Module | Description |
| :--- | :--- | :--- | :--- |
| **`catalogue_template_dummy.xlsx`** | Excel Workbook (`.xlsx`) | Screen 9 (`/setup`), Module 2 | Ready-to-import Excel sheet populated with 10 realistic FMCG products across 7 categories and 4 scheme models. |
| **`catalogue_template_dummy.csv`** | CSV (`.csv`) | Screen 9 (`/setup`), Module 2 | Lightweight plain-text CSV version of the catalogue master with identical headers and data. |
| **`retailers_template_dummy.csv`** | CSV (`.csv`) | Screen 9 (`/setup`), Module 1 | Sample retailer customer directory (Shop Name, Owner, 10-digit mobile, delivery beat, credit limit, and current balance). |
| **`master_distributor_template_dummy.xlsx`** | Excel Workbook (`.xlsx`) | Screen 9 (`/setup`) | Comprehensive two-sheet workbook (`SKUs` sheet + `Retailers` sheet) to ingest the entire distributor operation in 1 click. |
| **`README_Input_Format_Guide.md`** | Markdown Documentation | Developer & User Reference | Complete data dictionary, header synonym map, and scheme syntax rules. |

---

## 2. Catalogue (SKUs) Data Dictionary

The ingestion engine in [`src/lib/excel/importer.ts`](file:///V:/Projects/Resume%20Projects/IsoLabs/distributor-app/src/lib/excel/importer.ts) is **tolerant to column synonyms** (`[A32]`), meaning you do not need to follow a rigid naming convention.

| Column Header | Accepted Synonyms | Data Type | Required? | Default Value | Description & FMCG Domain Context |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`Code`** | `SKU Code`, `Item Code`, `Product Code` | String | Optional | Auto-generated (`SKU-XXXX-1`) | Unique stock keeping unit code (e.g. `SKU-BS-075`). |
| **`Name`** | `Item Name`, `Product Name`, `Description`, `Product` | String | **Required** | None | Full commercial item title including pack size and case configuration (e.g. `Glucose biscuit 75 g, case of 96`). |
| **`Brand`** | `Company`, `Manufacturer`, `Make` | String | Optional | `"General"` | Brand name (e.g. `Parle`, `Ghadi`, `Wagh Bakri`, `Britannia`). Used for instant brand filter pills on `/catalogue`. |
| **`Category`** | `Group`, `Family`, `Product Group` | String | Optional | `"General"` | Category grouping (e.g. `Biscuits`, `Detergents`, `Tea & Beverages`). Used by the NLP search engine. |
| **`PackSize`** | `Size`, `Weight`, `UOM` | String | Optional | `"1 Unit"` | Net consumer packet weight/volume (e.g. `75 g`, `1 kg`, `250 g`, `1 L`). |
| **`UnitsPerCase`** | `CasePack`, `Units/Case`, `Packs Per Case` | Integer | Optional | `1` | Number of consumer packets in one sealed master carton (e.g. `96`). Drives dual-stepper loose packet calculations (`[A42]`). |
| **`DealerPrice`** | `Wholesale Rate`, `Case Price`, `Rate`, `Price` | Decimal | **Required** | None | **Ex-GST wholesale price per master case** (e.g. `₹777.60`). Primary billing unit for distributor invoices (`[A1]`). |
| **`StockCases`** | `Stock`, `Inventory`, `Available Cases`, `Qty` | Integer | Optional | `50` | Physical stock of full cases available in the Jabalpur warehouse. Setting to `0` marks the item as **Out of Stock** (`[A9]`). |
| **`GstRate`** | `GST`, `Tax Rate`, `GST %` | Decimal | Optional | `18.0` | Applicable Indian GST tax rate percentage (`5`, `12`, `18`, `28`). Split 50/50 into CGST and SGST (`[A2]`). |
| **`HsnCode`** | `HSN`, `Tax Code` | String | Optional | `"00000000"` | 8-digit Indian HSN tax classification code for Tally sales vouchers (`[A21]`). |
| **`SchemeType`** | `Scheme`, `Offer`, `Promotion` | String | Optional | `"NONE"` | Active promotional model: `NONE`, `FREE_GOODS`, `SLAB_DISCOUNT`, or `FLAT_REBATE`. |
| **`SchemeDescription`**| `Offer Details`, `Scheme Note` | String | Optional | `""` | Human-readable explanation shown in promotional badges on the mobile catalogue. |
| **`BuyQty`** | `Buy Quantity`, `Threshold` | Integer | Optional | `0` | Number of cases the retailer must purchase to qualify for free bonus cases (e.g. `10`). |
| **`GetFreeQty`** | `Free Qty`, `Free Cases` | Integer | Optional | `0` | Number of bonus cartons unlocked at threshold (e.g. `1`). |
| **`FreeSkuId`** | `Free Item Code`, `Gift SKU` | String | Optional | None | Cross-SKU gifting: SKU Code of secondary promotional gift item (Circular 92/11/2019-GST composite supply, `[A46]`). |
| **`FreeSkuName`** | `Free Item Name`, `Gift Product` | String | Optional | None | Title of the secondary gifted item. |
| **`MinCases`** | `Min Qty`, `Slab Cases` | Integer | Optional | `0` | Minimum case volume required to trigger a percentage discount or flat cash rebate (e.g. `5`). |
| **`DiscountPct`** | `Discount %`, `Discount` | Decimal | Optional | `0.0` | Single-tier discount percentage applied pre-tax across qualifying gross amount (`[A12]`). |
| **`Tiers`** | `Multi-Tier Ladder`, `Ladder` | String | Optional | None | Progressive slab ladder syntax: `"5:3%, 10:5%, 20:8%"` (`[A45]`). |
| **`FlatPerCase`** | `Cash Discount`, `Rebate/Case` | Decimal | Optional | `0` | Flat cash rupee deduction per case (e.g. `50` = ₹50/case off, `[A47]`). |

---

## 3. Scheme Syntax & Calculation Rules

The system's calculation engine ([`src/lib/schemes/engine.ts`](file:///V:/Projects/Resume%20Projects/IsoLabs/distributor-app/src/lib/schemes/engine.ts)) interprets scheme columns as follows:

### 1. Free Goods Scheme (Buy X Get Y Free)
- **Sheet Setup:**
  - `SchemeType`: `FREE_GOODS`
  - `BuyQty`: `10`
  - `GetFreeQty`: `1`
  - `SchemeDescription`: `"Buy 10 cases get 1 free"`
- **Calculation Formula (`[A11]`):**
  $$\text{Free Cases} = \left\lfloor \frac{\text{Ordered Cases}}{\text{BuyQty}} \right\rfloor \times \text{GetFreeQty}$$
  - Ordering 10 cases unlocks 1 free case.
  - Ordering 25 cases unlocks 2 free cases (repeating stepped floor division).
  - Free goods are delivered at ₹0.00 composite supply and **consume physical warehouse stock** (`[A30]`).

### 2. Multi-Tier Progressive Slab Ladders
- **Sheet Setup:**
  - `SchemeType`: `SLAB_DISCOUNT`
  - `Tiers`: `"5:3%, 10:5%, 20:8%"`
  - `SchemeDescription`: `"5cs=3%, 10cs=5%, 20cs=8%"`
- **Calculation Formula (`[A45]`):**
  - Evaluates tiers in descending order: 20 cases gets 8%, 10 cases gets 5%, 5 cases gets 3%.
  - The highest qualifying tier applies across the **entire gross amount** of that SKU.
  - The UI calculates live upsell nudges: *"Add 2 more cases for 5% discount!"* (`[A48]`).

### 3. Flat Per-Case Cash Rebates
- **Sheet Setup:**
  - `SchemeType`: `FLAT_REBATE`
  - `MinCases`: `5`
  - `FlatPerCase`: `50`
  - `SchemeDescription`: `"Flat ₹50 cash rebate per case on 5+ cases"`
- **Calculation Formula (`[A47]`):**
  $$\text{Discount Amount} = \text{Ordered Cases} \times \text{FlatPerCase}$$
  Applied strictly pre-tax to reduce taxable value before CGST and SGST splits.

### 4. Cross-SKU Free Goods Gifting
- **Sheet Setup:**
  - `SchemeType`: `FREE_GOODS`
  - `BuyQty`: `10`
  - `GetFreeQty`: `2`
  - `FreeSkuId`: `SKU-BS-075`
  - `FreeSkuName`: `"Glucose biscuit 75 g"`
  - `SchemeDescription`: `"Buy 10 cases Detergent -> Get 2 cases Biscuit Free"`
- **Calculation Formula (`[A46]`):**
  - Unlocks bonus stock delivered under the secondary SKU ID (`SKU-BS-075`) with ₹0 taxable liability under GST composite supply rules.

---

## 4. Retailers (Customer Master) Data Dictionary

| Column Header | Accepted Synonyms | Data Type | Required? | Default Value | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`Id`** | `Retailer Id`, `Account No` | String | Optional | Auto (`RET-1800+`) | Unique distributor retailer identifier (e.g. `RET-0001`). |
| **`ShopName`** | `Store Name`, `Retailer`, `Firm Name` | String | **Required** | None | Trade business name (e.g. `Sharma Kirana Store`). |
| **`OwnerName`** | `Proprietor`, `Contact Person` | String | Optional | Shop Name | Full legal name of shop owner. |
| **`Phone`** | `Mobile`, `Contact Number` | 10 Digits | **Required** | None | 10-digit Indian mobile number (`9826000001`) used for OTP login (`[A3]`, `[A28]`). |
| **`Address`** | `Location`, `Market`, `Address` | String | Optional | `"Jabalpur"` | Physical shop delivery address in Jabalpur. |
| **`Route`** | `Beat`, `Delivery Route`, `Van Beat` | String | Optional | `"Napier Town Route #4"` | Salesman delivery beat used for Van Loading Manifests (`[A22]`). |
| **`CreditLimit`** | `Limit`, `Credit Ceiling` | Decimal | Optional | `50000` | Approved B2B trade credit limit in INR (₹). Exceeding this triggers `CREDIT_HOLD` (`[A14]`). |
| **`CurrentBalance`** | `Outstanding`, `Balance`, `Due` | Decimal | Optional | `0` | Active unpaid ledger receivables balance from Tally ERP. |

---

## 5. How to Ingest a Sheet into the Live Application

1. **Open the Master Setup Hub:**
   - In your browser, navigate to:  
     `http://localhost:3000/setup`
2. **Upload Your Sheet:**
   - Drag & drop either `catalogue_template_dummy.xlsx` or `catalogue_template_dummy.csv` into the upload zone (or click to browse).
3. **Inspect the Data Table:**
   - The setup page parses items in real-time, displaying prices, case packs, calculated loose pack rates, and recognized scheme rules.
4. **Click "Apply to Active Database":**
   - The system validates row integrity, updates the live catalogue in memory and database, and displays a success notification.
5. **Verify Live Ordering:**
   - Navigate to `/catalogue`: your newly uploaded products, schemes, and dual steppers are immediately available for shopkeepers to order!
