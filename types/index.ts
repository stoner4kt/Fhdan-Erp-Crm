// ============================================================
// FHDAN FLEET HUB - GLOBAL TYPE DEFINITIONS
// ============================================================

// ----------------------------
// RBAC & AUTH TYPES
// ----------------------------

export type UserRole =
  | "system_admin"
  | "manager"
  | "finance_officer"
  | "sales_agent"
  | "fleet_coordinator"
  | "driver";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ----------------------------
// CLIENT TYPES
// ----------------------------

export type ClientType = "individual" | "corporate" | "government";
export type ClientStatus = "active" | "inactive" | "blacklisted";
export type CurrencyCode = "ZAR" | "USD" | "EUR" | "GBP" | "AED";
export type TaxZone = "standard" | "exempt" | "foreign";

export interface Client {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  id_number?: string;           // RSA ID or passport
  client_type: ClientType;
  status: ClientStatus;
  company_name?: string;
  vat_number?: string;
  tax_zone: TaxZone;
  preferred_currency: CurrencyCode;
  payment_terms_days: number;   // e.g. 30, 60, 90
  address?: string;
  city?: string;
  country: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ----------------------------
// VEHICLE TYPES
// ----------------------------

export type VehicleStatus = "available" | "booked" | "maintenance" | "inactive";
export type DriveMode = "chauffeur" | "self_drive" | "both";
export type FuelType = "petrol" | "diesel" | "electric" | "hybrid";
export type VehicleCategory =
  | "sedan"
  | "suv"
  | "luxury"
  | "minibus"
  | "bus"
  | "van"
  | "pickup";

export interface Vehicle {
  id: string;
  registration: string;         // Number plate
  make: string;
  model: string;
  year: number;
  color: string;
  category: VehicleCategory;
  fuel_type: FuelType;
  seating_capacity: number;
  drive_modes: DriveMode;
  status: VehicleStatus;
  daily_rate_zar: number;
  chauffeur_rate_zar: number;
  odometer_km: number;
  last_service_date?: string;
  next_service_due_km?: number;
  insurance_expiry?: string;
  roadworthy_expiry?: string;
  gps_tracker_id?: string;
  image_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ----------------------------
// BOOKING TYPES
// ----------------------------

export type BookingStatus =
  | "quote"
  | "pending_deposit"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled"
  | "no_show";

export type BookingType = "chauffeur" | "self_drive";

export interface Booking {
  id: string;
  booking_reference: string;    // e.g. FHD-2026-001234
  client_id: string;
  vehicle_id: string;
  driver_id?: string;
  assigned_by?: string;
  booking_type: BookingType;
  status: BookingStatus;

  // Dates
  pickup_datetime: string;
  dropoff_datetime: string;
  actual_return_datetime?: string;

  // Locations
  pickup_location: string;
  dropoff_location: string;
  pickup_lat?: number;
  pickup_lng?: number;

  // Financials
  currency: CurrencyCode;
  exchange_rate_locked: number;
  subtotal_zar: number;
  discount_amount_zar: number;
  vat_amount_zar: number;
  total_zar: number;
  deposit_amount_zar: number;
  deposit_paid: boolean;
  deposit_paid_at?: string;
  balance_due_zar: number;
  payment_terms_days: number;

  // Extras
  extra_services?: ExtraService[];
  special_requirements?: string;
  internal_notes?: string;

  // Voucher
  voucher_url?: string;
  voucher_sent_at?: string;

  // Alerts
  arrival_alert_sent: boolean;

  created_by: string;
  created_at: string;
  updated_at: string;

  // Joined
  client?: Client;
  vehicle?: Vehicle;
  driver?: Driver;
}

export interface ExtraService {
  name: string;
  quantity: number;
  unit_price_zar: number;
}

// ----------------------------
// DRIVER TYPES
// ----------------------------

export type DriverStatus = "available" | "on_trip" | "off_duty" | "suspended";
export type LicenseCode = "B" | "C" | "C1" | "EB" | "PDP";

export interface Driver {
  id: string;
  user_id?: string;
  full_name: string;
  phone: string;
  email?: string;
  id_number: string;
  license_number: string;
  license_code: LicenseCode;
  license_expiry: string;
  pdp_expiry?: string;
  status: DriverStatus;
  rating?: number;
  total_trips: number;
  created_at: string;
  updated_at: string;
}

// ----------------------------
// FINANCE TYPES
// ----------------------------

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled" | "void";
export type PaymentMethod = "eft" | "cash" | "card" | "crypto" | "other";

export interface Invoice {
  id: string;
  invoice_number: string;       // FHD-INV-2026-001
  booking_id: string;
  client_id: string;
  status: InvoiceStatus;
  line_items: InvoiceLineItem[];
  subtotal_zar: number;
  vat_rate: number;
  vat_amount_zar: number;
  total_zar: number;
  amount_paid_zar: number;
  balance_due_zar: number;
  due_date: string;
  paid_date?: string;
  payment_method?: PaymentMethod;
  payment_reference?: string;
  pdf_url?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;

  booking?: Booking;
  client?: Client;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price_zar: number;
  total_zar: number;
  vat_applicable: boolean;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount_zar: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface ExchangeRate {
  id: string;
  currency_from: CurrencyCode;
  currency_to: CurrencyCode;
  rate: number;
  locked_by?: string;
  locked_until?: string;
  created_at: string;
}

// ----------------------------
// DOCUMENT VAULT TYPES
// ----------------------------

export type DocumentType =
  | "passport"
  | "rsa_id"
  | "drivers_license"
  | "pdp"
  | "vehicle_registration"
  | "insurance"
  | "roadworthy"
  | "other";

export interface VaultDocument {
  id: string;
  entity_type: "client" | "driver" | "vehicle";
  entity_id: string;
  document_type: DocumentType;
  file_name: string;
  file_path: string;           // Supabase Storage path
  file_size_bytes: number;
  mime_type: string;
  expiry_date?: string;
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
  uploaded_by: string;
  created_at: string;
}

// ----------------------------
// AUDIT LOG TYPES
// ----------------------------

export type AuditAction =
  | "INSERT"
  | "UPDATE"
  | "DELETE"
  | "VIEW_DOCUMENT"
  | "DOWNLOAD_DOCUMENT"
  | "LOGIN"
  | "LOGOUT"
  | "ROLE_CHANGE"
  | "SETTING_CHANGE";

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: AuditAction;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  changed_by: string;
  changed_by_email?: string;
  changed_by_role?: UserRole;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// ----------------------------
// MAINTENANCE TYPES
// ----------------------------

export type MaintenanceType =
  | "routine_service"
  | "repair"
  | "inspection"
  | "tyre_change"
  | "brake_service"
  | "other";

export interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  maintenance_type: MaintenanceType;
  description: string;
  cost_zar: number;
  odometer_at_service: number;
  service_provider: string;
  service_date: string;
  next_service_date?: string;
  documents?: string[];
  logged_by: string;
  created_at: string;
}

// ----------------------------
// DASHBOARD / COCKPIT TYPES
// ----------------------------

export interface DashboardStats {
  total_bookings_month: number;
  revenue_month_zar: number;
  active_trips: number;
  vehicles_available: number;
  vehicles_booked: number;
  vehicles_maintenance: number;
  pending_deposits: number;
  overdue_invoices: number;
}

export interface TripUpdate {
  booking_id: string;
  booking_reference: string;
  client_name: string;
  vehicle_registration: string;
  vehicle_name: string;
  driver_name?: string;
  booking_type: BookingType;
  status: BookingStatus;
  pickup_location: string;
  dropoff_location: string;
  pickup_datetime: string;
  dropoff_datetime: string;
}

// ----------------------------
// API RESPONSE TYPES
// ----------------------------

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ----------------------------
// FORM TYPES
// ----------------------------

export interface RapidProfileInput {
  email: string;
  full_name: string;
  phone?: string;
  id_number?: string;
  client_type: ClientType;
  company_name?: string;
  preferred_currency: CurrencyCode;
  tax_zone: TaxZone;
}

export interface BookingFormInput {
  // Step 1: Client
  client_email: string;
  client_full_name?: string;
  client_phone?: string;
  client_id_number?: string;
  client_type?: ClientType;
  client_company_name?: string;

  // Step 2: Vehicle & Dates
  vehicle_id: string;
  booking_type: BookingType;
  pickup_datetime: string;
  dropoff_datetime: string;
  pickup_location: string;
  dropoff_location: string;

  // Step 3: Financials
  currency: CurrencyCode;
  discount_amount_zar: number;
  deposit_amount_zar: number;
  payment_terms_days: number;
  extra_services?: ExtraService[];

  // Step 4: Notes
  driver_id?: string;
  special_requirements?: string;
  internal_notes?: string;
}
