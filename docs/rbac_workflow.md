# Fhdan Fleet Hub — RBAC & Permission Workflow

> Implements the access control architecture defined in `Fleet_Hub_RBAC_Mapping.pdf`

---

## Role Hierarchy

```
System Admin (highest)
    └── Manager
            ├── Finance Officer
            ├── Sales Agent
            ├── Fleet Coordinator
            └── Driver (lowest)
```

---

## Role Capability Matrix

| Permission | System Admin | Manager | Finance | Sales | Fleet Coord | Driver |
|-----------|:---:|:---:|:---:|:---:|:---:|:---:|
| **CLIENT MANAGEMENT** | | | | | | |
| View clients | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create/Update clients | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Delete clients | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **BOOKINGS** | | | | | | |
| View all bookings | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| View own trips only | — | — | — | — | — | ✅ |
| Create bookings | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Update bookings | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Delete bookings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Generate vouchers | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Download vouchers | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| **FLEET** | | | | | | |
| View vehicles | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Add/Update vehicles | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Delete vehicles | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **DRIVERS** | | | | | | |
| View drivers | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Assign drivers | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Manage driver records | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **FINANCE** | | | | | | |
| View invoices/payments | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create/Update invoices | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Record payments | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View profit margins | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Lock exchange rates | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **DOCUMENT VAULT (POPIA)** | | | | | | |
| Upload documents | ✅ | ✅ | ❌ | ✅* | ✅* | ❌ |
| View/Download documents | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete documents | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **AUDIT LOGS** | | | | | | |
| View audit logs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete audit logs | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **SETTINGS** | | | | | | |
| Manage users/roles | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage API keys | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View system settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

> `*` Sales agents and Fleet Coordinators can UPLOAD documents but CANNOT view/download them — they can only submit documents which Managers then review.

---

## Implementation Layers

### Layer 1 — Frontend (Next.js)
File: `lib/rbac.ts`

```typescript
// Check permission before rendering UI elements
import { can } from '@/lib/rbac';

if (can(user.role, 'document_view')) {
  // Show vault access
}

// Get navigation items filtered by role
const navItems = getVisibleNavItems(user.role);
```

### Layer 2 — API Routes
All API routes check role before processing:

```typescript
const { data: profile } = await supabase
  .from('user_profiles')
  .select('role')
  .eq('id', user.id)
  .single();

if (!can(profile.role, 'booking_create')) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### Layer 3 — Database (Supabase RLS)
Row Level Security policies enforce access AT THE DATABASE LAYER.
Even if the API is bypassed, the database rejects unauthorized queries.

Example — Drivers only see their own trips:
```sql
CREATE POLICY "Drivers see only assigned trips"
  ON public.bookings FOR SELECT
  USING (
    public.current_user_role() = 'driver'
    AND driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  );
```

---

## Operational Scenarios

### Scenario 1: "The Ghost Invoice" (Finance Accountability)

**Incident:** A Finance user accidentally deletes an invoice entry.

**RBAC Response:**
1. The deletion itself is recorded in `audit_logs` (immutable, cannot be erased)
2. Manager logs in → **Settings → Audit Logs**
3. Filters by `action = DELETE` and `table_name = invoices`
4. Sees: who deleted it, exact timestamp, complete original record (in `old_data`)
5. Manager recreates the invoice using the saved data

**Technical Flow:**
```
Finance DELETE invoice
  → PostgreSQL trigger: audit_trigger_fn()
  → INSERT into audit_logs (immutable)
  → Rule: audit_logs_no_delete prevents log deletion
  → Manager views complete forensic trail
```

---

### Scenario 2: "The Privacy Breach Attempt" (POPIA Protection)

**Incident:** A Driver tries to access the Finance dashboard to see client billing amounts.

**RBAC Response:**
1. Frontend: `can(driver.role, 'finance_dashboard')` returns `false` → Finance nav item not shown
2. Direct URL: If driver navigates to `/finance` → middleware redirects to `/dashboard`
3. API: Even if driver crafts a direct API call, RLS policy rejects it:
   ```
   "Finance and managers view invoices" policy:
   USING (role IN ('system_admin', 'manager', 'finance_officer'))
   → Driver role returns empty result set (403 Forbidden)
   ```
4. Result: Zero data exposed — enforced at 3 layers

---

### Scenario 3: "The Double Booking" (Atomic Availability Engine)

**Incident:** Two Sales Agents try to book the same vehicle simultaneously.

**RBAC Response:**
1. Agent 1 submits booking → `check_vehicle_availability()` called
2. Agent 2 submits booking → `check_vehicle_availability()` called
3. PostgreSQL atomic function runs inside a transaction:
   ```sql
   SELECT COUNT(*) FROM bookings 
   WHERE vehicle_id = p_vehicle_id
   AND status NOT IN ('cancelled', 'completed', 'no_show')
   AND pickup_datetime < p_dropoff_datetime
   ```
4. First transaction commits → vehicle is booked
5. Second transaction sees existing booking → returns `FALSE` (not available)
6. Agent 2 receives: `"Vehicle is not available for the selected dates"`
7. No double booking is possible — enforced atomically in PostgreSQL

---

### Scenario 4: "Document Access" (POPIA Vault)

**Incident:** A Sales Agent tries to view a client's passport after uploading it.

**RBAC Response:**
1. Sales Agent can UPLOAD documents (they receive from clients during booking)
2. Sales Agent CANNOT view documents:
   - Frontend: Vault nav item not shown (`document_view` permission denied)
   - API: `/api/documents/[id]/signed-url` returns 403 Forbidden
   - Database RLS: `vault_documents SELECT` policy denies sales_agent role
3. Manager/Admin is the only person who can generate signed URLs
4. Every view is recorded: `audit_logs → action = VIEW_DOCUMENT`

---

## JWT Claims & Custom Roles

Supabase Auth stores the role in the `user_profiles` table.
The `current_user_role()` function reads it via `auth.uid()` for RLS policies.

To add a role to a custom JWT (for future use with Supabase JWTs):
```sql
-- In Supabase Auth Hook (if using custom JWT claims):
CREATE OR REPLACE FUNCTION auth.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  claims jsonb;
  user_role text;
BEGIN
  claims := event->'claims';
  SELECT role::text INTO user_role FROM public.user_profiles WHERE id = (event->>'user_id')::uuid;
  claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;
```

---

## Assigning Roles

Only a System Admin can change user roles:

**Via Supabase Dashboard:**
1. Table Editor → `user_profiles`
2. Find the user by email
3. Edit the `role` column
4. Save

**Via Admin UI (`/settings`):**
The Settings page lists all users with their roles and allows admins to manage them.

---

## Role Assignment Quick Reference

| Use Case | Assign Role |
|----------|-------------|
| IT/Owner | `system_admin` |
| Branch Manager | `manager` |
| Accountant/Bookkeeper | `finance_officer` |
| Reservation Agent | `sales_agent` |
| Vehicle/Fleet Manager | `fleet_coordinator` |
| Driver/Chauffeur | `driver` |

---

© 2026 Conextsol — Enterprise Travel & Fleet Operations Hub — Confidential
