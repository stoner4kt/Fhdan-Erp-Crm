// ============================================================
// RBAC HELPER — Permission checks based on user role
// Used in both Server Components and API Route Handlers
// ============================================================
import type { UserRole } from "@/types";

// ----------------------------
// PERMISSION MAP
// ----------------------------

const PERMISSIONS = {
  // Client / CRM
  client_create: ["system_admin", "manager", "sales_agent"],
  client_update: ["system_admin", "manager", "sales_agent"],
  client_delete: ["system_admin"],
  client_view: ["system_admin", "manager", "sales_agent", "finance_officer"],

  // Bookings
  booking_create: ["system_admin", "manager", "sales_agent"],
  booking_update: ["system_admin", "manager", "sales_agent"],
  booking_delete: ["system_admin", "manager"],
  booking_view_all: ["system_admin", "manager", "sales_agent", "finance_officer", "fleet_coordinator"],
  booking_view_own_trips: ["driver"],

  // Fleet / Vehicles
  vehicle_create: ["system_admin", "manager", "fleet_coordinator"],
  vehicle_update: ["system_admin", "manager", "fleet_coordinator"],
  vehicle_delete: ["system_admin"],
  vehicle_view: ["system_admin", "manager", "sales_agent", "finance_officer", "fleet_coordinator"],

  // Drivers
  driver_assign: ["system_admin", "manager", "fleet_coordinator"],
  driver_manage: ["system_admin", "manager", "fleet_coordinator"],
  driver_view: ["system_admin", "manager", "fleet_coordinator", "sales_agent"],

  // Finance
  invoice_create: ["system_admin", "manager", "finance_officer"],
  invoice_update: ["system_admin", "manager", "finance_officer"],
  invoice_delete: ["system_admin", "manager"],
  invoice_view: ["system_admin", "manager", "finance_officer"],
  payment_record: ["system_admin", "manager", "finance_officer"],
  exchange_rate_lock: ["system_admin", "manager", "finance_officer"],
  profit_margin_view: ["system_admin", "manager", "finance_officer"],

  // Document Vault (POPIA-sensitive)
  document_upload: ["system_admin", "manager", "sales_agent", "fleet_coordinator"],
  document_view: ["system_admin", "manager"],   // Strict — only managers+ can view IDs/passports
  document_download: ["system_admin", "manager"],
  document_delete: ["system_admin"],

  // Maintenance
  maintenance_log: ["system_admin", "manager", "fleet_coordinator"],
  maintenance_view: ["system_admin", "manager", "fleet_coordinator"],

  // Audit Log
  audit_view: ["system_admin", "manager"],
  audit_delete: [],   // NOBODY can delete audit logs — enforced in DB too

  // Settings / System
  system_settings: ["system_admin"],
  user_manage: ["system_admin"],
  api_key_manage: ["system_admin"],

  // Dashboard
  dispatcher_cockpit: ["system_admin", "manager", "fleet_coordinator", "sales_agent"],
  finance_dashboard: ["system_admin", "manager", "finance_officer"],

  // Voucher
  voucher_generate: ["system_admin", "manager", "sales_agent"],
  voucher_download: ["system_admin", "manager", "sales_agent", "driver"],
} as const;

type Permission = keyof typeof PERMISSIONS;

// ----------------------------
// CORE PERMISSION CHECK
// ----------------------------

/**
 * Returns true if the given role has the specified permission.
 */
export function can(role: UserRole, permission: Permission): boolean {
  const allowed = PERMISSIONS[permission] as readonly string[];
  return allowed.includes(role);
}

/**
 * Returns true if the user has ANY of the specified permissions.
 */
export function canAny(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}

/**
 * Returns true if the user has ALL of the specified permissions.
 */
export function canAll(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => can(role, p));
}

// ----------------------------
// SIDEBAR NAV VISIBILITY
// ----------------------------

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  permission: Permission;
  badge?: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dispatcher's Cockpit", href: "/dashboard",  icon: "LayoutDashboard", permission: "dispatcher_cockpit" },
  { label: "Fleet Management",     href: "/fleet",      icon: "Truck",            permission: "vehicle_view" },
  { label: "Bookings",             href: "/bookings",   icon: "CalendarCheck",    permission: "booking_view_all" },
  { label: "My Trips",             href: "/bookings",   icon: "Route",            permission: "booking_view_own_trips" },
  { label: "Clients",              href: "/clients",    icon: "Users",            permission: "client_view" },
  { label: "Finance",              href: "/finance",    icon: "CircleDollarSign", permission: "finance_dashboard" },
  { label: "Drivers",              href: "/drivers",    icon: "UserCheck",        permission: "driver_view" },
  { label: "Document Vault",       href: "/vault",      icon: "ShieldCheck",      permission: "document_view" },
  { label: "Settings",             href: "/settings",   icon: "Settings",         permission: "system_settings" },
];

export function getVisibleNavItems(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => can(role, item.permission));
}

// ----------------------------
// ROLE DISPLAY HELPERS
// ----------------------------

export const ROLE_LABELS: Record<UserRole, string> = {
  system_admin: "System Administrator",
  manager: "Manager",
  finance_officer: "Finance Officer",
  sales_agent: "Sales Agent",
  fleet_coordinator: "Fleet Coordinator",
  driver: "Driver",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  system_admin: "bg-purple-100 text-purple-800",
  manager: "bg-blue-100 text-blue-800",
  finance_officer: "bg-green-100 text-green-800",
  sales_agent: "bg-orange-100 text-orange-800",
  fleet_coordinator: "bg-yellow-100 text-yellow-800",
  driver: "bg-gray-100 text-gray-800",
};

export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role] ?? role;
}

export function getRoleColor(role: UserRole): string {
  return ROLE_COLORS[role] ?? "bg-gray-100 text-gray-800";
}
