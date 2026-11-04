# Project Curation, Research & Benchmark Archive

This directory serves as the centralized archive for all research, benchmarks, build logs, architectural design documents, test datasets, and curation artifacts developed during the engineering of the **IsoLabs B2B Kirana Order Management System**.

The active application code remains strictly partitioned into two operational root packages:
- **`distributor-app/`** — The production Next.js 15 PWA web application.
- **`engine/`** — The decoupled, standalone Vernacular Order Parsing Engine (`@isolabs/order-engine`).

---

## Directory Index & Roles

```
project-curation-and-research/
├── Build Docs/                                    # Technical logs, incident tracking & operational guides
│   ├── Laymans_Guide.md                          # Plain-English non-technical explanation of the Order Engine
│   ├── Modules_And_Features.md                   # Feature registry across all 9 core build modules
│   ├── Assumptions.md                            # Comprehensive assumption registry ([A1] - [A44])
│   ├── Errors.md                                 # Root cause incident log for all build/runtime issues ([ERR-001] - [ERR-030])
│   ├── Overall_connections.md                    # File roles & end-to-end data flow breakdown
│   ├── Test_And_Run_Guide.md                     # Step-by-step testing runbook
│   ├── TDD.md / TDD_Draft.md                     # Technical Design Document
│   └── deployment.md                             # Step-by-step local & cloud deployment guide
├── research/                                      # Academic papers, linguistic research & retrieval benchmarks
│   └── README.md                                 # Market economics (₹52.5L loss), Jabalpur trade slang, NLP papers & cascade theory
├── catalogue/                                     # Realistic wholesale FMCG catalog & order benchmarks
│   ├── catalog-data.ts / catalog-data.json       # 36 authentic wholesale SKUs across 7 categories
│   ├── types.ts                                  # Packaging tier & trade scheme type contracts
│   ├── index.ts                                  # Catalog query service & alias map builder
│   ├── datasets/realistic-orders.ts              # 9 real-world Jabalpur WhatsApp/voice call test scenarios
│   └── __tests__/realistic-orders.test.ts        # Automated scenario benchmark suite
├── Inital Documents/                              # Original client briefs, problem statements & requirements
├── structure of inputs for the app/               # Input templates & test prompts
├── UI/                                            # Design mockups, wireframes & styling references
├── PS4_Distributor_Complete_Flow_And_Architecture.md # Master build blueprint & architecture specification
└── deployment.md                                  # Deployment guide reference
```

---

## 1. Research & Economic Grounding (`research/`)
Contains the full business economics, linguistic landscape, and retrieval benchmarks:
- **The ₹52.5 Lakh Annual Loss:** Grounded breakdown of wrong items (₹31.5L), order entry clerks (₹15.6L), and stock-outs (₹5.4L).
- **Linguistic Landscape:** Shorthand mapping for Jabalpur trade vernacular (*"pila wala"*, *"dabba"*, *"shakti chai"*, *"cut-pack"*).
- **Academic Research Citations:**
  - *Flipkart Code-Mix Query Translation* (arXiv 2208.03713, ACL 2023)
  - *Aksharantar / IndicXlit* (AI4Bharat, EMNLP 2023)
  - *L3Cube-HingCorpus & HingBERT* (arXiv 2204.08398)
  - *Hindi-BEIR / NLLB-E5* (arXiv 2409.05401)
  - *LLM Cascades with Early Abstention & UCCI* (arXiv 2502.09054, 2605.18796)

---

## 2. Realistic Catalog & Benchmark Suite (`catalogue/`)
Contains authentic distributor catalog data and realistic stress-test scenarios:
- **36 Wholesale SKUs:** Biscuits, Tea, Edible Oils, Detergents, Soaps, Packaged Foods, Home Care with authentic HSN codes and 50/50 CGST/SGST splits.
- **Trade Promotion Schemes:** Free Goods (10+1), Slab percentage discounts (3-5%), and Flat Cash Rebates (₹30-₹50/case).
- **9 Realistic Scenarios:** Conversational WhatsApp messages, the "Dabba" polysemy dilemma, broken-case cut packs, Devanagari numerals, speech-to-text call transcripts, missing unit detection, and 10-line wholesale bulk orders.
- **Run Benchmark:**
  ```bash
  npm run test:catalogue
  ```

---

## 3. Build Documentation & Incident Logs (`Build Docs/`)
- **[`Laymans_Guide.md`](file:///V:/Projects/Resume%20Projects/IsoLabs/project-curation-and-research/Build%20Docs/Laymans_Guide.md):** Plain-English explanation strictly explaining what the vernacular order engine does, why it was decoupled into `engine/`, and how it stops guesswork.
- **[`Modules_And_Features.md`](file:///V:/Projects/Resume%20Projects/IsoLabs/project-curation-and-research/Build%20Docs/Modules_And_Features.md):** Complete registry of all 9 modules and 34 production routes.
- **[`Errors.md`](file:///V:/Projects/Resume%20Projects/IsoLabs/project-curation-and-research/Build%20Docs/Errors.md):** Exhaustive root-cause incident log covering all 30 resolved issues (`[ERR-001]` through `[ERR-030]`).
- **[`Assumptions.md`](file:///V:/Projects/Resume%20Projects/IsoLabs/project-curation-and-research/Build%20Docs/Assumptions.md):** Verified assumptions `[A1]` through `[A44]`.
