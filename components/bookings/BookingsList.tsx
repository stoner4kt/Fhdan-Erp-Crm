// ============================================================
// BOOKINGS LIST COMPONENT
// ============================================================
"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatZAR, formatDate, BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS, BOOKING_TYPE_LABELS } from "@/lib/utils";
import type { BookingStatus } from "@/types";

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Quote", value: "quote" },
  { label: "Pending Deposit", value: "pending_deposit" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

interface BookingsListProps {
  bookings: any[];
  total: number;
  page: number;
  perPage: number;
  canCreate: boolean;
  isDriver: boolean;
  currentStatus?: string;
}

export function BookingsList({ bookings, total, page, perPage, canCreate, isDriver, currentStatus }: BookingsListProps) {
  const [search, setSearch] = useState("");
  const totalPages = Math.ceil(total / perPage);

  const filtered = bookings.filter((b) => {
    if (!search) return true;
    return (
      b.booking_reference?.toLowerCase().includes(search.toLowerCase()) ||
      b.client?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.vehicle?.registration?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="page-container space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status filters */}
        {!isDriver && (
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((s) => (
              <Link
                key={s.value}
                href={`/bookings?status=${s.value}&page=1`}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  (currentStatus === s.value || (!currentStatus && s.value === "all"))
                    ? "bg-brand-500 text-white"
                    : "bg-card border text-muted-foreground hover:border-brand-300"
                )}
              >
                {s.label}
              </Link>
            ))}
          </div>
        )}
        <div className="flex gap-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search ref, client, vehicle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm rounded-lg border bg-card focus:outline-none focus:ring-2 focus:ring-brand-500 w-56"
            />
          </div>
          {canCreate && (
            <Link
              href="/bookings/new"
              className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors shadow-sm shrink-0"
            >
              <Plus className="h-4 w-4" />
              New Booking
            </Link>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card-base overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <CalendarCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">No bookings found.</p>
            {canCreate && (
              <Link href="/bookings/new" className="mt-3 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
                <Plus className="h-3.5 w-3.5" /> Create your first booking
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Vehicle</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Pickup</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deposit</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-3">
                      <Link href={`/bookings/${b.id}`} className="font-mono text-xs font-bold text-brand-600 hover:underline group-hover:text-brand-700">
                        {b.booking_reference}
                      </Link>
                      <p className="text-[10px] text-muted-foreground">{formatDate(b.created_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium truncate max-w-[140px]">{b.client?.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[140px]">{b.client?.email}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="font-mono text-xs font-semibold">{b.vehicle?.registration}</p>
                      <p className="text-xs text-muted-foreground">{b.vehicle?.make} {b.vehicle?.model}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="badge text-[10px] bg-brand-50 text-brand-700">
                        {BOOKING_TYPE_LABELS[b.booking_type as any] ?? b.booking_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">
                      {formatDate(b.pickup_datetime)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-sm">
                      {formatZAR(b.total_zar)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("badge text-[10px]", BOOKING_STATUS_COLORS[b.status as BookingStatus])}>
                        {BOOKING_STATUS_LABELS[b.status as BookingStatus] ?? b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {b.deposit_paid ? (
                        <span className="badge text-[10px] bg-green-100 text-green-700">Paid</span>
                      ) : (
                        <span className="badge text-[10px] bg-yellow-100 text-yellow-700">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground text-xs">
            Showing {((page - 1) * perPage) + 1}–{Math.min(page * perPage, total)} of {total}
          </p>
          <div className="flex gap-1">
            {page > 1 && (
              <Link href={`/bookings?status=${currentStatus ?? "all"}&page=${page - 1}`}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs hover:bg-muted transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </Link>
            )}
            {page < totalPages && (
              <Link href={`/bookings?status=${currentStatus ?? "all"}&page=${page + 1}`}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs hover:bg-muted transition-colors">
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
