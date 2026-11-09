# Deployment & Reviewer Guide

This guide details how to run the system locally, how it is deployed, the required environment variable names (names only, no values), and demo login credentials for review.

---

## 1. How to Run Locally (Step-by-Step)

### Prerequisites
- **Node.js**: v20 or higher
- **npm**: v10 or higher
- **PostgreSQL**: Neon serverless Postgres instance or local PostgreSQL 15+

### Step-by-Step Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/manva-niso/Distributor-Order-Management-System.git
   cd Distributor-Order-Management-System
   ```

2. **Install dependencies**:
   ```bash
   npm --prefix distributor-app install
   ```

3. **Configure local environment variables**:
   Create a `.env.local` file inside `distributor-app/` based on the provided template:
   ```bash
   cp distributor-app/.env.example distributor-app/.env.local
   ```
   *(Populate the required variable names listed in Section 3).*

4. **Start the development server**:
   ```bash
   npm --prefix distributor-app run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **(Optional) Run tests and verify production build**:
   ```bash
   # Run all automated unit and integration tests (258 tests)
   npm --prefix distributor-app test -- --run

   # Verify Next.js production build
   npm --prefix distributor-app run build
   ```

---

## 2. How It Is Deployed

The application is built on **Next.js 16 (App Router)** and deploys natively as a serverless application on **Vercel** with a **Neon PostgreSQL** database.

### Deployment Steps (Vercel)

1. **Import Repository**: Connect your GitHub repository to Vercel.
2. **Set Root Directory**: In Project Settings, set the Root Directory to `distributor-app`.
3. **Build Configuration**:
   - Framework Preset: `Next.js`
   - Build Command: `next build` (or `npm run build`)
   - Output Directory: `.next`
4. **Environment Variables**: Add the variable names specified in Section 3 in the Vercel Project Settings (`Settings` $\to$ `Environment Variables`).
5. **Deploy**: Trigger deployment. The production build compiles static and serverless routes automatically.

---

## 3. Environment Variables (Names Only)

> [!NOTE]
> Per security and compliance guidelines, only variable names are listed. Values and secrets must never be committed to source control.

### Required Variables
- `DATABASE_URL`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NODE_ENV`

### Optional / Integration Variables
- `GEMINI_MODEL`
- `ORDER_PARSER_PROVIDER`
- `CUSTOM_ML_API_URL`
- `SMS_PROVIDER`
- `SMS_API_KEY`
- `SMS_SENDER_ID`
- `AWS_ENDPOINT_URL_S3`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `S3_BUCKET_NAME`

---

## 4. Demo Login Details (For Reviewer)

The application comes pre-configured with seed trade accounts for Jabalpur FMCG distribution:

| Role | Mobile Number | Demo Persona & Business | Accessible Interfaces & Purpose |
| :--- | :--- | :--- | :--- |
| **Retailer (Kirana)** | `9826000001` | Ramesh Sharma<br/>*Sharma Kirana Store* | `/catalogue`, `/cart`, `/quick-order`<br/>• Wholesale ordering, trade scheme math, Hindi and Hinglish WhatsApp text orders. |
| **Order Desk (Admin)** | `9826000099` | Sunil Clerk<br/>*Company A Order Desk* | `/desk`<br/>• Split-screen WhatsApp verification, credit hold releases, van manifests, Tally Prime XML export. |
| **Salesman (Field)** | `9826000018` | Rajesh Kumar<br/>*Field Sales Representative* | `/orders`<br/>• Field beat order booking, route retailer selection. |

### OTP Authentication in Demo Mode
- **Dev Sandbox OTP Banner**: Clicking **"Send OTP"** generates a 6-digit code displayed directly inside the yellow banner on `/login` (`123456` or `716716`).
- **1-Tap Quick Login**: Click **"Instant Demo Login (Auto-Verify 123456) →"** to authenticate immediately without manual typing.
