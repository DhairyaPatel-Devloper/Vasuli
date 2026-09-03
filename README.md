# Payment Recovery Engine

Autonomous AI-driven payment recovery and revenue leak engine built for **Razorpay AI Buildathon Track 03 (AI Revenue Recovery)**.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: JavaScript (React JSX)
- **Database & Auth**: Supabase
- **Styling**: Tailwind CSS with Space Grotesk, IBM Plex Sans, IBM Plex Mono

## Key Architecture & Features
1. **Dynamic Credential Resolution**: Automatic key rotation & fallback strategy across provider categories (Razorpay, Gemini, Resend, Twilio, Sarvam) via `lib/credential-resolver.js`. Escalates to human operator queue if all keys fail.
2. **Autonomous Recovery Lifecycle**:
   - **Detect**: Razorpay payment failure webhooks.
   - **Diagnose**: AI-powered root-cause analysis (via Gemini/LLMs).
   - **Decide**: Expected Value (EV) scoring engine prioritizing high-yield recovery strategies.
   - **Guard**: Automated compliance enforcing daily/total limits, quiet hours, cooldowns, and hard-stop keywords (`policy_config`).
   - **Act**: Real execution of recovery actions (test-mode Razorpay retries, payment links, customer notifications).
   - **Log**: Complete immutable event auditing (`audit_log`).
3. **Role-Based Workspaces**:
   - **Admin Workspace**: Executive dashboard, case inspection, policy management, full audit trail, API key management, operator team management.
   - **Operator Workspace**: Dedicated escalation queue for human overrides, resolution workflows, and individual audit logs.

## Setup Instructions

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local` and set your Supabase keys:
   ```bash
   cp .env.example .env.local
   ```
   Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.
