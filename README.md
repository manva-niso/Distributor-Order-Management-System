# Distributor Order Management System (IsoLabs)

**Client:** Company A, Jabalpur (FMCG Distributor for 4 packaged food and home care brands, serving 1,800 kirana shops with 18 salesmen and ~600 orders/day).

---

## Overview

This repository contains the end-to-end B2B order management system engineered to replace manual paper notebooks, unorganized WhatsApp text messages, and handwritten lists with a unified, high-speed, offline-capable digital workflow.

### Key Capabilities
- **Installable PWA Web App:** Fast, responsive, bilingual (English & Hindi) interface with 48px touch targets designed for low-end Android smartphones on 3G networks.
- **Legit OTP Authentication:** Multi-provider OTP verification (Fast2SMS / Twilio / Dev Console) with cryptographic timing-safe validation, rate limiting, and 7-day signed JWT session cookies (`jose`).
- **Retailer Catalogue & Dynamic Schemes:** Live dealer pricing, stock visibility, and a pure calculation engine handling free goods (e.g. *Buy 10 get 1 free*) and slab discounts (e.g. *3% off at 5+ cases*).
- **Multi-Modal AI Quick Order Capture:** Transcribes and maps informal WhatsApp text, paper slip photos (OCR with client canvas compression $\le 1000$px), and Hindi voice notes to inventory SKUs with strict unit disambiguation (*"peti"* mapped to wholesale cases, asking rather than guessing).
- **Order Desk Operations:** Optimistic concurrency control (OCC), credit hold clearance queues, Tally ERP 9 / Prime XML batch export, and van loading route manifests.
- **14-Day Dormant Retailers Dashboard:** Dormancy tracking with 1-tap Hindi WhatsApp nudge templates.

---

## Repository Structure

```
├── Build Docs/                                    # Build progress and incident tracking
│   ├── Modules_And_Features.md                   # Feature registry across all 9 core build modules
│   ├── Errors.md                                 # Root cause incident log for all build/runtime issues
│   ├── Overall_connections.md                    # Directory breakdown, file roles & end-to-end data flow
│   └── Test_And_Run_Guide.md                     # Runbook for testing each part individually & collectively
├── distributor-app/                              # Next.js App Router full-stack codebase
│   ├── src/
│   │   ├── app/                                  # App router pages & API route handlers
│   │   │   ├── (auth)/login/                     # Screen 1: Bilingual Login & OTP verification
│   │   │   └── api/auth/                         # OTP dispatch, verification, profile & logout APIs
│   │   ├── db/                                   # Drizzle ORM schema, reactive store & seed data
│   │   ├── lib/                                  # Auth utilities (JWT, OTP, SMS gateways)
│   │   └── __tests__/                            # Vitest unit & integration test suites
│   ├── next.config.ts                            # Next.js production configuration
│   └── package.json                              # Dependencies & test scripts
├── Inital Documents/                             # Initial client briefs & specifications
├── PS4_Distributor_Complete_Flow_And_Architecture.md # Master Build Blueprint & Architecture
└── UI/                                           # UI design mockups & design system reference
```

---

## Quick Start

### 1. Prerequisites
- Node.js v20+ or v24 LTS
- npm v10+

### 2. Setup & Installation
```bash
# Navigate to the application directory
cd distributor-app

# Install dependencies
npm install --legacy-peer-deps

# Copy environment variables
cp .env.example .env.local

# Run test suite
npm run test

# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to open the application.

---

## Testing & Quality Assurance
Run the automated Vitest test suite:
```bash
cd distributor-app
npm run test
```
All unit and integration tests run in under 1 second without requiring external network dependencies.
