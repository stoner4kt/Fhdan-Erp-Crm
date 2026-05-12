// ============================================================
// UTILITY FUNCTIONS
// ============================================================
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO, differenceInDays } from "date-fns";
import type { CurrencyCode, BookingStatus, VehicleStatus, BookingType } from "@/types";

// ----------------------------
// TAILWIND MERGE
// ----------------------------
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ----------------------------
// CURRENCY FORMATTING
// ----------------------------

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  ZAR: "R",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "د.إ",
};

export function formatCurrency(
  amount: number,
  currency: CurrencyCode = "ZAR",
  showSymbol = true
): string {
  const formatted = new Intl.NumberFormat("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return showSymbol ? `${CURRENCY_SYMBOLS[currency]}${formatted}` : formatted;
}

export function formatZAR(amount: number): string {
  return formatCurrency(amount, "ZAR");
}

// ----------------------------
// DATE FORMATTING
// ----------------------------

export function formatDate(dateStr: string, fmt = "dd MMM yyyy"): string {
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  return formatDate(dateStr, "dd MMM yyyy HH:mm");
}

export function formatRelative(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function daysBetween(start: string, end: string): number {
  return Math.abs(differenceInDays(parseISO(end), parseISO(start))) || 1;
}

// ----------------------------
// BOOKING REFERENCE GENERATOR
// ----------------------------

export function generateBookingReference(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `FHD-${year}-${random}`;
}

export function generateInvoiceNumber(sequence: number): string {
  const year = new Date().getFullYear();
  const padded = String(sequence).padStart(5, "0");
  return `FHD-INV-${year}-${padded}`;
}

// ----------------------------
// VAT CALCULATION (South Africa: 15%)
// ----------------------------

export const VAT_RATE = 0.15;

export function calcVAT(amount: number): number {
  return parseFloat((amount * VAT_RATE).toFixed(2));
}

export function calcTotal(subtotal: number, discount = 0): {
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
} {
  const net = subtotal - discount;
  const vat = calcVAT(net);
  return {
    subtotal,
    discount,
    vat,
    total: parseFloat((net + vat).toFixed(2)),
  };
}

// ----------------------------
// STATUS DISPLAY HELPERS
// ----------------------------

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  quote: "Quote",
  pending_deposit: "Pending Deposit",
  confirmed: "Confirmed",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

export const BOOKING_STATUS_COLORS: Record<BookingStatus, string> = {
  quote: "bg-gray-100 text-gray-700",
  pending_deposit: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-orange-100 text-orange-800",
};

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  available: "Available",
  booked: "Booked",
  maintenance: "In Maintenance",
  inactive: "Inactive",
};

export const VEHICLE_STATUS_COLORS: Record<VehicleStatus, string> = {
  available: "bg-green-100 text-green-800",
  booked: "bg-orange-100 text-orange-800",
  maintenance: "bg-red-100 text-red-800",
  inactive: "bg-gray-100 text-gray-600",
};

export const BOOKING_TYPE_LABELS: Record<BookingType, string> = {
  chauffeur: "Chauffeur-Driven",
  self_drive: "Self-Drive",
};

// ----------------------------
// FILE SIZE FORMATTER
// ----------------------------

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ----------------------------
// PHONE FORMATTER (SA format)
// ----------------------------

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("27") && cleaned.length === 11) {
    return `+27 ${cleaned.slice(2, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  return phone;
}

// ----------------------------
// ID NUMBER VALIDATOR (RSA)
// ----------------------------

export function validateSAID(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(id[i]);
    if (i % 2 === 0) {
      sum += digit;
    } else {
      const doubled = digit * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    }
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(id[12]);
}

// ----------------------------
// MISC
// ----------------------------

export function truncate(str: string, maxLen = 50): string {
  return str.length > maxLen ? `${str.slice(0, maxLen)}...` : str;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}
