# Deployment & Reviewer Guide

**Project Name:** Distributor Order Management System (Company A, Jabalpur)  
**Repository URL:** [https://github.com/manva-niso/Distributor-Order-Management-System.git](https://github.com/manva-niso/Distributor-Order-Management-System.git)  
**Live Demo URL:** *(To be updated upon Vercel deployment)*

---

## 1. Demo Login Accounts (For Reviewer)

The application has been pre-seeded with realistic Jabalpur distribution master data. You can log in as any of the three distinct user personas directly from the login page:

| Role | Mobile Number | Persona Name | Linked Business / Territory | What To Test |
| :--- | :--- | :--- | :--- | :--- |
| **Retailer** | `9826000001` | Ramesh Sharma | **Sharma Kirana Store** (Napier Town Route #4)<br/>Credit Limit: ₹50,000 (Available: ₹38,000) | Retailer catalogue, dealer pricing, Buy 10 Get 1 schemes, cart checkout, multi-modal quick order capture. |
| **Order Desk** | `9826000099` | Amit Jain | **Company A Order Desk** (Jabalpur Central Office) | Order verification queue, credit hold approvals, line editing with auto-alias learning, Tally XML batch export. |
| **Salesman** | `9826000018` | Rajesh Kumar | **Field Sales Representative** (Napier Town / Adhartal Beat) | Mobile order booking during shop visits, beat shop selector, offline queue. |

> **Note on OTP in Demo Mode:**  
> When you click **"Send Login OTP"**, a real 6-digit code is generated and displayed on-screen in the yellow **Dev Sandbox Notice** box (and printed to your server terminal). Simply type or paste the 6 digits and click **"Verify & Login"**.

---

## 2. Step-by-Step Local Setup

### Prerequisites
- **Node.js:** v20.x or v24.x LTS (`node -v`)
- **npm:** v10.x or higher (`npm -v`)

### Instructions

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/manva-niso/Distributor-Order-Management-System.git
   cd Distributor-Order-Management-System/distributor-app
   ```

2. **Install Dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Configure Environment Variables:**
   ```bash
   # Copy the example environment template
   cp .env.example .env.local
   ```
   *(The default `.env.local` runs out of the box in zero-friction development mode with in-memory seeded master data and console OTP).*

4. **Run the Automated Test Suite:**
   ```bash
   npm run test
   ```
   *(Executes all Vitest unit and integration suites in <1 second).*

5. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   Open your browser to [**http://localhost:3000**](http://localhost:3000) (or directly [**http://localhost:3000/login**](http://localhost:3000/login)).

---

## 3. Environment Variables Reference

All credentials and secrets are managed via environment variables. **No secrets or private keys are stored in the repository.**

| Variable Name | Required / Optional | Purpose & Usage |
| :--- | :--- | :--- |
| `DATABASE_URL` | Optional in dev / Required in prod | Connection string for Neon PostgreSQL database. If omitted, the app runs on its built-in reactive seed store. |
| `JWT_SECRET` | Required | Cryptographic secret (minimum 32 characters) used by `jose` to sign HS256 session cookies. |
| `SMS_PROVIDER` | Required | Set to `"console"` (for local testing), `"fast2sms"` (India DLT/OTP route), or `"twilio"`. |
| `SMS_API_KEY` | Optional in dev | API key for Fast2SMS. Leave empty in local dev to print OTP to terminal. |
| `TWILIO_ACCOUNT_SID` | Optional | Twilio account SID (if `SMS_PROVIDER="twilio"`). |
| `TWILIO_AUTH_TOKEN` | Optional | Twilio authentication token (if `SMS_PROVIDER="twilio"`). |
| `TWILIO_PHONE_NUMBER` | Optional | Twilio originating phone number. |
| `GEMINI_API_KEY` | Required for AI capture | Google Gemini API key used by the multi-modal extraction pipeline. |
| `GEMINI_MODEL` | Optional | Target Gemini model (defaults to `gemini-2.5-flash`). |
| `NODE_ENV` | Required | Set to `"development"` or `"production"`. |
| `NEXT_PUBLIC_APP_URL` | Required | Canonical URL of the application (`http://localhost:3000` or production domain). |

---

## 4. Production Cloud Deployment (Vercel + Neon)

### Database Deployment (Neon)
1. Create a free PostgreSQL project on [Neon.tech](https://neon.tech).
2. Copy the pooled connection string (`postgres://...sslmode=require`).
3. Run Drizzle migration to generate tables:
   ```bash
   npx drizzle-kit push
   ```

### Application Deployment (Vercel)
1. Import the repository [https://github.com/manva-niso/Distributor-Order-Management-System](https://github.com/manva-niso/Distributor-Order-Management-System) into Vercel.
2. Set the **Root Directory** to `distributor-app`.
3. Add the environment variable names in the Vercel dashboard:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `SMS_PROVIDER`
   - `SMS_API_KEY` (or `console`)
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL`
4. Deploy. Vercel automatically runs `npm run build` using the configured Next.js production pipeline.
