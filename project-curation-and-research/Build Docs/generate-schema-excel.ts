import * as fs from "fs";
import * as path from "path";
import * as XLSX from "../../distributor-app/node_modules/xlsx";

// 1. Load Master Seed Catalog and Retailers
const masterCatalogPath = path.resolve(__dirname, "../../distributor-app/src/db/master-catalog.json");
const masterCatalog = JSON.parse(fs.readFileSync(masterCatalogPath, "utf-8"));

const outputPath = path.resolve(__dirname, "IsoLabs_Database_Schema_And_Data_Movement_Specification.xlsx");

const wb = XLSX.utils.book_new();

// Helper to set column widths
function autoFitCols(aoa: any[][]) {
  const colWidths = aoa[0].map((_, colIdx) => {
    let maxLen = 10;
    for (let r = 0; r < Math.min(aoa.length, 50); r++) {
      const val = aoa[r][colIdx];
      if (val !== undefined && val !== null) {
        const str = String(val);
        if (str.length > maxLen) maxLen = Math.min(str.length, 60);
      }
    }
    return { wch: maxLen + 2 };
  });
  return colWidths;
}

function createSheet(data: any[][], sheetName: string) {
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = autoFitCols(data);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

// =========================================================================
// SHEET 0: Data Movement Lifecycle & Architecture Pipeline Map
// =========================================================================
const sheet0 = [
  ["ISOLABS DATA MOVEMENT LIFECYCLE & ARCHITECTURE PIPELINE MAP"],
  ["Stage", "Pipeline Phase", "Source Component", "Destination Component", "Data Model / Schema Contract", "Key Rules & Invariants", "Trigger / Event Flow"],
  [
    "01",
    "Catalog & Retailer Onboarding",
    "Admin Excel Sheet / Master JSON",
    "PostgreSQL (Neon) / dbStore",
    "skus, retailers, retailer_aliases",
    "HSN Code, GST % (5/18), Scheme Rules [A11, A12, A45], 36 FMCG SKUs",
    "Admin imports custom Excel on /setup or system bootstraps initial seed data"
  ],
  [
    "02",
    "Kirana Auth & Single-Writer Lock",
    "Kirana Mobile / Desk Login",
    "auth_token JWT, active_sessions, otps",
    "ActiveSession, StoredOtp, JWT Payload",
    "Rule [A49]: Single-writer lock blocks concurrent sessions (HTTP 409). Master OTP 123456 auto-provisions [A64]",
    "Retailer requests SMS OTP -> verifies code -> acquires session lock in memory & Neon"
  ],
  [
    "03",
    "Multi-Modal Order Intake",
    "WhatsApp / Quick-Order UI",
    "MultiModal Adapter (/api/capture/parse-text)",
    "RawCapturePayload (Audio, Photo, Text)",
    "Rule [A60]: Canvas client compression downscales 8MB to ~120KB. Rule [A58]: Vaani ASR transcribes MP Hindi",
    "Retailer submits voice note, camera slip, or typed Hinglish text"
  ],
  [
    "04",
    "5-Tier Adaptive AI Parser",
    "Raw Utterance / OCR Text",
    "ParsedLineItem[] (/quick-order)",
    "ParsedLineItem, SkuCandidate, BrokenCaseInfo",
    "Rule [A16]: Ask Never Guess. Tier 0 Alias lookup, Tier 1 Grammar, Tier 2 RRF, Tier 3 Logistic sigmoid, Tier 4 Gemini closed-set [A59]",
    "Parser cascades through deterministic tiers; escalates to Gemini chooser if score >= 0.15 with strict 100-token cap"
  ],
  [
    "05",
    "FMCG Trade Scheme Engine",
    "Active Cart Lines",
    "Universal Scheme Engine (engine.ts)",
    "InputLineItem -> CalculatedLineItem & Summary",
    "Rule [A2]: MP Intra-state 50/50 GST split. Rule [A11]: Buy 10 Get 1 free goods. Rule [A12]: Slab discounts. Rule [A13]: Non-compounding",
    "Cart recalculates in real-time as merchant adjusts dual cases/packs steppers"
  ],
  [
    "06",
    "Order Checkout & Inventory Lock",
    "Kirana Cart (/cart)",
    "orders & order_items (dbStore & Neon)",
    "StoredOrder, StoredOrderItem, freeGoodsTally",
    "Rule [A14]: Credit limit check triggers CREDIT_HOLD if exceeded. Rule [A15]: Atomic warehouse stock reservation",
    "Merchant taps 'Place Order' -> validates credit headroom -> creates order record -> deducts stock"
  ],
  [
    "07",
    "Live Stock Synchronization",
    "Warehouse Stock Decrement",
    "All Active Storefronts & Carts",
    "LiveStockEvent, BroadcastChannel, SSE Stream",
    "Rule [A52]: Movie ticket booking style live inventory sync. Rule [A63]: Real-time catalog parity on reset",
    "Checkout broadcasts stock version over SSE (/api/catalogue/live-stock) and local BroadcastChannel"
  ],
  [
    "08",
    "Desk Triage & OCC Concurrency",
    "Order Desk Clerk (/desk)",
    "orders table status transition",
    "DeskOrderUpdateRequest, StoredAlias",
    "Rule [A19]: OCC Version locking rejects stale concurrent edits (HTTP 409). Rule [A20]: Alias auto-learning",
    "Clerk verifies split-screen order -> updates lines -> OCC version increments -> learned aliases saved"
  ],
  [
    "09",
    "Delivery Van Manifest Logistics",
    "Verified Orders",
    "Van Manifest Tab (/desk)",
    "VanRouteManifest, VanPickItem, VanDeliveryStop",
    "Rule [A22]: Route grouping, warehouse SKU pick totals (paid + free cases), total weight kg, vehicle payload check",
    "Warehouse supervisor selects beat (e.g. Wright Town #2) -> generates driver dispatch sheet"
  ],
  [
    "10",
    "Tally ERP 9 / Prime XML Export",
    "Verified Orders Queue",
    "Tally Prime / ERP 9 Accounting Bridge",
    "TallyOrderEntry -> Tally XML Envelope",
    "Rule [A21, A39, A40]: Compliant <ENVELOPE>, Actual vs Billed Qty, Double-entry balanced ledger signs, Output CGST/SGST",
    "Clerk clicks 'Download Tally XML Batch' -> marks orders as EXPORTED_TALLY -> imports via Alt+O in Tally"
  ],
  [
    "11",
    "Dormant Kirana Retention Engine",
    "Retailers & Orders History",
    "Dormant Kiranas Tab (/desk)",
    "DormantRetailerRecord, ChurnRiskTier",
    "Rule [A23, A43, A44]: 14-day inactivity filter, churn risk scoring, pre-filled Hindi WhatsApp re-engagement link",
    "Background query identifies dormant stores -> displays Hindi promo WhatsApp nudge with 1-tap deep link"
  ]
];
createSheet(sheet0, "00_Data_Flow_Lifecycle");

// =========================================================================
// SHEET 1: Catalogue SKUs Master Schema & Data
// =========================================================================
const sheet1 = [
  ["CATALOGUE SKUS MASTER SCHEMA & DATA SPECIFICATION"],
  ["Field Name", "Data Type", "Constraint", "Nullable", "Default", "Description & Validation Rules", "Sample Value"],
  ["id", "VARCHAR(36)", "PRIMARY KEY", "NO", "UUID/String", "Unique internal SKU identifier (e.g. SKU-BS-075)", "SKU-BS-075"],
  ["code", "VARCHAR(50)", "UNIQUE", "NO", "None", "Wholesale trade product code used in EDI and barcode", "SKU-BS-075"],
  ["name", "TEXT", "NOT NULL", "NO", "None", "Complete English SKU trade name with pack size & case count", "Parle-G Glucose Biscuits 75g (Case of 96)"],
  ["nameHi", "TEXT", "OPTIONAL", "YES", "NULL", "Devanagari Hindi transliterated name for vernacular Kirana UI", "पारले-जी ग्लूकोज बिस्कुट 75 ग्राम"],
  ["brand", "TEXT", "NOT NULL", "NO", "None", "FMCG Manufacturer or brand family", "Parle"],
  ["brandHi", "TEXT", "OPTIONAL", "YES", "NULL", "Devanagari Hindi brand name", "पारले"],
  ["category", "TEXT", "NOT NULL", "NO", "None", "Trade category (Biscuits, Detergents, Edible Oil, Tea, etc.)", "Biscuits & Confectionery"],
  ["categoryHi", "TEXT", "OPTIONAL", "YES", "NULL", "Devanagari Hindi trade category", "बिस्कुट व कन्फेक्शनरी"],
  ["packSize", "TEXT", "NOT NULL", "NO", "None", "Single consumer packet weight/volume (e.g. 75g, 1kg, 1L)", "75g"],
  ["packSizeHi", "TEXT", "OPTIONAL", "YES", "NULL", "Devanagari Hindi pack size", "75 ग्राम"],
  ["unitsPerCase", "INTEGER", "CHECK (>0)", "NO", "1", "Master case packaging capacity (number of packets in 1 carton)", "96"],
  ["dealerPrice", "NUMERIC(10,2)", "CHECK (>=0)", "NO", "0.00", "Wholesale dealer purchase price per master case ex-tax", "777.60"],
  ["packPrice", "NUMERIC(10,2)", "CHECK (>=0)", "NO", "0.00", "Single loose packet wholesale price ex-tax", "8.10"],
  ["mrp", "NUMERIC(10,2)", "CHECK (>0)", "NO", "None", "Maximum Retail Price printed on consumer pack", "10.00"],
  ["stockCases", "INTEGER", "CHECK (>=0)", "NO", "0", "Current live warehouse available inventory in master cases", "340"],
  ["hsnCode", "VARCHAR(20)", "NOT NULL", "NO", "None", "Harmonized System Nomenclature code for GST reporting", "19053100"],
  ["gstRate", "NUMERIC(5,2)", "CHECK (in 0,5,12,18,28)", "NO", "18.00", "Applicable GST tax percentage (Rule [A2] splits 50/50)", "18.00"],
  ["schemeType", "VARCHAR(30)", "ENUM", "NO", "NONE", "Promotional scheme type: NONE, FREE_GOODS, SLAB_DISCOUNT, FLAT_REBATE", "FREE_GOODS"],
  ["schemeDetail_JSON", "JSONB", "OPTIONAL", "YES", "NULL", "JSON configuration: buyQty, getFreeQty, minCases, discountPct, flatPerCase", "{\"buyQty\": 10, \"getFreeQty\": 1}"],
  ["aliases_JSON", "JSONB", "OPTIONAL", "YES", "[]", "Colloquial Mandi synonyms, phonetic spellings, and trade slang", "[\"chhota parle\", \"glucose biscuit\", \"biscuit chhota\"]"],
  ["active", "BOOLEAN", "NOT NULL", "NO", "TRUE", "Whether the SKU is actively available for ordering", "TRUE"],
  [],
  ["SAMPLE CATALOGUE MASTER RECORDS (ACTUAL SEED DATA)"],
  ["SKU ID", "Code", "Brand", "Product Name", "Category", "Pack Size", "Units/Case", "Dealer Case Price", "MRP", "Stock Cases", "HSN Code", "GST %", "Scheme Type", "Scheme Detail"]
];

for (const s of masterCatalog) {
  sheet1.push([
    s.id,
    s.code || s.id,
    s.brand,
    s.name,
    s.category,
    s.packSize,
    s.unitsPerCase || s.packaging?.unitsPerCase || 1,
    s.dealerPrice,
    s.mrp || (s.dealerPrice / (s.unitsPerCase || 1) * 1.25),
    s.stockCases,
    s.hsnCode,
    s.gstRate,
    s.schemeType,
    JSON.stringify(s.schemeDetail || {})
  ]);
}
createSheet(sheet1, "01_Catalogue_SKU_Master");

// =========================================================================
// SHEET 2: Retailer Master (Kiranas)
// =========================================================================
const SEED_RETAILERS_DATA = [
  { id: "RET-0001", name: "Sharma Kirana Store", nameHi: "शर्मा किराना स्टोर", owner: "Ramesh Sharma", ownerHi: "रमेश शर्मा", phone: "9826000001", address: "Shop 14, Main Road, Napier Town, Jabalpur", route: "Napier Town Route #4", creditLimit: 50000, currentBalance: 12450, hold: false, gst: "23AABCS1429B1Z1" },
  { id: "RET-0002", name: "Verma General & Provision", nameHi: "वर्मा जनरल व प्रोविजन", owner: "Suresh Verma", ownerHi: "सुरेश वर्मा", phone: "9826000002", address: "Gorakhpur Market, Near Gurudwara, Jabalpur", route: "Wright Town Route #2", creditLimit: 45000, currentBalance: 8500, hold: false, gst: "23AADCV5512D1Z4" },
  { id: "RET-0003", name: "Gupta Daily Needs", nameHi: "गुप्ता डेली नीड्स", owner: "Dinesh Gupta", ownerHi: "दिनेश गुप्ता", phone: "9826000003", address: "Civic Centre, Shop 8, Jabalpur", route: "Wright Town Route #2", creditLimit: 60000, currentBalance: 0, hold: false, gst: "23AABCG9981K1Z9" },
  { id: "RET-0004", name: "Agrawal Super Bazaar", nameHi: "अग्रवाल सुपर बाजार", owner: "Manoj Agrawal", ownerHi: "मनोज अग्रवाल", phone: "9826000004", address: "Garha Main Market, Near Medical College, Jabalpur", route: "Garha Route #5", creditLimit: 80000, currentBalance: 24300, hold: false, gst: "23AABCA3312E1Z2" },
  { id: "RET-0005", name: "Patel Kirana Kendra", nameHi: "पटेल किराना केंद्र", owner: "Kishore Patel", ownerHi: "किशोर पटेल", phone: "9826000005", address: "Adhartal Chowk, Jabalpur", route: "Adhartal Route #1", creditLimit: 40000, currentBalance: 39500, hold: true, gst: "23AADCP8872M1Z8" },
  { id: "RET-0006", name: "Jain Provision Store", nameHi: "जैन प्रोविजन स्टोर", owner: "Pradeep Jain", ownerHi: "प्रदीप जैन", phone: "9826000006", address: "Lordganj Bada Fuhara, Jabalpur", route: "Fuhara Route #3", creditLimit: 55000, currentBalance: 5000, hold: false, gst: "23AABCJ1102P1Z0" },
  { id: "RET-0007", name: "Mishra Daily Mart", nameHi: "मिश्रा डेली मार्ट", owner: "Rajesh Mishra", ownerHi: "राजेश मिश्रा", phone: "9826000007", address: "Ranjhi Main Road, Jabalpur", route: "Ranjhi Route #6", creditLimit: 35000, currentBalance: 32000, hold: false, gst: "23AABCM7721L1Z3" },
  { id: "RET-0008", name: "Kisan Wholesale Kirana", nameHi: "किसान थोक किराना", owner: "Omkar Singh", ownerHi: "ओंकार सिंह", phone: "9826000008", address: "Krishi Upaj Mandi, Vijay Nagar, Jabalpur", route: "Vijay Nagar Route #7", creditLimit: 100000, currentBalance: 15000, hold: false, gst: "23AADCK9914N1Z5" }
];

const sheet2 = [
  ["RETAILER MASTER SCHEMA & DATA SPECIFICATION (KIRANA STORES)"],
  ["Field Name", "Data Type", "Constraint", "Nullable", "Default", "Description & Validation Rules", "Sample Value"],
  ["id", "VARCHAR(36)", "PRIMARY KEY", "NO", "RET-XXXX", "Unique Retailer ID assigned by distributor", "RET-0001"],
  ["name", "TEXT", "NOT NULL", "NO", "None", "Registered trading name of the Kirana store", "Sharma Kirana Store"],
  ["nameHi", "TEXT", "OPTIONAL", "YES", "NULL", "Devanagari Hindi name for vernacular UI", "शर्मा किराना स्टोर"],
  ["ownerName", "TEXT", "NOT NULL", "NO", "None", "Full name of the shopkeeper / proprietor", "Ramesh Sharma"],
  ["ownerNameHi", "TEXT", "OPTIONAL", "YES", "NULL", "Devanagari Hindi owner name", "रमेश शर्मा"],
  ["phone", "VARCHAR(15)", "UNIQUE", "NO", "None", "10-digit mobile number used for SMS OTP login", "9826000001"],
  ["address", "TEXT", "NOT NULL", "NO", "None", "Physical shop delivery address in Jabalpur", "Shop 14, Main Road, Napier Town, Jabalpur"],
  ["route", "TEXT", "NOT NULL", "NO", "None", "Assigned sales beat & delivery route for van logistics", "Napier Town Route #4"],
  ["creditLimit", "NUMERIC(12,2)", "CHECK (>=0)", "NO", "50000.00", "Maximum credit exposure allowed by distributor", "50000.00"],
  ["currentBalance", "NUMERIC(12,2)", "CHECK (>=0)", "NO", "0.00", "Current unpaid ledger balance owed to distributor", "12450.00"],
  ["availableCredit", "NUMERIC(12,2)", "COMPUTED", "NO", "creditLimit - currentBalance", "Remaining credit headroom before order goes to CREDIT_HOLD", "37550.00"],
  ["creditHold", "BOOLEAN", "NOT NULL", "NO", "FALSE", "Admin flag to stop billing when balance breaches credit limit", "FALSE"],
  ["gstNumber", "VARCHAR(15)", "OPTIONAL", "YES", "NULL", "15-character GSTIN for B2B tax invoice and Tally sync", "23AABCS1429B1Z1"],
  ["active", "BOOLEAN", "NOT NULL", "NO", "TRUE", "Active status in distributor beat system", "TRUE"],
  [],
  ["SAMPLE RETAILER MASTER RECORDS (ACTUAL SEED DATA)"],
  ["Retailer ID", "Store Name", "Store Name (Hindi)", "Owner Name", "Phone", "Delivery Route / Beat", "Credit Limit (₹)", "Current Balance (₹)", "Available Credit (₹)", "Credit Hold?", "GSTIN"]
];

for (const r of SEED_RETAILERS_DATA) {
  sheet2.push([
    r.id,
    r.name,
    r.nameHi,
    r.owner,
    r.phone,
    r.route,
    r.creditLimit,
    r.currentBalance,
    r.creditLimit - r.currentBalance,
    r.hold ? "YES (BLOCKED)" : "NO (ACTIVE)",
    r.gst
  ]);
}
createSheet(sheet2, "02_Retailer_Master");

// =========================================================================
// SHEET 3: MultiModal Raw Capture Intake Schema
// =========================================================================
const sheet3 = [
  ["MULTIMODAL RAW CAPTURE INTAKE SCHEMA SPECIFICATION"],
  ["Field Name", "Data Type", "Constraint", "Nullable", "Default", "Description & Validation Rules", "Sample Value"],
  ["id", "VARCHAR(36)", "PRIMARY KEY", "NO", "UUID", "Unique intake transaction capture ID", "cap_9841fba2"],
  ["retailerId", "VARCHAR(36)", "FOREIGN KEY", "NO", "None", "Retailer ID placing the order", "RET-0001"],
  ["source", "VARCHAR(20)", "ENUM", "NO", "text", "Intake channel: text, image (photo), or audio (voice note)", "audio"],
  ["rawPayload", "TEXT", "NOT NULL", "NO", "None", "Raw transcribed text, OCR extracted text, or WhatsApp string", "bhaiya 5 peti biscuit chhota, 2 peti ghadi powder 1 kg"],
  ["mediaUrl", "TEXT", "OPTIONAL", "YES", "NULL", "Path or URL of uploaded audio file (.mp3) or image (.jpeg/.png)", "/uploads/voice_9826000001_1794.mp3"],
  ["mediaSizeKB", "NUMERIC(10,2)", "CHECK (>0)", "YES", "NULL", "Payload size in KB after client-side Canvas compression [A60]", "124.50"],
  ["dialect", "VARCHAR(30)", "OPTIONAL", "YES", "mandi_hindi", "Detected dialect: mandi_hindi, baghelkhandi, hinglish", "mandi_hindi"],
  ["status", "VARCHAR(30)", "ENUM", "NO", "PENDING_REVIEW", "Intake status: PENDING_REVIEW, CONFIRMED, DISCARDED", "CONFIRMED"],
  ["createdAt", "TIMESTAMPTZ", "NOT NULL", "NO", "NOW()", "Timestamp of intake receipt at distributor server", "2026-11-08T10:15:30Z"],
  [],
  ["SAMPLE INTAKE RECORDS ACROSS ALL 3 CHANNELS"],
  ["Capture ID", "Retailer ID", "Channel Source", "Raw Input Utterance / OCR Text", "Media URL", "Size (KB)", "Dialect", "Status"]
];

sheet3.push(
  [
    "cap_001_txt",
    "RET-0001",
    "text",
    "bhaiya 5 peti biscuit chhota, 2 peti ghadi powder 1 kg",
    "NULL",
    "0.05",
    "hinglish",
    "CONFIRMED"
  ],
  [
    "cap_002_aud",
    "RET-0002",
    "audio",
    "भैया दस पैकेट पारले जी, पाँच कट्टी आटा 5 किलो, दो पेटी विम बार, एक पेटी सर्फ एक्सेल 1 किलो भेज देना",
    "/samples/jabalpur_mandi_order.mp3",
    "148.20",
    "mandi_hindi (Vaani ASR [A58])",
    "CONFIRMED"
  ],
  [
    "cap_003_img",
    "RET-0004",
    "image",
    "कनकी 2kg, सर्फ 1kg, बेसन 1/2kg, चने की दाल 1/2kg, मसरी की दाल 1/2kg, राजमा 1/2kg, जीरा 100g, हल्दी 100g, बर्तन की साबुन 2 packet, कोलगेट 4 packet, नहाने की साबुन 1 packet",
    "/samples/kirana_slip_sample.png",
    "118.40",
    "handwritten_hindi_parchi (Canvas Compressed [A60])",
    "CONFIRMED"
  ]
);
createSheet(sheet3, "03_Raw_Capture_Intake");

// =========================================================================
// SHEET 4: AI Parsed Line Items Schema
// =========================================================================
const sheet4 = [
  ["AI PARSER LINE ITEMS SCHEMA SPECIFICATION (5-TIER PIPELINE OUTPUT)"],
  ["Field Name", "Data Type", "Constraint", "Nullable", "Default", "Description & Validation Rules", "Sample Value"],
  ["id", "VARCHAR(36)", "PRIMARY KEY", "NO", "UUID", "Unique line item parse identifier", "line_4eaf5ade"],
  ["captureId", "VARCHAR(36)", "OPTIONAL", "YES", "NULL", "Parent raw capture ID", "cap_001_txt"],
  ["rawUtterance", "TEXT", "NOT NULL", "NO", "None", "Segmented line item string from multi-line text splitter", "5 peti biscuit chhota"],
  ["extractedQty", "INTEGER", "CHECK (>0)", "YES", "1", "Parsed quantity extracted from Devanagari/Hinglish numerals", "5"],
  ["extractedUnit", "VARCHAR(20)", "ENUM", "NO", "UNKNOWN", "Unit: CASE, PACK, KG, UNIT, DABBA, UNKNOWN", "CASE"],
  ["matchedSkuId", "VARCHAR(36)", "FOREIGN KEY", "YES", "NULL", "Matched SKU ID from master catalog (NULL if UNKNOWN_SKU)", "SKU-BS-075"],
  ["matchedSkuCode", "VARCHAR(50)", "OPTIONAL", "YES", "NULL", "Matched SKU Code", "SKU-BS-075"],
  ["confidence", "NUMERIC(4,2)", "RANGE [0.00, 1.00]", "NO", "0.00", "Calibrated confidence score via Platt logistic sigmoid", "0.98"],
  ["isAmbiguous", "BOOLEAN", "NOT NULL", "NO", "FALSE", "True if line requires disambiguation prompt or clerk review", "FALSE"],
  ["ambiguityReason", "VARCHAR(30)", "ENUM", "YES", "NULL", "Reason: MISSING_UNIT, AMBIGUOUS_UNIT, MULTIPLE_CANDIDATES, UNKNOWN_SKU, BROKEN_CASE", "NULL"],
  ["candidates_JSON", "JSONB", "OPTIONAL", "YES", "[]", "Ranked candidate SKUs with relevance scores >= 0.15 [A59]", "[{\"skuId\": \"SKU-BS-075\", \"score\": 0.99}]"],
  ["resolvedQtyCases", "INTEGER", "CHECK (>=0)", "NO", "1", "Final resolved master cases for warehouse pick list", "5"],
  ["resolvedQtyPacks", "INTEGER", "CHECK (>=0)", "NO", "0", "Loose packets ordered (Rule [A8] broken cases)", "0"],
  ["brokenCaseInfo_JSON", "JSONB", "OPTIONAL", "YES", "NULL", "Details if loose cut-pack ordered: requestedPacks, fullCaseRoundUp, loosePrice", "NULL"],
  ["reasoning", "TEXT", "OPTIONAL", "YES", "NULL", "Short explanation (<8 words if LLM escalated) [A59]", "Exact match on auto-learned alias 'biscuit chhota'"],
  ["source", "VARCHAR(20)", "ENUM", "NO", "rules", "Engine source: rules (Tiers 0-3), gemini (Tier 4 LLM), fallback", "rules"],
  [],
  ["SAMPLE PARSER OUTPUT ROWS (DEMONSTRATING ALL EDGE CASES)"],
  ["Line ID", "Raw Utterance", "Qty", "Unit", "Matched SKU Code", "Conf", "Ambiguous?", "Ambiguity Reason", "Resolved Cases", "Resolved Packs", "Source", "Reasoning"]
];

sheet4.push(
  [
    "line_01",
    "5 peti biscuit chhota",
    5,
    "CASE",
    "SKU-BS-075",
    0.98,
    "FALSE",
    "NULL",
    5,
    0,
    "rules (Tier 0 Alias)",
    "Exact match on auto-learned alias 'biscuit chhota'"
  ],
  [
    "line_02",
    "2 peti ghadi powder 1 kg",
    2,
    "CASE",
    "SKU-DT-1KG",
    0.99,
    "FALSE",
    "NULL",
    2,
    0,
    "rules (Tier 1 Grammar)",
    "Deterministic match on Ghadi Detergent 1kg"
  ],
  [
    "line_03",
    "10 packet chips",
    10,
    "PACK",
    "NULL",
    0.15,
    "TRUE",
    "UNKNOWN_SKU",
    10,
    0,
    "rules (Knowledge Graph)",
    "Item 'chips' is not in Company A catalog. Zero biscuits hallucinated."
  ],
  [
    "line_04",
    "5 dabba tel",
    5,
    "DABBA",
    "SKU-ED-FO1L",
    0.72,
    "TRUE",
    "AMBIGUOUS_UNIT",
    5,
    0,
    "rules (Packaging Guardrail [A16])",
    "Polysemic Dabba: Could mean 15kg Wholesale Tin or 12x1L Retail Master Carton"
  ],
  [
    "line_05",
    "40 packet maggi",
    40,
    "PACK",
    "SKU-FD-MG70",
    0.95,
    "TRUE",
    "BROKEN_CASE",
    0,
    40,
    "rules (Cut-Pack Engine [A8])",
    "Ordered 40 loose packs. Case capacity is 96. Round up to 1 full case or loose charge?"
  ],
  [
    "line_06",
    "5 peti butter biscuit",
    5,
    "CASE",
    "SKU-BS-GD120",
    0.85,
    "FALSE",
    "NULL",
    5,
    0,
    "gemini (Tier 4 LLM Chooser [A59])",
    "Matches Good Day Butter Cookies query (<8 words)."
  ]
);
createSheet(sheet4, "04_AI_Parser_Line_Items");

// =========================================================================
// SHEET 5: Scheme Engine Input Specification (InputLineItem)
// =========================================================================
const sheet5 = [
  ["SCHEME ENGINE INPUT SPECIFICATION (InputLineItem)"],
  ["Field Name", "Data Type", "Constraint", "Nullable", "Default", "Description & Calculation Rules", "Sample Value"],
  ["skuId", "VARCHAR(36)", "NOT NULL", "NO", "None", "Catalog SKU identifier", "SKU-BS-075"],
  ["skuCode", "VARCHAR(50)", "NOT NULL", "NO", "None", "Catalog SKU Code", "SKU-BS-075"],
  ["skuName", "TEXT", "NOT NULL", "NO", "None", "Catalog SKU trade name", "Parle-G Glucose Biscuits 75g (Case of 96)"],
  ["orderedCases", "INTEGER", "CHECK (>=0)", "NO", "0", "Whole wholesale master cases ordered", "10"],
  ["orderedPacks", "INTEGER", "CHECK (>=0)", "NO", "0", "Loose cut-packs ordered (Rule [A8])", "0"],
  ["dealerPrice", "NUMERIC(10,2)", "CHECK (>0)", "NO", "None", "Wholesale case price ex-GST", "777.60"],
  ["packPrice", "NUMERIC(10,2)", "CHECK (>0)", "YES", "dealerPrice / unitsPerCase", "Loose single packet price ex-GST", "8.10"],
  ["unitsPerCase", "INTEGER", "CHECK (>0)", "NO", "1", "Packets per master case", "96"],
  ["gstRate", "NUMERIC(5,2)", "CHECK (in 0,5,12,18,28)", "NO", "18.00", "GST tax percentage (split 50/50 intra-state MP)", "18.00"],
  ["schemeType", "VARCHAR(30)", "ENUM", "NO", "NONE", "Scheme: NONE, FREE_GOODS, SLAB_DISCOUNT, FLAT_REBATE", "FREE_GOODS"],
  ["schemeDetail", "OBJECT/JSON", "OPTIONAL", "YES", "{}", "Configuration: buyQty, getFreeQty, minCases, discountPct, tiers, flatPerCase", "{\"buyQty\": 10, \"getFreeQty\": 1}"],
  [],
  ["SAMPLE INPUT LINE ITEMS FOR CALCULATION"],
  ["SKU Code", "Product Name", "Ordered Cases", "Ordered Packs", "Dealer Case Price (₹)", "Pack Price (₹)", "Units/Case", "GST %", "Scheme Type", "Scheme Detail Config"]
];

sheet5.push(
  ["SKU-BS-075", "Parle-G Glucose Biscuits 75g (Case of 96)", 10, 0, 777.60, 8.10, 96, 18, "FREE_GOODS", "{\"buyQty\": 10, \"getFreeQty\": 1}"],
  ["SKU-BS-GD120", "Britannia Good Day Butter Cookies 120g (Case of 48)", 4, 0, 1344.00, 28.00, 48, 18, "SLAB_DISCOUNT", "{\"minCases\": 4, \"discountPct\": 5}"],
  ["SKU-DT-1KG", "Ghadi Detergent Powder 1kg (Case of 24)", 6, 0, 1440.00, 60.00, 24, 18, "FLAT_REBATE", "{\"minCasesForRebate\": 5, \"flatPerCase\": 50}"],
  ["SKU-TE-WBR250", "Wagh Bakri Premium Tea 250g (Case of 32)", 2, 0, 3840.00, 120.00, 32, 5, "NONE", "{}"]
);
createSheet(sheet5, "05_Scheme_Engine_Input");

// =========================================================================
// SHEET 6: Scheme Engine Output Specification (CalculatedLineItem)
// =========================================================================
const sheet6 = [
  ["SCHEME ENGINE OUTPUT SPECIFICATION (CalculatedLineItem Math)"],
  ["Field Name", "Data Type", "Calculation Formula", "Description & Rounding Protocol", "Sample Line 1 (Parle)", "Sample Line 2 (GoodDay)"],
  ["skuId", "VARCHAR(36)", "input.skuId", "Catalog SKU identifier", "SKU-BS-075", "SKU-BS-GD120"],
  ["orderedCases", "INTEGER", "input.orderedCases", "Whole cases ordered", "10", "4"],
  ["orderedPacks", "INTEGER", "input.orderedPacks", "Loose packets ordered", "0", "0"],
  ["grossAmount", "NUMERIC(12,2)", "(cases * dealerPrice) + (packs * packPrice)", "Gross wholesale amount before discounts & tax", "7776.00", "5376.00"],
  ["freeCases", "INTEGER", "floor(orderedCases / buyQty) * getFreeQty", "Promotional free goods cases unlocked (Valued at ₹0.00 [A11])", "1", "0"],
  ["discountPct", "NUMERIC(5,2)", "Matching slab tier percentage", "Applied pre-tax percentage discount", "0.00", "5.00"],
  ["discountAmount", "NUMERIC(10,2)", "roundTo2Decimals(casesGross * (discountPct / 100))", "Cash discount amount deducted from gross", "0.00", "268.80"],
  ["discountDescription", "TEXT", "Formatted scheme text", "Description shown on invoice line", "Buy 10 Get 1 Free: +1 free case(s)", "Slab Discount (5% on 4+ cases): -₹268.80"],
  ["totalDeliveredCases", "INTEGER", "orderedCases + freeCases", "Physical inventory decremented from warehouse", "11", "4"],
  ["taxableAmount", "NUMERIC(12,2)", "grossAmount - discountAmount", "Pre-tax assessable value for GST computation", "7776.00", "5107.20"],
  ["gstRate", "NUMERIC(5,2)", "input.gstRate", "GST tax percentage (18% or 5%)", "18.00", "18.00"],
  ["cgstAmount", "NUMERIC(10,2)", "roundTo2Decimals(taxableAmount * (halfGst / 100))", "Central GST 50% split (Rule [A2] half-up rounding)", "699.84", "459.65"],
  ["sgstAmount", "NUMERIC(10,2)", "roundTo2Decimals(taxableAmount * (halfGst / 100))", "State GST 50% split (Rule [A2] half-up rounding)", "699.84", "459.65"],
  ["totalGstAmount", "NUMERIC(10,2)", "cgstAmount + sgstAmount", "Total Goods & Services Tax on this line", "1399.68", "919.30"],
  ["lineTotal", "NUMERIC(12,2)", "taxableAmount + totalGstAmount", "Total invoice payable amount for this line item", "9175.68", "6026.50"],
  ["nextTierNudge", "OBJECT/JSON", "Computed upsell threshold", "Nudge showing cases needed to unlock next discount tier", "{\"casesNeeded\": 10, \"potentialSavings\": 777.60}", "{\"casesNeeded\": 6, \"targetTierPct\": 8}"]
];
createSheet(sheet6, "06_Scheme_Engine_Line_Math");

// =========================================================================
// SHEET 7: Invoice Summary Schema & Free Goods Tally
// =========================================================================
const sheet7 = [
  ["INVOICE SUMMARY SCHEMA & FREE GOODS TALLY SPECIFICATION"],
  ["Field Name", "Data Type", "Calculation Formula", "Description & Statutory Invariants", "Sample Basket Value"],
  ["totalOrderedCases", "INTEGER", "sum(lines.orderedCases)", "Total billable master cases ordered across basket", "14"],
  ["totalOrderedPacks", "INTEGER", "sum(lines.orderedPacks)", "Total loose packets ordered", "0"],
  ["totalFreeCases", "INTEGER", "sum(lines.freeCases)", "Total promotional bonus cases delivered at ₹0.00", "1"],
  ["totalDeliveredCases", "INTEGER", "totalOrderedCases + totalFreeCases", "Total physical boxes to be loaded onto delivery van", "15"],
  ["totalGrossAmount", "NUMERIC(12,2)", "sum(lines.grossAmount)", "Total wholesale order value before discounts", "13152.00"],
  ["totalDiscountAmount", "NUMERIC(12,2)", "sum(lines.discountAmount)", "Total promotional trade discounts & rebates", "268.80"],
  ["totalTaxableAmount", "NUMERIC(12,2)", "sum(lines.taxableAmount)", "Assessable value across invoice (totalGross - totalDiscount)", "12883.20"],
  ["totalCgstAmount", "NUMERIC(12,2)", "sum(lines.cgstAmount)", "Total Output CGST (Central GST ledger)", "1159.49"],
  ["totalSgstAmount", "NUMERIC(12,2)", "sum(lines.sgstAmount)", "Total Output SGST (State GST ledger)", "1159.49"],
  ["totalGstAmount", "NUMERIC(12,2)", "totalCgstAmount + totalSgstAmount", "Total Goods & Services Tax (intra-state MP split)", "2318.98"],
  ["unroundedGrandTotal", "NUMERIC(12,2)", "totalTaxableAmount + totalGstAmount", "Exact unrounded invoice amount", "15202.18"],
  ["roundOff", "NUMERIC(6,2)", "grandTotal - unroundedGrandTotal", "Commercial invoice round-off adjustment (+/- ₹0.50)", "-0.18"],
  ["grandTotal", "NUMERIC(12,2)", "Math.round(unroundedGrandTotal)", "Final integer payable amount on invoice & ledger", "15202.00"],
  ["freeGoodsTally_JSON", "JSONB", "Array of free bonus items", "Free Goods audit tally required for GST Circular 92/11/2019", "[{\"skuId\": \"SKU-BS-075\", \"skuName\": \"Glucose biscuit 75 g\", \"freeCases\": 1}]"]
];
createSheet(sheet7, "07_Invoice_Summary_Schema");

// =========================================================================
// SHEET 8: Orders Master Database Schema & Data
// =========================================================================
const sheet8 = [
  ["ORDERS MASTER DATABASE SCHEMA (orders Table)", "", "", "", "", "", ""],
  ["Field Name", "Data Type", "Constraint", "Nullable", "Default", "Description & State Invariants", "Sample Value"],
  ["id", "VARCHAR(36)", "PRIMARY KEY", "NO", "ORD-XXXX", "Unique Order ID (e.g. ORD-10482)", "ORD-10482"],
  ["retailerId", "VARCHAR(36)", "FOREIGN KEY", "NO", "None", "Retailer ID placing the order", "RET-0001"],
  ["retailerName", "TEXT", "NOT NULL", "NO", "None", "Cached shop name for instant invoice indexing", "Sharma Kirana Store"],
  ["route", "TEXT", "NOT NULL", "NO", "None", "Delivery route assigned to order", "Napier Town Route #4"],
  ["placedBy", "TEXT", "NOT NULL", "NO", "None", "Person who placed the order (owner or salesman)", "Ramesh Sharma"],
  ["orderSource", "VARCHAR(20)", "ENUM", "NO", "WHATSAPP_AI", "Channel: WHATSAPP_AI, QUICK_ORDER, MANUAL_DESK, SALESMAN", "WHATSAPP_AI"],
  ["status", "VARCHAR(30)", "ENUM", "NO", "PLACED", "Status: PLACED, VERIFIED, CREDIT_HOLD, EXPORTED_TALLY, CANCELLED", "VERIFIED"],
  ["creditHoldReason", "TEXT", "OPTIONAL", "YES", "NULL", "Reason if flagged for CREDIT_HOLD (e.g. Credit limit exceeded)", "NULL"],
  ["subtotal", "NUMERIC(12,2)", "CHECK (>=0)", "NO", "0.00", "Gross order subtotal before discounts", "3888.00"],
  ["schemeDiscount", "NUMERIC(12,2)", "CHECK (>=0)", "NO", "0.00", "Total promotional scheme deductions", "0.00"],
  ["taxableAmount", "NUMERIC(12,2)", "CHECK (>=0)", "NO", "0.00", "Pre-tax assessable amount", "3888.00"],
  ["totalGst", "NUMERIC(12,2)", "CHECK (>=0)", "NO", "0.00", "Total GST computed (CGST + SGST)", "699.84"],
  ["grandTotal", "NUMERIC(12,2)", "CHECK (>=0)", "NO", "0.00", "Final payable invoice total", "4587.84"],
  ["freeGoodsTally_JSON", "JSONB", "OPTIONAL", "YES", "[]", "Promotional free goods delivered on this order", "[]"],
  ["occVersion", "INTEGER", "CHECK (>=1)", "NO", "1", "Optimistic Concurrency Control version for collision prevention [A19]", "2"],
  ["holdReleasedBy", "TEXT", "OPTIONAL", "YES", "NULL", "Distributor clerk or manager who authorized credit hold release", "Sunil Clerk"],
  ["holdReleaseNote", "TEXT", "OPTIONAL", "YES", "NULL", "Manager approval note for temporary credit line extension", "Manager approved ₹10k temporary extension"],
  ["tallyExportedAt", "TIMESTAMPTZ", "OPTIONAL", "YES", "NULL", "Timestamp when batch XML was generated for TallyPrime", "NULL"],
  ["createdAt", "TIMESTAMPTZ", "NOT NULL", "NO", "NOW()", "Order placement timestamp", "2026-11-08T08:30:00Z"],
  ["updatedAt", "TIMESTAMPTZ", "NOT NULL", "NO", "NOW()", "Last modification timestamp", "2026-11-08T08:32:00Z"],
  [],
  ["SAMPLE LIVE ORDERS MASTER RECORDS"],
  ["Order ID", "Retailer ID", "Retailer Name", "Route", "Source", "Status", "Subtotal (₹)", "Scheme Disc (₹)", "Taxable (₹)", "Total GST (₹)", "Grand Total (₹)", "OCC Version", "Hold Note"]
];

sheet8.push(
  ["ORD-10482", "RET-0001", "Sharma Kirana Store", "Napier Town Route #4", "WHATSAPP_AI", "VERIFIED", 3888.00, 0.00, 3888.00, 699.84, 4587.84, 2, "NULL"],
  ["ORD-10483", "RET-0002", "Verma General & Provision", "Wright Town Route #2", "WHATSAPP_AI", "VERIFIED", 25685.50, 0.00, 25685.50, 4623.39, 30308.89, 1, "NULL"],
  ["ORD-10484", "RET-0003", "Gupta Daily Needs", "Wright Town Route #2", "QUICK_ORDER", "VERIFIED", 13824.00, 0.00, 13824.00, 2488.32, 16312.32, 1, "NULL"],
  ["ORD-10485", "RET-0004", "Agrawal Super Bazaar", "Garha Route #5", "WHATSAPP_AI", "VERIFIED", 18991.53, 0.00, 18991.53, 3418.47, 22410.00, 1, "NULL"],
  ["ORD-TEST-HOLD-10", "RET-0003", "Gupta Daily Needs", "Wright Town Route #2", "WHATSAPP_AI", "VERIFIED", 65000.00, 0.00, 65000.00, 5000.00, 70000.00, 2, "Manager approved ₹10k temporary extension"]
);
createSheet(sheet8, "08_Orders_Master_Schema");

// =========================================================================
// SHEET 9: Order Items Database Schema & Data
// =========================================================================
const sheet9 = [
  ["ORDER ITEMS DATABASE SCHEMA (order_items Table)"],
  ["Field Name", "Data Type", "Constraint", "Nullable", "Default", "Description & Pricing Rules", "Sample Value"],
  ["id", "VARCHAR(36)", "PRIMARY KEY", "NO", "UUID", "Unique order item identifier", "item_10482_1"],
  ["orderId", "VARCHAR(36)", "FOREIGN KEY", "NO", "None", "Parent order identifier (orders.id)", "ORD-10482"],
  ["skuId", "VARCHAR(36)", "FOREIGN KEY", "NO", "None", "Catalog SKU identifier (skus.id)", "SKU-BS-075"],
  ["skuCode", "VARCHAR(50)", "NOT NULL", "NO", "None", "Catalog SKU Code", "SKU-BS-075"],
  ["skuName", "TEXT", "NOT NULL", "NO", "None", "Trade SKU name", "Glucose biscuit 75 g, case of 96"],
  ["quantityCases", "INTEGER", "CHECK (>=0)", "NO", "0", "Paid wholesale master cases", "5"],
  ["quantityPacks", "INTEGER", "CHECK (>=0)", "NO", "0", "Paid loose cut-packs (Rule [A8])", "0"],
  ["freeCases", "INTEGER", "CHECK (>=0)", "NO", "0", "Bonus scheme free cases (Circular 92/11/2019 [A11])", "0"],
  ["unitDealerPrice", "NUMERIC(10,2)", "CHECK (>0)", "NO", "None", "Wholesale case price at time of order", "777.60"],
  ["unitPackPrice", "NUMERIC(10,2)", "CHECK (>=0)", "YES", "0.00", "Loose packet price at time of order", "8.10"],
  ["discountPct", "NUMERIC(5,2)", "CHECK (>=0)", "NO", "0.00", "Trade slab discount percentage applied", "0.00"],
  ["discountAmount", "NUMERIC(10,2)", "CHECK (>=0)", "NO", "0.00", "Cash discount amount deducted from line", "0.00"],
  ["netLineAmount", "NUMERIC(12,2)", "CHECK (>=0)", "NO", "None", "Assessable line amount before GST (gross - discount)", "3888.00"],
  ["gstRate", "NUMERIC(5,2)", "CHECK (in 0,5,12,18,28)", "NO", "18.00", "GST tax percentage", "18.00"],
  ["gstAmount", "NUMERIC(10,2)", "CHECK (>=0)", "NO", "None", "Total GST amount for this line item", "699.84"],
  [],
  ["SAMPLE ORDER ITEMS DATA RECORDS"],
  ["Item ID", "Order ID", "SKU Code", "SKU Name", "Qty Cases", "Free Cases", "Dealer Price (₹)", "Disc %", "Net Taxable (₹)", "GST %", "GST Amount (₹)"]
];

sheet9.push(
  ["item_10482_1", "ORD-10482", "SKU-BS-075", "Glucose biscuit 75 g, case of 96", 5, 0, 777.60, 0, 3888.00, 18, 699.84],
  ["item_10483_1", "ORD-10483", "SKU-BS-075", "Glucose biscuit 75 g, case of 96", 10, 1, 777.60, 0, 7776.00, 18, 1399.68],
  ["item_10483_2", "ORD-10483", "SKU-TE-WBR250", "Premium leaf tea 250 g, case of 32", 3, 0, 3840.00, 0, 11520.00, 5, 576.00],
  ["item_10483_3", "ORD-10483", "SKU-DT-1KG", "Detergent powder 1 kg, case of 24", 4, 0, 1597.38, 0, 6389.50, 18, 1150.11],
  ["item_10484_1", "ORD-10484", "SKU-DT-GH500", "Washing powder 500 g, case of 48", 6, 0, 1440.00, 0, 8640.00, 18, 1555.20],
  ["item_10484_2", "ORD-10484", "SKU-FD-MG70", "Instant masala noodles 70 g, case of 96", 4, 0, 1296.00, 0, 5184.00, 18, 933.12]
);
createSheet(sheet9, "09_Order_Items_Schema");

// =========================================================================
// SHEET 10: Desk Triage & OCC Concurrency Protocol
// =========================================================================
const sheet10 = [
  ["DESK TRIAGE & OCC CONCURRENCY PROTOCOL SPECIFICATION"],
  ["Field Name", "Data Type", "Direction", "Description & Protocol Invariants", "Sample Value"],
  ["orderId", "VARCHAR(36)", "URL Param", "Order identifier being triaged on split-screen terminal", "ORD-10482"],
  ["expectedOccVersion", "INTEGER", "Request Payload", "Version of order cached by clerk at time of loading screen", "1"],
  ["action", "VARCHAR(20)", "Request Payload", "Clerk action: CONFIRM (VERIFIED), SAVE_CHANGES, REJECT, RELEASE_HOLD", "CONFIRM"],
  ["items", "ARRAY[OBJECT]", "Request Payload", "Modified line items with updated quantities or corrected SKU IDs", "[{\"skuId\": \"SKU-BS-075\", \"quantityCases\": 5}]"],
  ["newAliases", "ARRAY[OBJECT]", "Request Payload", "Auto-learned mappings: { rawPhrase: 'biscuit chhota', skuId: 'SKU-BS-075' }", "[{\"rawPhrase\": \"laal ghoda\", \"skuId\": \"SKU-TE-WBR250\"}]"],
  ["authorizedBy", "TEXT", "Request Payload", "Name of clerk or supervisor approving order or releasing hold", "Sunil Clerk"],
  ["approvalNote", "TEXT", "Request Payload", "Mandatory audit explanation when clearing CREDIT_HOLD", "Manager approved ₹10k temporary extension"],
  ["conflictStatus", "BOOLEAN", "Response Payload", "TRUE if another clerk committed changes first (HTTP 409 OCC Conflict)", "FALSE (Version match: 1 === 1)"],
  ["newOccVersion", "INTEGER", "Response Payload", "Incremented version saved to database (version + 1)", "2"],
  ["neonSyncStatus", "BOOLEAN", "Async Event", "Asynchronously syncs status & version to Neon PostgreSQL", "TRUE (Status: VERIFIED, OCC: 2)"],
  [],
  ["OCC CONCURRENCY STATE MACHINE RULES (Rule [A19])"],
  ["State Transition", "Initial OCC", "Clerk A Request OCC", "Clerk A Outcome", "Clerk B Request OCC", "Clerk B Outcome", "System Concurrency Guard"],
  [
    "PLACED -> VERIFIED",
    "Version 1",
    "expectedOccVersion: 1",
    "SUCCESS -> Order version becomes 2",
    "expectedOccVersion: 1 (Stale)",
    "HTTP 409 CONFLICT REJECTED",
    "Prevents Clerk B from silently overwriting line adjustments made by Clerk A"
  ],
  [
    "CREDIT_HOLD -> VERIFIED",
    "Version 1",
    "expectedOccVersion: 1",
    "SUCCESS -> Order version becomes 2",
    "expectedOccVersion: 1 (Stale)",
    "HTTP 409 CONFLICT REJECTED",
    "Prevents un-authorized re-assignment of released credit hold"
  ]
];
createSheet(sheet10, "10_Desk_Triage_OCC_Protocol");

// =========================================================================
// SHEET 11: Learned Retailer Aliases Schema
// =========================================================================
const sheet11 = [
  ["LEARNED RETAILER ALIASES SCHEMA (retailer_aliases Table)"],
  ["Field Name", "Data Type", "Constraint", "Nullable", "Default", "Description & Feedback Learning Protocol", "Sample Value"],
  ["id", "VARCHAR(36)", "PRIMARY KEY", "NO", "UUID", "Unique alias mapping identifier", "alias_94f8a120"],
  ["retailerId", "VARCHAR(36)", "FOREIGN KEY", "NO", "None", "Retailer ID who uses this specific trade slang (Rule [A20])", "RET-0001"],
  ["rawPhrase", "TEXT", "NOT NULL", "NO", "None", "Lowercased sanitized colloquial slang, nickname, or typo", "biscuit chhota"],
  ["skuId", "VARCHAR(36)", "FOREIGN KEY", "NO", "None", "Mapped master catalog SKU ID", "SKU-BS-075"],
  ["skuName", "TEXT", "NOT NULL", "NO", "None", "Cached SKU name for auditing", "Glucose biscuit 75 g, case of 96"],
  ["confidence", "NUMERIC(4,2)", "RANGE [0.00, 1.00]", "NO", "1.00", "Deterministic alias score (Tier 0 instant resolution in 0ms)", "1.00"],
  ["timesUsed", "INTEGER", "CHECK (>=1)", "NO", "1", "Usage counter incremented on every subsequent order hit", "14"],
  ["createdAt", "TIMESTAMPTZ", "NOT NULL", "NO", "NOW()", "Timestamp when clerk first mapped the alias on Order Desk", "2026-11-04T12:00:00Z"],
  ["updatedAt", "TIMESTAMPTZ", "NOT NULL", "NO", "NOW()", "Last time this alias was triggered or updated", "2026-11-08T10:15:30Z"],
  [],
  ["SAMPLE LEARNED ALIAS RECORDS IN PRODUCTION"],
  ["Alias ID", "Retailer ID", "Retailer Name", "Colloquial Raw Phrase", "Mapped SKU ID", "Confidence", "Usage Hits", "Tier 0 Effect"]
];

sheet11.push(
  ["alias_01", "RET-0001", "Sharma Kirana Store", "biscuit chhota", "SKU-BS-075", 1.00, 14, "Resolves Parle-G 75g instantly in 0ms"],
  ["alias_02", "RET-0001", "Sharma Kirana Store", "ghadi powder", "SKU-DT-1KG", 1.00, 8, "Resolves Ghadi 1kg instantly in 0ms"],
  ["alias_03", "RET-0001", "Sharma Kirana Store", "laal ghoda", "SKU-TE-WBR250", 1.00, 4, "Auto-learned Mandi slang for Red Label tea"],
  ["alias_04", "RET-0002", "Verma General & Provision", "safed colgate", "SKU-PC-CG100", 1.00, 6, "Resolves Colgate Dental Cream 100g in 0ms"],
  ["alias_05", "RET-0004", "Agrawal Super Bazaar", "double maggi", "SKU-FD-MG140", 1.00, 12, "Resolves Maggi 140g Double Pack in 0ms"]
);
createSheet(sheet11, "11_Learned_Aliases_Schema");

// =========================================================================
// SHEET 12: Delivery Van Route Manifest Schema
// =========================================================================
const sheet12 = [
  ["DELIVERY VAN ROUTE MANIFEST SCHEMA & DISPATCH SPECIFICATION"],
  ["Field Name", "Data Type", "Calculation Formula", "Description & Vehicle Capacity Invariants", "Sample Route #2 (Wright Town)"],
  ["route", "TEXT", "Target Route Name", "Beat route name assigned to delivery vehicle", "Wright Town Route #2"],
  ["vanNumber", "VARCHAR(20)", "Vehicle Registration", "Delivery vehicle plate number (e.g. MP-20-GA-4412)", "MP-20-GA-4412"],
  ["driverName", "TEXT", "Assigned Driver", "Delivery driver and mobile contact", "Rakesh Yadav (+91 94251 12345)"],
  ["dispatchDate", "DATE", "YYYY-MM-DD", "Scheduled delivery dispatch date", "2026-11-08"],
  ["totalOrders", "INTEGER", "count(orders on route)", "Total Kirana shop deliveries scheduled on this beat", "2"],
  ["totalMasterCases", "INTEGER", "sum(paidCases)", "Total billable master cases to load into cargo van", "27"],
  ["totalFreeCases", "INTEGER", "sum(freeCases)", "Total bonus promotional cases to load into cargo van", "1"],
  ["totalPhysicalCases", "INTEGER", "totalMasterCases + totalFreeCases", "Total physical carton boxes occupying van cargo volume", "28"],
  ["totalWholesaleValue", "NUMERIC(12,2)", "sum(grandTotal)", "Total invoice collection value for van driver cash/UPI", "46621.21"],
  ["approxTotalWeightKg", "NUMERIC(10,2)", "sum(cases * caseWeightKg)", "Total payload weight in kg (Rule [A22] vehicle payload check)", "312.40"],
  [],
  ["SAMPLE VAN WAREHOUSE PICK LIST (AGGREGATED SKUS)"],
  ["SKU ID", "SKU Code", "Product Name", "Paid Cases", "Free Cases", "Total Cases to Pick", "Case Weight (kg)", "Total Weight (kg)"]
];

sheet12.push(
  ["SKU-BS-075", "SKU-BS-075", "Glucose biscuit 75 g, case of 96", 10, 1, 11, 7.20, 79.20],
  ["SKU-TE-WBR250", "SKU-TE-WBR250", "Premium leaf tea 250 g, case of 32", 3, 0, 3, 8.00, 24.00],
  ["SKU-DT-1KG", "SKU-DT-1KG", "Detergent powder 1 kg, case of 24", 4, 0, 4, 24.00, 96.00],
  ["SKU-DT-GH500", "SKU-DT-GH500", "Washing powder 500 g, case of 48", 6, 0, 6, 24.00, 144.00],
  ["SKU-FD-MG70", "SKU-FD-MG70", "Instant masala noodles 70 g, case of 96", 4, 0, 4, 6.72, 26.88],
  [],
  ["SAMPLE VAN DELIVERY STOPS (SEQUENCED ROUTE BEAT)"],
  ["Stop #", "Retailer ID", "Store Name", "Owner Name", "Phone", "Delivery Address", "Cases", "Invoice Value (₹)", "Payment Mode"]
);

sheet12.push(
  [1, "RET-0002", "Verma General & Provision", "Suresh Verma", "9826000002", "Gorakhpur Market, Near Gurudwara, Jabalpur", 18, 30308.89, "Credit Account (7 Days)"],
  [2, "RET-0003", "Gupta Daily Needs", "Dinesh Gupta", "9826000003", "Civic Centre, Shop 8, Jabalpur", 10, 16312.32, "UPI on Delivery / Cash"]
);
createSheet(sheet12, "12_Van_Route_Manifest");

// =========================================================================
// SHEET 13: Tally ERP 9 / TallyPrime XML Export Schema
// =========================================================================
const sheet13 = [
  ["TALLY ERP 9 / TALLYPRIME XML EXPORT SCHEMA SPECIFICATION"],
  ["XML Node / Tag", "Data Type", "Source Attribute", "Description & Accounting Sign Conventions", "Sample Value"],
  ["<ENVELOPE>", "XML Container", "Root wrapper", "Standard Tally request envelope wrapper", "<ENVELOPE>"],
  ["<TALLYREQUEST>", "STRING", "Static Header", "Specifies data import action to Tally server", "Import Data"],
  ["<REPORTNAME>", "STRING", "Static Desc", "Specifies Vouchers report import target", "Vouchers"],
  ["<SVCURRENTCOMPANY>", "STRING", "Config Parameter", "Distributor operating company name in Tally", "Company A Jabalpur"],
  ["<VOUCHER VCHTYPE>", "XML Attribute", "Voucher Type", "Sales voucher type in Tally accounting ledger", "Sales"],
  ["<ACTION>", "XML Attribute", "Import Action", "Create fresh invoice voucher in Tally company", "Create"],
  ["<OBJVIEW>", "XML Attribute", "View Mode", "Opens voucher in Invoice View Mode", "Invoice Voucher View"],
  ["<DATE>", "DATE (YYYYMMDD)", "order.createdAt", "Voucher transaction date formatted as YYYYMMDD", "20261108"],
  ["<VOUCHERNUMBER>", "STRING", "order.id", "Unique voucher / invoice number in sales journal", "ORD-10482"],
  ["<PARTYLEDGERNAME>", "STRING", "retailer.name", "Sundry Debtors ledger account for Kirana store", "Sharma Kirana Store"],
  ["<ISDEEMEDPOSITIVE>", "STRING", "Party Ledger", "DEBIT sign convention: 'Yes' increases receivable", "Yes"],
  ["<AMOUNT> (Party)", "NUMERIC(12,2)", "order.grandTotal", "Positive total invoice receivable amount", "4587.84"],
  ["<STOCKITEMNAME>", "STRING", "sku.name", "Inventory stock item ledger name in Tally master", "Glucose biscuit 75 g, case of 96"],
  ["<RATE>", "STRING", "line.unitDealerPrice", "Wholesale unit price per case", "777.60/case"],
  ["<ACTUALQTY>", "STRING", "paidCases + freeCases", "Total physical quantity decremented from godown [A39]", "11 case"],
  ["<BILLEDQTY>", "STRING", "paidCases", "Only paid billable quantity billed on commercial invoice [A39]", "10 case"],
  ["<AMOUNT> (Stock)", "NUMERIC(12,2)", "-1 * line.netLineAmount", "CREDIT sign convention: Negative sales credit amount", "-7776.00"],
  ["<LEDGERNAME> (CGST)", "STRING", "Static Rule [A2]", "Central Goods & Services Tax ledger", "Output CGST"],
  ["<AMOUNT> (CGST)", "NUMERIC(10,2)", "-1 * order.cgstAmount", "CREDIT sign convention: Negative liability amount", "-699.84"],
  ["<LEDGERNAME> (SGST)", "STRING", "Static Rule [A2]", "State Goods & Services Tax ledger", "Output SGST"],
  ["<AMOUNT> (SGST)", "NUMERIC(10,2)", "-1 * order.sgstAmount", "CREDIT sign convention: Negative liability amount", "-699.84"],
  ["<LEDGERNAME> (RoundOff)", "STRING", "Static Ledger", "Rounding ledger to balance fractions of rupee", "Round Off"],
  ["<AMOUNT> (RoundOff)", "NUMERIC(6,2)", "-1 * order.roundOff", "Exact balancing debit/credit to guarantee 0.00 sum", "+0.18"]
];
createSheet(sheet13, "13_Tally_XML_Export_Schema");

// =========================================================================
// SHEET 14: Dormant Kirana Retention CRM Schema
// =========================================================================
const sheet14 = [
  ["DORMANT KIRANA RETENTION CRM SCHEMA SPECIFICATION"],
  ["Field Name", "Data Type", "Calculation Formula", "Description & Marketing Retention Rules", "Sample Record"],
  ["retailerId", "VARCHAR(36)", "retailer.id", "Retailer ID of dormant Kirana store", "RET-0005"],
  ["name", "TEXT", "retailer.name", "Store trade name", "Patel Kirana Kendra"],
  ["ownerName", "TEXT", "retailer.ownerName", "Proprietor name", "Kishore Patel"],
  ["phone", "VARCHAR(15)", "retailer.phone", "Mobile number for WhatsApp dispatch", "9826000005"],
  ["address", "TEXT", "retailer.address", "Shop address", "Adhartal Chowk, Jabalpur"],
  ["route", "TEXT", "retailer.route", "Assigned delivery route", "Adhartal Route #1"],
  ["daysInactive", "INTEGER", "floor((now - lastOrderAt) / 86400000)", "Elapsed days since last verified order (Rule [A23] >= 14 days)", "22 days"],
  ["lastOrderDate", "DATE", "retailer.lastOrderAt", "Date of last confirmed wholesale purchase", "2026-10-17"],
  ["lastOrderValue", "NUMERIC(12,2)", "lastOrder.grandTotal", "Value of last confirmed wholesale order", "18450.00"],
  ["creditLimit", "NUMERIC(12,2)", "retailer.creditLimit", "Credit ceiling", "40000.00"],
  ["currentBalance", "NUMERIC(12,2)", "retailer.currentBalance", "Unpaid balance", "39500.00"],
  ["creditHeadroom", "NUMERIC(12,2)", "creditLimit - currentBalance", "Available credit buffer for re-order", "500.00"],
  ["churnRiskTier", "VARCHAR(20)", "Computed Risk", "Risk tier: CRITICAL (>21 days), HIGH (14-21 days)", "CRITICAL (22 Days Dormant)"],
  ["activePromoTextHindi", "TEXT", "Vernacular Template", "Pre-composed Devanagari message with personalized discount", "नमस्ते किशोर जी! पटेल किराना केंद्र के लिए खास ऑफर: पारले व घड़ी पर अतिरिक्त 3% छूट उपलब्ध है। आज ही ऑर्डर करें!"],
  ["whatsappDeepLink", "TEXT", "https://wa.me/...", "1-tap WhatsApp deep link pre-filled with phone & promo text", "https://wa.me/919826000005?text=नमस्ते%20किशोर%20जी..."]
];
createSheet(sheet14, "14_Dormant_Retention_CRM");

// =========================================================================
// SHEET 15: Security, Active Session Locks & OTP Schema
// =========================================================================
const sheet15 = [
  ["SECURITY, ACTIVE SESSION LOCKS & OTP SCHEMA SPECIFICATION"],
  ["Field Name", "Data Type", "Table Source", "Description & Single-Writer Concurrency Rules", "Sample Value"],
  ["retailerId", "VARCHAR(36)", "active_sessions.retailer_id", "PRIMARY KEY: Only 1 active session allowed per Kirana store [A49]", "RET-0001"],
  ["sessionId", "VARCHAR(50)", "active_sessions.session_id", "Cryptographic session token for authenticated client", "ses_88a91b2c4e10"],
  ["userId", "VARCHAR(36)", "active_sessions.user_id", "Authenticated user ID", "usr_9826000001"],
  ["phone", "VARCHAR(15)", "active_sessions.phone", "Logged in mobile number", "9826000001"],
  ["createdAt", "TIMESTAMPTZ", "active_sessions.created_at", "Session login timestamp", "2026-11-08T09:00:00Z"],
  ["lastActiveAt", "TIMESTAMPTZ", "active_sessions.last_active_at", "Last heartbeat timestamp (refreshed on API touch)", "2026-11-08T09:25:00Z"],
  ["inactivityTimeoutMs", "INTEGER", "Static Parameter", "Inactivity expiry window: 30 minutes (1,800,000 ms)", "1800000"],
  ["concurrencyRule", "TEXT", "Rule [A49]", "Second concurrent login from different IP/browser receives HTTP 409", "USER_ALREADY_LOGGED_IN"],
  ["forceLogoutAction", "API Endpoint", "POST /api/auth/force-logout", "Allows store owner or admin to terminate abandoned session", "Releases lock instantly in memory & Neon"],
  ["otpId", "VARCHAR(36)", "otps.id", "Unique OTP request tracking ID", "otp_179401a"],
  ["otpPhone", "VARCHAR(15)", "otps.phone", "Target phone number", "9826000001"],
  ["otpCode", "VARCHAR(6)", "otps.otp_code", "Cryptographic 6-digit numeric verification code", "725479"],
  ["masterDemoCodes", "VARCHAR(30)", "Rule [A64]", "Permanent sandbox demo bypass codes: 123456 and 716716", "123456 / 716716 (Auto-provisioned)"],
  ["otpExpiresAt", "TIMESTAMPTZ", "otps.expires_at", "OTP validity window: 10 minutes", "2026-11-08T09:10:00Z"],
  ["otpAttempts", "INTEGER", "otps.attempts", "Failed attempt counter (burned and locked after 3 failures)", "0 (Max: 3)"],
  ["otpVerified", "BOOLEAN", "otps.verified", "True once code is consumed during auth handshake", "TRUE"]
];
createSheet(sheet15, "15_Security_Session_Locks");

// Write Workbook to file
XLSX.writeFile(wb, outputPath);
console.log(`Successfully generated master schema Excel workbook at: ${outputPath}`);
console.log(`Total Sheets: ${wb.SheetNames.length}`);
