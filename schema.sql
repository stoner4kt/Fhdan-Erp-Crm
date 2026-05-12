-- ============================================================
-- FHDAN FLEET HUB — COMPLETE DATABASE SCHEMA
-- ============================================================
-- Run this in: Supabase Dashboard → SQL Editor
-- Prerequisites: Enable pgcrypto, pg_cron extensions first
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'system_admin', 'manager', 'finance_officer',
  'sales_agent', 'fleet_coordinator', 'driver'
);

CREATE TYPE client_type AS ENUM ('individual', 'corporate', 'government');
CREATE TYPE client_status AS ENUM ('active', 'inactive', 'blacklisted');
CREATE TYPE currency_code AS ENUM ('ZAR', 'USD', 'EUR', 'GBP', 'AED');
CREATE TYPE tax_zone AS ENUM ('standard', 'exempt', 'foreign');

CREATE TYPE vehicle_status AS ENUM ('available', 'booked', 'maintenance', 'inactive');
CREATE TYPE drive_mode AS ENUM ('chauffeur', 'self_drive', 'both');
CREATE TYPE fuel_type AS ENUM ('petrol', 'diesel', 'electric', 'hybrid');
CREATE TYPE vehicle_category AS ENUM ('sedan', 'suv', 'luxury', 'minibus', 'bus', 'van', 'pickup');

CREATE TYPE booking_status AS ENUM (
  'quote', 'pending_deposit', 'confirmed',
  'active', 'completed', 'cancelled', 'no_show'
);
CREATE TYPE booking_type AS ENUM ('chauffeur', 'self_drive');

CREATE TYPE driver_status AS ENUM ('available', 'on_trip', 'off_duty', 'suspended');
CREATE TYPE license_code AS ENUM ('B', 'C', 'C1', 'EB', 'PDP');

CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'void');
CREATE TYPE payment_method AS ENUM ('eft', 'cash', 'card', 'crypto', 'other');

CREATE TYPE document_type AS ENUM (
  'passport', 'rsa_id', 'drivers_license', 'pdp',
  'vehicle_registration', 'insurance', 'roadworthy', 'other'
);

CREATE TYPE audit_action AS ENUM (
  'INSERT', 'UPDATE', 'DELETE',
  'VIEW_DOCUMENT', 'DOWNLOAD_DOCUMENT',
  'LOGIN', 'LOGOUT', 'ROLE_CHANGE', 'SETTING_CHANGE'
);

CREATE TYPE maintenance_type AS ENUM (
  'routine_service', 'repair', 'inspection',
  'tyre_change', 'brake_service', 'other'
);

-- ============================================================
-- TABLE: user_profiles
-- Links to auth.users; stores role and profile data
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'sales_agent',
  avatar_url    TEXT,
  phone         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create user_profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'sales_agent')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TABLE: clients
-- CRM: POPIA-compliant client profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clients (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 TEXT NOT NULL UNIQUE,
  full_name             TEXT NOT NULL,
  phone                 TEXT,
  id_number             TEXT UNIQUE,         -- SA ID or passport
  client_type           client_type NOT NULL DEFAULT 'individual',
  status                client_status NOT NULL DEFAULT 'active',
  company_name          TEXT,
  vat_number            TEXT,
  tax_zone              tax_zone NOT NULL DEFAULT 'standard',
  preferred_currency    currency_code NOT NULL DEFAULT 'ZAR',
  payment_terms_days    INTEGER NOT NULL DEFAULT 30,
  address               TEXT,
  city                  TEXT,
  country               TEXT NOT NULL DEFAULT 'South Africa',
  notes                 TEXT,
  created_by            UUID NOT NULL REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_email ON public.clients(email);
CREATE INDEX idx_clients_id_number ON public.clients(id_number);
CREATE INDEX idx_clients_status ON public.clients(status);

-- ============================================================
-- TABLE: vehicles
-- 30-vehicle fleet with dual-mode support
-- ============================================================

CREATE TABLE IF NOT EXISTS public.vehicles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration          TEXT NOT NULL UNIQUE,
  make                  TEXT NOT NULL,
  model                 TEXT NOT NULL,
  year                  SMALLINT NOT NULL,
  color                 TEXT NOT NULL,
  category              vehicle_category NOT NULL DEFAULT 'sedan',
  fuel_type             fuel_type NOT NULL DEFAULT 'petrol',
  seating_capacity      SMALLINT NOT NULL DEFAULT 4,
  drive_modes           drive_mode NOT NULL DEFAULT 'both',
  status                vehicle_status NOT NULL DEFAULT 'available',
  daily_rate_zar        NUMERIC(10,2) NOT NULL DEFAULT 0,
  chauffeur_rate_zar    NUMERIC(10,2) NOT NULL DEFAULT 0,
  odometer_km           INTEGER NOT NULL DEFAULT 0,
  last_service_date     DATE,
  next_service_due_km   INTEGER,
  insurance_expiry      DATE,
  roadworthy_expiry     DATE,
  gps_tracker_id        TEXT,
  image_url             TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_status ON public.vehicles(status);
CREATE INDEX idx_vehicles_registration ON public.vehicles(registration);

-- ============================================================
-- TABLE: drivers
-- ============================================================

CREATE TABLE IF NOT EXISTS public.drivers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name       TEXT NOT NULL,
  phone           TEXT NOT NULL,
  email           TEXT,
  id_number       TEXT NOT NULL UNIQUE,
  license_number  TEXT NOT NULL UNIQUE,
  license_code    license_code NOT NULL DEFAULT 'EB',
  license_expiry  DATE NOT NULL,
  pdp_expiry      DATE,
  status          driver_status NOT NULL DEFAULT 'available',
  rating          NUMERIC(3,2) CHECK (rating >= 1 AND rating <= 5),
  total_trips     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drivers_status ON public.drivers(status);
CREATE INDEX idx_drivers_user_id ON public.drivers(user_id);

-- ============================================================
-- TABLE: bookings
-- Core booking table with dual-mode support
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bookings (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference         TEXT NOT NULL UNIQUE,
  client_id                 UUID NOT NULL REFERENCES public.clients(id),
  vehicle_id                UUID NOT NULL REFERENCES public.vehicles(id),
  driver_id                 UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  assigned_by               UUID REFERENCES auth.users(id),
  booking_type              booking_type NOT NULL DEFAULT 'chauffeur',
  status                    booking_status NOT NULL DEFAULT 'pending_deposit',

  -- Dates
  pickup_datetime           TIMESTAMPTZ NOT NULL,
  dropoff_datetime          TIMESTAMPTZ NOT NULL,
  actual_return_datetime    TIMESTAMPTZ,

  -- Locations
  pickup_location           TEXT NOT NULL,
  dropoff_location          TEXT NOT NULL,
  pickup_lat                NUMERIC(10,6),
  pickup_lng                NUMERIC(10,6),

  -- Financials
  currency                  currency_code NOT NULL DEFAULT 'ZAR',
  exchange_rate_locked      NUMERIC(10,6) NOT NULL DEFAULT 1,
  subtotal_zar              NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount_zar       NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_amount_zar            NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_zar                 NUMERIC(12,2) NOT NULL DEFAULT 0,
  deposit_amount_zar        NUMERIC(12,2) NOT NULL DEFAULT 0,
  deposit_paid              BOOLEAN NOT NULL DEFAULT FALSE,
  deposit_paid_at           TIMESTAMPTZ,
  balance_due_zar           NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_terms_days        INTEGER NOT NULL DEFAULT 30,

  -- Extras
  extra_services            JSONB,
  special_requirements      TEXT,
  internal_notes            TEXT,

  -- Voucher
  voucher_url               TEXT,
  voucher_sent_at           TIMESTAMPTZ,

  -- Alerts
  arrival_alert_sent        BOOLEAN NOT NULL DEFAULT FALSE,

  -- Metadata
  created_by                UUID NOT NULL REFERENCES auth.users(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_dates CHECK (dropoff_datetime > pickup_datetime),
  CONSTRAINT chk_amounts CHECK (
    subtotal_zar >= 0 AND
    discount_amount_zar >= 0 AND
    vat_amount_zar >= 0 AND
    total_zar >= 0 AND
    deposit_amount_zar >= 0 AND
    balance_due_zar >= 0
  )
);

CREATE INDEX idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX idx_bookings_vehicle_id ON public.bookings(vehicle_id);
CREATE INDEX idx_bookings_driver_id ON public.bookings(driver_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_pickup_datetime ON public.bookings(pickup_datetime);
CREATE INDEX idx_bookings_reference ON public.bookings(booking_reference);

-- ============================================================
-- DUAL-MODE AVAILABILITY ENGINE
-- Atomic PostgreSQL function to prevent double-booking
-- Checks both Chauffeur and Self-Drive overlap
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_vehicle_availability(
  p_vehicle_id         UUID,
  p_pickup_datetime    TIMESTAMPTZ,
  p_dropoff_datetime   TIMESTAMPTZ,
  p_booking_type       TEXT,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Check for overlapping bookings on the same vehicle
  -- A booking conflicts if: pickup < existing_dropoff AND dropoff > existing_pickup
  SELECT COUNT(*) INTO conflict_count
  FROM public.bookings
  WHERE
    vehicle_id = p_vehicle_id
    AND status NOT IN ('cancelled', 'completed', 'no_show')
    AND (
      -- Time overlap check
      pickup_datetime < p_dropoff_datetime
      AND dropoff_datetime > p_pickup_datetime
    )
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id);

  -- If any conflict found, vehicle is NOT available
  RETURN conflict_count = 0;
END;
$$;

-- Trigger to auto-update vehicle status based on bookings
CREATE OR REPLACE FUNCTION public.sync_vehicle_status()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- When booking becomes active, mark vehicle as booked
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status != 'active') THEN
    UPDATE public.vehicles SET status = 'booked', updated_at = NOW()
    WHERE id = NEW.vehicle_id;
  END IF;

  -- When booking completes/cancels, release vehicle
  IF NEW.status IN ('completed', 'cancelled', 'no_show') AND
     (OLD IS NULL OR OLD.status NOT IN ('completed', 'cancelled', 'no_show')) THEN
    -- Only free if no other active bookings for this vehicle
    IF NOT EXISTS (
      SELECT 1 FROM public.bookings
      WHERE vehicle_id = NEW.vehicle_id
        AND id != NEW.id
        AND status IN ('active', 'confirmed')
    ) THEN
      UPDATE public.vehicles SET status = 'available', updated_at = NOW()
      WHERE id = NEW.vehicle_id AND status = 'booked';
    END IF;
  END IF;

  -- Update driver status
  IF NEW.driver_id IS NOT NULL THEN
    IF NEW.status = 'active' THEN
      UPDATE public.drivers SET status = 'on_trip', updated_at = NOW()
      WHERE id = NEW.driver_id;
      UPDATE public.drivers SET total_trips = total_trips + 1
      WHERE id = NEW.driver_id AND NOT EXISTS (
        SELECT 1 FROM public.bookings WHERE id = NEW.id AND OLD.status = 'active'
      );
    ELSIF NEW.status IN ('completed', 'cancelled') THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.bookings
        WHERE driver_id = NEW.driver_id AND id != NEW.id AND status = 'active'
      ) THEN
        UPDATE public.drivers SET status = 'available', updated_at = NOW()
        WHERE id = NEW.driver_id AND status = 'on_trip';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_vehicle_status
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_vehicle_status();

-- ============================================================
-- TABLE: invoices
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number    TEXT NOT NULL UNIQUE,
  booking_id        UUID NOT NULL REFERENCES public.bookings(id),
  client_id         UUID NOT NULL REFERENCES public.clients(id),
  status            invoice_status NOT NULL DEFAULT 'draft',
  line_items        JSONB NOT NULL DEFAULT '[]',
  subtotal_zar      NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_rate          NUMERIC(5,4) NOT NULL DEFAULT 0.15,
  vat_amount_zar    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_zar         NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid_zar   NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_due_zar   NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date          DATE NOT NULL,
  paid_date         DATE,
  payment_method    payment_method,
  payment_reference TEXT,
  pdf_url           TEXT,
  notes             TEXT,
  created_by        UUID NOT NULL REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-mark invoices as overdue
CREATE OR REPLACE FUNCTION public.update_overdue_invoices()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.invoices
  SET status = 'overdue', updated_at = NOW()
  WHERE status = 'sent'
    AND due_date < CURRENT_DATE
    AND balance_due_zar > 0;
END;
$$;

CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);

-- ============================================================
-- TABLE: payments
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    UUID NOT NULL REFERENCES public.invoices(id),
  amount_zar    NUMERIC(12,2) NOT NULL,
  method        payment_method NOT NULL DEFAULT 'eft',
  reference     TEXT,
  notes         TEXT,
  created_by    UUID NOT NULL REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update invoice balances when payment recorded
CREATE OR REPLACE FUNCTION public.update_invoice_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  total_paid NUMERIC(12,2);
BEGIN
  SELECT COALESCE(SUM(amount_zar), 0) INTO total_paid
  FROM public.payments WHERE invoice_id = NEW.invoice_id;

  UPDATE public.invoices
  SET
    amount_paid_zar = total_paid,
    balance_due_zar = GREATEST(total_zar - total_paid, 0),
    status = CASE
      WHEN total_paid >= total_zar THEN 'paid'::invoice_status
      ELSE status
    END,
    paid_date = CASE WHEN total_paid >= total_zar THEN NOW()::DATE ELSE paid_date END,
    updated_at = NOW()
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_invoice_on_payment
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_invoice_on_payment();

-- ============================================================
-- TABLE: vault_documents
-- AES-256 encrypted document storage (POPIA compliant)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.vault_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('client', 'driver', 'vehicle')),
  entity_id       UUID NOT NULL,
  document_type   document_type NOT NULL,
  file_name       TEXT NOT NULL,
  file_path       TEXT NOT NULL UNIQUE,    -- Supabase Storage path
  file_size_bytes INTEGER NOT NULL,
  mime_type       TEXT NOT NULL,
  expiry_date     DATE,
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by     UUID REFERENCES auth.users(id),
  verified_at     TIMESTAMPTZ,
  notes           TEXT,
  uploaded_by     UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vault_entity ON public.vault_documents(entity_type, entity_id);
CREATE INDEX idx_vault_doc_type ON public.vault_documents(document_type);

-- ============================================================
-- TABLE: audit_logs (IMMUTABLE — NO UPDATES OR DELETES)
-- POPIA: Every data change is permanently recorded
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name        TEXT NOT NULL,
  record_id         TEXT NOT NULL,
  action            audit_action NOT NULL,
  old_data          JSONB,
  new_data          JSONB,
  changed_by        TEXT NOT NULL,          -- UUID or 'system'
  changed_by_email  TEXT,
  changed_by_role   TEXT,
  ip_address        TEXT,
  user_agent        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_table ON public.audit_logs(table_name);
CREATE INDEX idx_audit_record ON public.audit_logs(record_id);
CREATE INDEX idx_audit_changed_by ON public.audit_logs(changed_by);
CREATE INDEX idx_audit_created_at ON public.audit_logs(created_at DESC);

-- IMMUTABILITY ENFORCEMENT — Deny ALL DELETE and UPDATE on audit_logs
CREATE OR REPLACE RULE audit_logs_no_delete AS
  ON DELETE TO public.audit_logs DO INSTEAD NOTHING;

CREATE OR REPLACE RULE audit_logs_no_update AS
  ON UPDATE TO public.audit_logs DO INSTEAD NOTHING;

-- ============================================================
-- TABLE: maintenance_records
-- ============================================================

CREATE TABLE IF NOT EXISTS public.maintenance_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id            UUID NOT NULL REFERENCES public.vehicles(id),
  maintenance_type      maintenance_type NOT NULL DEFAULT 'routine_service',
  description           TEXT NOT NULL,
  cost_zar              NUMERIC(10,2) NOT NULL DEFAULT 0,
  odometer_at_service   INTEGER NOT NULL DEFAULT 0,
  service_provider      TEXT NOT NULL,
  service_date          DATE NOT NULL,
  next_service_date     DATE,
  documents             JSONB,
  logged_by             UUID NOT NULL REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maintenance_vehicle_id ON public.maintenance_records(vehicle_id);

-- ============================================================
-- TABLE: exchange_rates
-- Multi-currency with locked rates for bookings
-- ============================================================

CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_from   currency_code NOT NULL,
  currency_to     currency_code NOT NULL,
  rate            NUMERIC(16,6) NOT NULL,
  locked_by       UUID REFERENCES auth.users(id),
  locked_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(currency_from, currency_to)
);

-- Seed default ZAR rates
INSERT INTO public.exchange_rates (currency_from, currency_to, rate) VALUES
  ('USD', 'ZAR', 18.50),
  ('EUR', 'ZAR', 20.10),
  ('GBP', 'ZAR', 23.40),
  ('AED', 'ZAR', 5.04)
ON CONFLICT (currency_from, currency_to) DO NOTHING;

-- ============================================================
-- GENERIC AUDIT TRIGGER — auto-logs all table changes
-- ============================================================

CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_old_data JSONB := NULL;
  v_new_data JSONB := NULL;
  v_action   TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old_data := to_jsonb(OLD);
    v_action := 'DELETE';
  ELSIF TG_OP = 'INSERT' THEN
    v_new_data := to_jsonb(NEW);
    v_action := 'INSERT';
  ELSE
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_action := 'UPDATE';
  END IF;

  INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(to_jsonb(NEW)->>'id', to_jsonb(OLD)->>'id', 'unknown'),
    v_action::audit_action,
    v_old_data,
    v_new_data,
    COALESCE(auth.uid()::TEXT, 'system')
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach audit trigger to all key tables
DO $$ BEGIN
  -- bookings
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_bookings') THEN
    CREATE TRIGGER trg_audit_bookings
      AFTER INSERT OR UPDATE OR DELETE ON public.bookings
      FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
  END IF;

  -- clients
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_clients') THEN
    CREATE TRIGGER trg_audit_clients
      AFTER INSERT OR UPDATE OR DELETE ON public.clients
      FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
  END IF;

  -- invoices
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_invoices') THEN
    CREATE TRIGGER trg_audit_invoices
      AFTER INSERT OR UPDATE OR DELETE ON public.invoices
      FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
  END IF;

  -- vehicles
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_vehicles') THEN
    CREATE TRIGGER trg_audit_vehicles
      AFTER INSERT OR UPDATE OR DELETE ON public.vehicles
      FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
  END IF;

  -- user_profiles
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_user_profiles') THEN
    CREATE TRIGGER trg_audit_user_profiles
      AFTER INSERT OR UPDATE OR DELETE ON public.user_profiles
      FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
  END IF;
END; $$;

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_updated_clients') THEN
    CREATE TRIGGER trg_updated_clients BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_updated_vehicles') THEN
    CREATE TRIGGER trg_updated_vehicles BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_updated_bookings') THEN
    CREATE TRIGGER trg_updated_bookings BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_updated_drivers') THEN
    CREATE TRIGGER trg_updated_drivers BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_updated_invoices') THEN
    CREATE TRIGGER trg_updated_invoices BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_updated_profiles') THEN
    CREATE TRIGGER trg_updated_profiles BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END; $$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — RBAC ENGINE
-- Enforced at the database layer via JWT claims
-- ============================================================

-- Helper: get current user's role from user_profiles
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role::TEXT FROM public.user_profiles WHERE id = auth.uid();
$$;

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────
-- RLS: user_profiles
-- ──────────────────────────────────────────────────────────
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles FOR SELECT
  USING (public.current_user_role() IN ('system_admin', 'manager'));

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can manage all profiles"
  ON public.user_profiles FOR ALL
  USING (public.current_user_role() = 'system_admin');

-- ──────────────────────────────────────────────────────────
-- RLS: clients (POPIA — scoped by role)
-- ──────────────────────────────────────────────────────────
CREATE POLICY "Sales, managers, finance can view clients"
  ON public.clients FOR SELECT
  USING (
    public.current_user_role() IN ('system_admin', 'manager', 'sales_agent', 'finance_officer')
  );

CREATE POLICY "Sales agents and managers can create clients"
  ON public.clients FOR INSERT
  WITH CHECK (
    public.current_user_role() IN ('system_admin', 'manager', 'sales_agent')
  );

CREATE POLICY "Sales agents and managers can update clients"
  ON public.clients FOR UPDATE
  USING (
    public.current_user_role() IN ('system_admin', 'manager', 'sales_agent')
  );

CREATE POLICY "Only admins can delete clients"
  ON public.clients FOR DELETE
  USING (public.current_user_role() = 'system_admin');

-- ──────────────────────────────────────────────────────────
-- RLS: vehicles
-- ──────────────────────────────────────────────────────────
CREATE POLICY "All staff can view vehicles"
  ON public.vehicles FOR SELECT
  USING (
    public.current_user_role() IN (
      'system_admin', 'manager', 'sales_agent',
      'finance_officer', 'fleet_coordinator'
    )
  );

CREATE POLICY "Fleet coordinators and managers can manage vehicles"
  ON public.vehicles FOR INSERT
  WITH CHECK (
    public.current_user_role() IN ('system_admin', 'manager', 'fleet_coordinator')
  );

CREATE POLICY "Fleet coordinators and managers can update vehicles"
  ON public.vehicles FOR UPDATE
  USING (
    public.current_user_role() IN ('system_admin', 'manager', 'fleet_coordinator')
  );

CREATE POLICY "Only admins can delete vehicles"
  ON public.vehicles FOR DELETE
  USING (public.current_user_role() = 'system_admin');

-- ──────────────────────────────────────────────────────────
-- RLS: bookings (Drivers only see their own trips)
-- ──────────────────────────────────────────────────────────
CREATE POLICY "Staff can view all bookings"
  ON public.bookings FOR SELECT
  USING (
    public.current_user_role() IN (
      'system_admin', 'manager', 'sales_agent',
      'finance_officer', 'fleet_coordinator'
    )
  );

CREATE POLICY "Drivers see only assigned trips"
  ON public.bookings FOR SELECT
  USING (
    public.current_user_role() = 'driver'
    AND driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Sales agents and managers can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (
    public.current_user_role() IN ('system_admin', 'manager', 'sales_agent')
  );

CREATE POLICY "Staff can update bookings"
  ON public.bookings FOR UPDATE
  USING (
    public.current_user_role() IN ('system_admin', 'manager', 'sales_agent', 'fleet_coordinator')
  );

CREATE POLICY "Managers and admins can delete bookings"
  ON public.bookings FOR DELETE
  USING (public.current_user_role() IN ('system_admin', 'manager'));

-- ──────────────────────────────────────────────────────────
-- RLS: drivers
-- ──────────────────────────────────────────────────────────
CREATE POLICY "Staff can view drivers"
  ON public.drivers FOR SELECT
  USING (
    public.current_user_role() IN (
      'system_admin', 'manager', 'sales_agent', 'fleet_coordinator'
    )
  );

CREATE POLICY "Fleet coordinators manage drivers"
  ON public.drivers FOR ALL
  USING (
    public.current_user_role() IN ('system_admin', 'manager', 'fleet_coordinator')
  );

CREATE POLICY "Drivers view own record"
  ON public.drivers FOR SELECT
  USING (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────
-- RLS: invoices (Finance only)
-- ──────────────────────────────────────────────────────────
CREATE POLICY "Finance and managers view invoices"
  ON public.invoices FOR SELECT
  USING (
    public.current_user_role() IN ('system_admin', 'manager', 'finance_officer')
  );

CREATE POLICY "Finance creates invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (
    public.current_user_role() IN ('system_admin', 'manager', 'finance_officer')
  );

CREATE POLICY "Finance updates invoices"
  ON public.invoices FOR UPDATE
  USING (
    public.current_user_role() IN ('system_admin', 'manager', 'finance_officer')
  );

CREATE POLICY "Managers and admins delete invoices"
  ON public.invoices FOR DELETE
  USING (public.current_user_role() IN ('system_admin', 'manager'));

-- ──────────────────────────────────────────────────────────
-- RLS: payments
-- ──────────────────────────────────────────────────────────
CREATE POLICY "Finance views payments"
  ON public.payments FOR SELECT
  USING (
    public.current_user_role() IN ('system_admin', 'manager', 'finance_officer')
  );

CREATE POLICY "Finance records payments"
  ON public.payments FOR INSERT
  WITH CHECK (
    public.current_user_role() IN ('system_admin', 'manager', 'finance_officer')
  );

-- ──────────────────────────────────────────────────────────
-- RLS: vault_documents (POPIA — managers and admins ONLY)
-- ──────────────────────────────────────────────────────────
CREATE POLICY "Managers and admins view vault documents"
  ON public.vault_documents FOR SELECT
  USING (
    public.current_user_role() IN ('system_admin', 'manager')
  );

CREATE POLICY "Authorised staff can upload documents"
  ON public.vault_documents FOR INSERT
  WITH CHECK (
    public.current_user_role() IN (
      'system_admin', 'manager', 'sales_agent', 'fleet_coordinator'
    )
  );

CREATE POLICY "Only admins can delete vault documents"
  ON public.vault_documents FOR DELETE
  USING (public.current_user_role() = 'system_admin');

-- ──────────────────────────────────────────────────────────
-- RLS: audit_logs (READ-ONLY — admins and managers)
-- ──────────────────────────────────────────────────────────
CREATE POLICY "Admins and managers view audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    public.current_user_role() IN ('system_admin', 'manager')
  );

-- No INSERT policy via UI — only via security definer functions
-- No UPDATE or DELETE — enforced by the immutability rules above

-- ──────────────────────────────────────────────────────────
-- RLS: maintenance_records
-- ──────────────────────────────────────────────────────────
CREATE POLICY "Fleet coordinators and managers view maintenance"
  ON public.maintenance_records FOR SELECT
  USING (
    public.current_user_role() IN ('system_admin', 'manager', 'fleet_coordinator')
  );

CREATE POLICY "Fleet coordinators log maintenance"
  ON public.maintenance_records FOR INSERT
  WITH CHECK (
    public.current_user_role() IN ('system_admin', 'manager', 'fleet_coordinator')
  );

-- ──────────────────────────────────────────────────────────
-- RLS: exchange_rates
-- ──────────────────────────────────────────────────────────
CREATE POLICY "All staff view exchange rates"
  ON public.exchange_rates FOR SELECT
  USING (
    public.current_user_role() IN (
      'system_admin', 'manager', 'finance_officer', 'sales_agent'
    )
  );

CREATE POLICY "Finance locks exchange rates"
  ON public.exchange_rates FOR UPDATE
  USING (
    public.current_user_role() IN ('system_admin', 'manager', 'finance_officer')
  );

-- ============================================================
-- SUPABASE STORAGE — BUCKET SETUP
-- Run via Supabase Dashboard → Storage (or via API)
-- ============================================================

-- NOTE: Execute these via Supabase Dashboard or Storage API:
-- 1. Create bucket: 'secure-documents'  (PRIVATE, server-side only)
-- 2. Create bucket: 'vouchers'          (PRIVATE, signed URLs)
-- 3. Create bucket: 'vehicle-images'    (PUBLIC)
--
-- Storage RLS policies are set in the Dashboard under Storage → Policies
-- secure-documents: Only authenticated users with 'manager'/'system_admin' role

-- ============================================================
-- PG_CRON — SCHEDULED JOBS
-- Run these after enabling pg_cron extension in Supabase
-- ============================================================

-- 1. Send arrival alerts every hour (checks 24h window)
SELECT cron.schedule(
  'arrival-alerts-hourly',
  '0 * * * *',  -- Every hour at :00
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-arrival-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 2. Mark overdue invoices daily at midnight
SELECT cron.schedule(
  'mark-overdue-invoices',
  '0 0 * * *',  -- Daily at midnight
  $$ SELECT public.update_overdue_invoices(); $$
);

-- ============================================================
-- SEED DATA — Sample vehicles for Fhdan Tourism
-- ============================================================

INSERT INTO public.vehicles (registration, make, model, year, color, category, fuel_type, seating_capacity, drive_modes, status, daily_rate_zar, chauffeur_rate_zar) VALUES
  ('CA 123-456', 'Toyota', 'Camry', 2023, 'Pearl White', 'sedan', 'petrol', 5, 'both', 'available', 1200, 1800),
  ('CA 234-567', 'Mercedes-Benz', 'E-Class', 2023, 'Obsidian Black', 'luxury', 'petrol', 5, 'chauffeur', 'available', 0, 3500),
  ('CA 345-678', 'BMW', '5 Series', 2022, 'Alpine White', 'luxury', 'petrol', 5, 'chauffeur', 'available', 0, 3200),
  ('CA 456-789', 'Toyota', 'HiAce', 2022, 'Silver', 'minibus', 'diesel', 15, 'chauffeur', 'available', 0, 2800),
  ('CA 567-890', 'Volkswagen', 'Transporter', 2023, 'White', 'van', 'diesel', 9, 'both', 'available', 1800, 2400),
  ('WC 678-901', 'Toyota', 'Land Cruiser', 2023, 'Bronze', 'suv', 'diesel', 8, 'both', 'available', 2200, 3000),
  ('WC 789-012', 'Ford', 'Ranger', 2022, 'White', 'pickup', 'diesel', 5, 'self_drive', 'available', 1400, 0),
  ('WC 890-123', 'Hyundai', 'Tucson', 2023, 'Phantom Black', 'suv', 'petrol', 5, 'both', 'available', 1500, 2000),
  ('WC 901-234', 'Kia', 'Carnival', 2022, 'Snow White Pearl', 'minibus', 'petrol', 8, 'both', 'available', 1600, 2400),
  ('GP 012-345', 'Audi', 'A6', 2023, 'Manhattan Grey', 'luxury', 'petrol', 5, 'chauffeur', 'available', 0, 3800),
  ('GP 123-456', 'Mercedes-Benz', 'Sprinter', 2022, 'White', 'bus', 'diesel', 22, 'chauffeur', 'available', 0, 4500),
  ('GP 234-567', 'Toyota', 'Fortuner', 2023, 'Graphite', 'suv', 'diesel', 7, 'both', 'available', 1900, 2600),
  ('GP 345-678', 'Volkswagen', 'Polo', 2023, 'Deep Black', 'sedan', 'petrol', 5, 'self_drive', 'available', 900, 0),
  ('GP 456-789', 'Nissan', 'NP300', 2022, 'Silver', 'pickup', 'diesel', 5, 'self_drive', 'available', 1100, 0),
  ('GP 567-890', 'Toyota', 'Quantum', 2022, 'White', 'minibus', 'diesel', 14, 'chauffeur', 'available', 0, 3200)
ON CONFLICT (registration) DO NOTHING;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
