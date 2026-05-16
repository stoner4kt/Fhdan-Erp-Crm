# Fhdan Fleet Hub — Setup Guide

> Built by Conextsol for Fhdan Tourism  
> Support: Tashreeq Jones | conextsol@zohomail.com | 066 119 2498

---

## Prerequisites

- Node.js 18+ (or use Cloudflare Pages which handles this)
- A Supabase account (https://supabase.com)
- A Resend account (https://resend.com)
- A Telegram account + bot
- A Cloudflare account (https://cloudflare.com)

---

## Step 1 — Supabase Setup

### 1.1 Create a Supabase Project

1. Go to https://app.supabase.com → **New Project**
2. Project name: `fhdan-fleet-hub`
3. Database password: Use a strong password and **save it securely**
4. Region: Choose **South Africa** (or nearest — Europe West 2 for lowest latency from ZA)
5. Click **Create new project** and wait ~2 minutes

### 1.2 Get Your API Keys

1. In your Supabase project → **Settings → API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ NEVER expose this publicly

### 1.3 Run the Database Schema

1. In Supabase → **SQL Editor** → **New Query**
2. Paste the entire contents of `schema.sql`
3. Click **Run** (green play button)
4. ✅ Verify all tables are created under **Table Editor**

### 1.4 Enable pg_cron Extension

1. Go to **Database → Extensions**
2. Search for `pg_cron` → Toggle ON
3. Also enable `pgcrypto` and `uuid-ossp`

### 1.5 Create Storage Buckets

1. Go to **Storage → Create Bucket**

| Bucket Name        | Public? | Purpose                            |
|--------------------|---------|------------------------------------|
| `secure-documents` | NO      | Passports, IDs (AES-256 encrypted) |
| `vouchers`         | NO      | Generated travel voucher PDFs      |
| `vehicle-images`   | YES     | Vehicle photos                     |

2. For `secure-documents` → **Policies** → Add policy:
   - SELECT: `auth.role() = 'authenticated' AND public.current_user_role() IN ('system_admin', 'manager')`
   - INSERT: `auth.role() = 'authenticated' AND public.current_user_role() IN ('system_admin', 'manager', 'sales_agent', 'fleet_coordinator')`

### 1.6 Create Your First Admin User

1. Go to **Authentication → Users → Invite User**
2. Enter the admin's email
3. After they sign up, go to **Table Editor → user_profiles**
4. Find their row and change `role` to `system_admin`

---

## Step 2 — Resend Email Setup

**For automated voucher emails and arrival alerts**

1. Go to https://resend.com → **Sign up / Login**
2. Go to **API Keys → Create API Key** → Name: `fhdan-fleet-hub`
3. Copy the key → `RESEND_API_KEY`
4. Go to **Domains → Add Domain** → `fhdantourism.co.za` (your domain)
5. Add the DNS records Resend shows you to your domain registrar
6. Wait for verification (usually 5-10 minutes)
7. Set `RESEND_FROM_EMAIL=noreply@fhdantourism.co.za`
8. Set `RESEND_FROM_NAME=Fhdan Tourism`

**Free tier:** 3,000 emails/month — sufficient for 500 bookings/month

---

## Step 3 — Telegram Bot Setup (Internal Alerts Demo)

**For real-time operational alerts to departments**

### 3.1 Create a Telegram Bot

1. Open Telegram → Search `@BotFather`
2. Send `/newbot`
3. Enter bot name: `FhdanFleetBot`
4. Enter username: `fhdan_fleet_bot` (must end in `bot`)
5. Copy the **API token** → `TELEGRAM_BOT_TOKEN`

### 3.2 Create Group Chats

1. Create 3 Telegram groups:
   - `Fhdan Operations` → add your bot
   - `Fhdan Sales` → add your bot
   - `Fhdan Finance` → add your bot
2. Send a message in each group
3. Visit: `https://api.telegram.org/botYOUR_TOKEN/getUpdates`
4. Look for `"chat":{"id":-XXXXXXXXX}` for each group
5. Set those IDs:
   - `TELEGRAM_CHAT_ID_OPS=-100XXXXXXXXX`
   - `TELEGRAM_CHAT_ID_SALES=-100XXXXXXXXX`
   - `TELEGRAM_CHAT_ID_FINANCE=-100XXXXXXXXX`

---

## Step 4 — Callmebot WhatsApp Setup (Optional)

**For WhatsApp alerts to specific numbers**

1. From the WhatsApp number you want to receive alerts on, send a message to `+34 644 13 22 07`:
   - Message: `I allow callmebot to send me messages`
2. You'll receive your **API key** via WhatsApp
3. Set: `CALLMEBOT_PHONE=+27XXXXXXXXX` (your number with country code)
4. Set: `CALLMEBOT_APIKEY=XXXXXXXX`

---

## Step 5 — Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in all values using your keys from Steps 1–4

3. Generate a secret for Next.js:
   ```bash
   openssl rand -base64 32
   ```
   → Set as `NEXTAUTH_SECRET`

---

## Step 6 — Deploy Supabase Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Set function secrets (same as .env.local values)
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set RESEND_FROM_EMAIL=noreply@fhdantourism.co.za
supabase secrets set RESEND_FROM_NAME=Fhdan Tourism
supabase secrets set TELEGRAM_BOT_TOKEN=...
supabase secrets set TELEGRAM_CHAT_ID_OPS=-100...
supabase secrets set TELEGRAM_CHAT_ID_SALES=-100...
supabase secrets set TELEGRAM_CHAT_ID_FINANCE=-100...
supabase secrets set CALLMEBOT_PHONE=+27...
supabase secrets set CALLMEBOT_APIKEY=...

# Deploy all Edge Functions
supabase functions deploy generate-voucher
supabase functions deploy send-arrival-alert
supabase functions deploy send-notifications
```

---

## Step 7 — Deploy to Cloudflare Pages


> If you manage Cloudflare config in `wrangler.toml`, keep non-sensitive `NEXT_PUBLIC_*` values in `[vars]` and keep sensitive server keys in Cloudflare Secrets.

1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit — Fhdan Fleet Hub"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/fhdan-fleet-hub.git
   git push -u origin main
   ```

2. Go to https://dash.cloudflare.com → **Workers & Pages → Create Application → Pages**
3. Connect to GitHub → select your repository
4. Build settings:
   - Framework preset: `Next.js`
   - Build command: `npm run build:cloudflare`
   - Build output directory: `.vercel/output/static`
5. Add Environment Variables in **both Preview and Production** environments:

   **Set as plain text variables (safe for browser exposure):**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (your Cloudflare Pages URL)
   - `NEXT_PUBLIC_VAULT_BUCKET` (recommended: `secure-documents`)

   **Set as Secrets (server-only sensitive values):**
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `RESEND_FROM_NAME`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID_OPS`
   - `TELEGRAM_CHAT_ID_SALES`
   - `TELEGRAM_CHAT_ID_FINANCE`
   - `CALLMEBOT_PHONE`
   - `CALLMEBOT_APIKEY`

6. Validate envs locally before pushing:
   ```bash
   npm run env:check
   ```
7. Click **Save and Deploy**

### Alternative: Netlify Deploy

```bash
npm install -g netlify-cli
netlify init
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://..."
# ... set all env vars
netlify deploy --prod
```

---

## Step 8 — Verify Installation

1. Visit your deployment URL
2. Log in with the admin user from Step 1.6
3. Check the Dispatcher's Cockpit loads
4. Create a test booking to verify the full flow
5. Test a voucher PDF generation

---

## Local Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Visit http://localhost:3000
```

---

## pg_cron Job Setup in Supabase SQL Editor

After the schema is applied, run these to set up the cron jobs:

```sql
-- Replace with your actual function URL
ALTER DATABASE postgres SET app.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';
ALTER DATABASE postgres SET app.service_role_key = 'YOUR_SERVICE_ROLE_KEY';

-- Schedule arrival alert function (every hour)
SELECT cron.schedule(
  'arrival-alerts',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-arrival-alert',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Schedule overdue invoice check (daily at midnight SAST)
SELECT cron.schedule('mark-overdue-invoices', '0 22 * * *', $$ SELECT public.update_overdue_invoices(); $$);
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "RLS policy violation" | Check user role in `user_profiles` table |
| Vouchers not emailing | Verify `RESEND_API_KEY` and domain verification |
| Telegram alerts not sending | Check `TELEGRAM_BOT_TOKEN` and bot is in the group |
| Storage upload fails | Verify bucket name matches `NEXT_PUBLIC_VAULT_BUCKET` |
| Build fails on Cloudflare | Check all env vars are set in Pages settings |

---

© 2026 Conextsol — Built for Fhdan Tourism
