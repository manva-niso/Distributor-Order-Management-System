# FMCG Order Demand & Scheme Engine (`@isolabs/order-engine`)

This directory is an **independent, decoupled package** containing the core intelligence of the IsoLabs distribution platform (Module 5: Demand Detection & AI Capture, and Module 3: Trade Scheme & Commercial Pricing Engine).

It is isolated from the Next.js web application so that you can develop, upgrade, and benchmark Machine Learning, AI models, and NLP pipelines independently without breaking the user-facing web app.

---

## 1. What This Engine Does

```text
[Shopkeeper / Salesman Input]
  ├── Messy WhatsApp Text (Hinglish / Devanagari Hindi / English)
  ├── Photo of Handwritten Kirana Slip (Cloud S3 Object Storage)
  └── Spoken Hindi Voice Note (.m4a, .mp3, .wav)
                     │
                     ▼
       ┌───────────────────────────┐
       │ AI & Multimodal Pre-Filter│
       └─────────────┬─────────────┘
                     │ Extracted Raw Utterances
                     ▼
       ┌───────────────────────────┐
       │   Token & Number Parser   │ <── Devanagari digits (५ -> 5), word numbers ("five", "paanch")
       └─────────────┬─────────────┘
                     │
                     ▼
       ┌───────────────────────────┐
       │  SKU Candidate Matching   │ <── Brand aliases, Levenshtein fuzzy match, pack size hints
       └─────────────┬─────────────┘
                     │
                     ▼
       ┌───────────────────────────┐
       │  Ambiguity Resolution     │ <── Golden Rule: Ask, Never Guess (Case vs Loose Pack)
       └─────────────┬─────────────┘
                     │ Confirmed Cart Lines
                     ▼
       ┌───────────────────────────┐
       │ FMCG Trade Scheme Engine  │ <── Buy X Get Y Free, Multi-Tier Slabs, Flat Cash Rebates
       └─────────────┬─────────────┘
                     │
                     ▼
       ┌───────────────────────────┐
       │  50/50 MP GST & Invoice   │ <── Half-up rounding, CGST + SGST, physical stock deduction
       └───────────────────────────┘
```

---

## 2. Directory Structure

```text
engine/
├── package.json               # Standalone test runner configuration
├── tsconfig.json              # TypeScript compilation settings
├── vitest.config.ts           # Vitest unit test configuration
├── README.md                  # This architecture blueprint
└── src/
    ├── index.ts               # Primary package export gateway
    ├── ai/
    │   ├── text-parser.ts     # Multilingual NLP tokenizer, clause preprocessor, fuzzy matcher
    │   ├── types.ts           # ParsedLineItem, SkuCandidate, AmbiguityReason contracts
    │   ├── pipeline.ts        # Pluggable pipeline factory (Deterministic vs Custom ML vs LLM)
    │   └── gemini.ts          # Multimodal OCR and audio note transcription client
    ├── schemes/
    │   ├── engine.ts          # Pure scheme math, tiered slabs, flat rebates, 50/50 MP GST
    │   └── types.ts           # Scheme definitions, slab tiers, breakdown structures
    ├── storage/
    │   └── s3.ts              # Neon / S3 object storage client for paper slips and voice notes
    ├── data/
    │   └── catalog.ts         # Reference FMCG catalogue (12 SKUs, pack sizes, trade schemes)
    └── __tests__/
        ├── text-parser.test.ts # 16 unit tests covering Hinglish, Hindi, cut-packs, and ambiguity
        └── schemes.test.ts     # 13 unit tests covering Free Goods, tiered slabs, and MP GST
```

---

## 3. Core Engine Guardrails & Rules

1. **Ask, Never Guess (`[A16]`):**
   * If a shopkeeper writes *"5 biscuit chhota"* without specifying *"peti"* (carton) or *"packet"*, the engine **refuses to place the order automatically**.
   * It produces a high-contrast Disambiguation Question Card showing:
     * Option A: 5 Cases (480 packs · ₹3,888)
     * Option B: 5 Loose Packs (₹40.50)
   * Prevents catastrophic 96x over-shipment errors.

2. **Explanatory Clause Stripping (`[A37]`):**
   * If a user writes *"1 pkt of tea, where a case contains 24 pkts"*, the secondary capacity number `24` does **not** corrupt the line quantity. Explanatory clauses are stripped before token extraction.

3. **Broken Case Cut-Pack Handling (`[A36]`):**
   * If a user requests *"15 loose packets out of a case of 20"*, the engine calculates:
     * Option A: Round up to 1 full case (20 packs) at dealer wholesale rate.
     * Option B: Deliver 15 cut packs with single-pack pricing surcharge.

4. **Universal FMCG Schemes (`[A11]`, `[A45]`, `[A47]`):**
   * **Free Goods:** `floor(ordered / buyQty) * freeQty`, valued at ₹0.00 on commercial invoices per GST Circular 92/11/2019-GST.
   * **Multi-Tier Slab Ladders:** Automatically detects and applies the highest unlocked volume tier non-cumulatively (e.g., 3 cases = 3%, 5 cases = 5%, 10 cases = 8%).
   * **Cash Rebates:** Deducts flat ₹ per case (e.g., ₹20/case rebate on detergent) pre-tax.
   * **Physical Warehouse Inventory Lock (`[A30]`):** Deducts warehouse stock for both `paidCases + freeCases`.

---

## 4. How to Run Standalone Tests

You can run the engine unit tests directly using the root or local vitest runner:

```bash
# In the root or engine directory:
npx vitest run engine/src/__tests__/text-parser.test.ts
npx vitest run engine/src/__tests__/schemes.test.ts
```

All 29 tests pass with sub-50ms execution speed.

---

## 5. Roadmap: Upgrading from Deterministic Baseline to Production AI/ML

| Phase | Upgrade Target | Implementation Plan |
| :--- | :--- | :--- |
| **Phase 1** (Current) | **Deterministic Rule Pipeline** | High-speed regex, Devanagari translation, word numerals, Levenshtein distance, context clause preprocessor. Zero external network latency (< 10ms). |
| **Phase 2** | **Semantic Embedding Search** | Compute vector embeddings (e.g. OpenAI `text-embedding-3-small` or HuggingFace `all-MiniLM-L6-v2`) for all catalog SKUs and synonyms. Match user utterances using cosine similarity with a fallback to Levenshtein distance. |
| **Phase 3** | **Local Python / spaCy ML Microservice** | Use `CustomMlApiAdapter` (`engine/src/ai/pipeline.ts`) to route raw utterances to a local FastAPI microservice running a fine-tuned Named Entity Recognition (NER) model for Indian Kirana product attributes. |
| **Phase 4** | **Multimodal Vision & Voice (Gemini / Whisper)** | Direct extraction of handwritten slips from images and Hindi voice notes via `engine/src/ai/gemini.ts`, uploading physical proof to `engine/src/storage/s3.ts`. |
| **Phase 5** | **Merchant Personal Dictionary Learning** | When an Order Desk clerk corrects an AI mapping, save that correction into the retailer's personal alias ledger (`retailer_aliases` table) so the engine gets 100% accurate for that specific shopkeeper over time. |
