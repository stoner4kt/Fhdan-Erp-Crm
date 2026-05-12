# Fhdan Fleet Hub — Services Architecture Map

> POPIA-Compliant · AES-256 Encrypted · 99.9% Uptime Target

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CLOUDFLARE EDGE                                  │
│  DDoS Protection · WAF · CDN · Zero-Trust Security                   │
├─────────────────────────────────────────────────────────────────────┤
│                   CLOUDFLARE PAGES                                    │
│       Next.js 14 (App Router) · Static + Server Actions               │
│       Globally distributed · Automatic CI/CD from GitHub              │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS (TLS 1.3)
┌────────────────────────────▼────────────────────────────────────────┐
│                        SUPABASE                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  PostgreSQL   │  │     Auth     │  │       Storage            │  │
│  │  + RLS/RBAC  │  │  JWT + Magic │  │  AES-256 Encrypted       │  │
│  │  + pg_cron   │  │  Link Auth   │  │  secure-documents bucket  │  │
│  │  + triggers  │  │  + OAuth     │  │  vouchers bucket          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                   EDGE FUNCTIONS (Deno)                          │ │
│  │  generate-voucher  │  send-arrival-alert  │  send-notifications  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
         │                        │                      │
         ▼                        ▼                      ▼
  ┌─────────────┐         ┌─────────────┐        ┌─────────────┐
  │   RESEND    │         │  TELEGRAM   │        │ CALLMEBOT   │
  │  Email API  │         │  Bot API    │        │  WhatsApp   │
  │  Vouchers   │         │  Ops/Sales  │        │  SMS-style  │
  │  Alerts     │         │  Finance    │        │  alerts     │
  └─────────────┘         └─────────────┘        └─────────────┘
```

---

## Service Registry

| Service | Provider | Purpose | Cost (Monthly) |
|---------|----------|---------|----------------|
| **Frontend Hosting** | Cloudflare Pages | Next.js deployment, CI/CD, CDN | Free–R700 |
| **Security/CDN** | Cloudflare | WAF, DDoS protection, edge routing | Free–R700 |
| **Database** | Supabase PostgreSQL | All operational data, RLS, triggers | R2,500–R3,500 |
| **Auth** | Supabase Auth | JWT, sessions, email magic links | Included |
| **Storage** | Supabase Storage | Encrypted documents, vouchers | Included |
| **Edge Functions** | Supabase (Deno) | PDF generation, notifications, cron | Included |
| **Email** | Resend | Vouchers, arrival alerts, deposit reminders | Free–R400 |
| **Telegram** | Telegram Bot API | Internal department alerts (demo) | Free |
| **WhatsApp** | Callmebot | WhatsApp operational alerts | Free |

---

## Data Flow

### 1. New Booking Flow

```
Sales Agent → New Booking Form
  ├── Rapid Profile Creator (UPSERT client)
  ├── Vehicle Selection → Availability Check (PostgreSQL RPC)
  ├── Pricing Calculation (VAT 15%, multi-currency)
  ├── Booking Created → DB Insert
  ├── Vehicle Status → 'booked' (trigger)
  ├── Telegram Alert → Sales channel
  └── High-value (>R20k) → Ops channel alert
```

### 2. Arrival Alert Flow (24h Before Pickup)

```
pg_cron (every hour)
  └── Edge Function: send-arrival-alert
        ├── Query bookings with pickup_datetime in [23h, 25h] window
        ├── Filter: arrival_alert_sent = false
        ├── Telegram → Ops channel
        ├── Callmebot → WhatsApp
        ├── Resend → Agency email
        └── Mark arrival_alert_sent = true
```

### 3. Voucher Generation Flow

```
User clicks "Generate Voucher"
  └── POST /api/voucher { booking_id }
        ├── Fetch full booking + client + vehicle + driver
        ├── jsPDF → Generate branded A4 PDF
        ├── Upload PDF → Supabase Storage (vouchers bucket)
        ├── Resend → Email PDF to client
        ├── Update booking.voucher_sent_at
        └── Audit log → voucher_generated
```

### 4. Document Vault Flow (POPIA)

```
Manager uploads document
  └── POST /api/documents (multipart form)
        ├── Validate: file type (PDF/JPG/PNG), max 10MB
        ├── Upload → Supabase Storage (secure-documents, AES-256)
        └── Save metadata → vault_documents table

Manager views document
  └── GET /api/documents/{id}/signed-url
        ├── RBAC check: role IN (system_admin, manager)
        ├── Generate signed URL (expires: 60 minutes)
        ├── POPIA Audit Log → VIEW_DOCUMENT action
        └── Return URL to client
```

---

## Database Tables

| Table | Purpose | RLS Level |
|-------|---------|-----------|
| `user_profiles` | Staff accounts with roles | Own record + Admin |
| `clients` | Client CRM (POPIA-scoped) | Sales/Manager/Finance |
| `vehicles` | 30-vehicle fleet registry | All staff |
| `drivers` | Driver roster | Fleet/Manager, Driver sees own |
| `bookings` | All trip bookings | Staff + Driver (own trips only) |
| `invoices` | Financial invoices | Finance/Manager only |
| `payments` | Payment records | Finance/Manager only |
| `vault_documents` | Encrypted PII documents | Manager/Admin ONLY |
| `audit_logs` | Immutable change log (POPIA) | Admin/Manager (READ ONLY) |
| `maintenance_records` | Vehicle service history | Fleet Coordinator |
| `exchange_rates` | Multi-currency rates | Finance (lock), Sales (read) |

---

## Security Layers

### Layer 1 — Cloudflare Edge
- WAF rules block SQL injection, XSS, CSRF
- DDoS protection at network layer
- IP reputation filtering
- Rate limiting on API paths

### Layer 2 — Application (Next.js)
- Middleware enforces authentication on all protected routes
- HTTPS-only (HSTS headers)
- Security headers: X-Frame-Options, CSP, HSTS, etc.
- Input validation with Zod schemas

### Layer 3 — Database (Supabase RLS)
- Row Level Security on every table
- JWT-based role claims
- `check_vehicle_availability()` atomic function (prevents race conditions)
- Immutable audit log (rules prevent DELETE/UPDATE)

### Layer 4 — Storage (POPIA)
- AES-256 encryption at rest
- Signed URLs expire after 60 minutes
- Every view/download is audit-logged
- Bucket is private (no public access)

---

## POPIA Compliance Measures

| Requirement | Implementation |
|-------------|----------------|
| Data minimisation | PII only collected when necessary |
| Purpose limitation | Role-based access prevents unauthorised use |
| Storage limitation | Document vault with controlled access |
| Accountability | Immutable audit trail (every change logged) |
| Security | AES-256 encryption, TLS 1.3, RLS |
| Subject access | Client data accessible to authorised staff only |
| Breach notification | Audit logs enable rapid incident response |

---

## Monthly Cost Estimate (30 vehicles, 500 bookings/month)

| Service | Free Tier | Paid Tier | Your Estimate |
|---------|-----------|-----------|---------------|
| Supabase | 500MB DB, 1GB storage, 50K edge invocations | Pro: $25/mo | R490–R3,500 |
| Cloudflare Pages | Unlimited requests | Pro: $20/mo | Free–R700 |
| Resend | 3,000 emails/mo | 50K: $20/mo | Free–R400 |
| Telegram | Free | Free | R0 |
| Callmebot | Free | Free | R0 |
| **Total** | | | **R490–R4,600** |

---

© 2026 Conextsol — Confidential
