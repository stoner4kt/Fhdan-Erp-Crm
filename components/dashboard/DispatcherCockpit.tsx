// ============================================================
// DISPATCHER'S COCKPIT COMPONENT — Real-time fleet view
// ============================================================
"use client";

import {
  Truck, CalendarCheck, AlertCircle, CheckCircle2,
  Wrench, Clock, MapPin, User, ChevronRight, TrendingUp,
} from "lucide-react";
import { cn, formatZAR, formatDateTime, formatRelative, BOOKING_STATUS_COLORS, BOOKING_TYPE_LABELS } from "@/lib/utils";
import type { UserProfile, BookingStatus, BookingType } from "@/types";
import Link from "next/link";

interface CockpitStats {
  total_bookings_month: number;
  active_trips: number;
  vehicles_available: number;
  vehicles_booked: number;
  vehicles_maintenance: number;
  pending_deposits: number;
}

interface CockpitTrip {
  id: string;
  booking_reference: string;
  status: BookingStatus;
  booking_type: BookingType;
  pickup_datetime: string;
  dropoff_datetime: string;
  pickup_location: string;
  dropoff_location: string;
  client?: { full_name: string; phone?: string };
  vehicle?: { registration: string; make: string; model: string };
  driver?: { full_name: string; phone?: string } | null;
}

interface DispatcherCockpitProps {
  user: UserProfile;
  stats: CockpitStats;
  activeTrips: CockpitTrip[];
  recentBookings: any[];
  pendingDeposits: any[];
}

export function DispatcherCockpit({
  user,
  stats,
  activeTrips,
  recentBookings,
  pendingDeposits,
}: DispatcherCockpitProps) {
  return (
    <div className="page-container space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Active Trips"
          value={stats.active_trips}
          icon={<Clock className="h-4 w-4" />}
          color="text-green-600"
          bg="bg-green-50"
          live={stats.active_trips > 0}
        />
        <StatCard
          label="Available"
          value={stats.vehicles_available}
          icon={<Truck className="h-4 w-4" />}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <StatCard
          label="On Trip"
          value={stats.vehicles_booked}
          icon={<MapPin className="h-4 w-4" />}
          color="text-orange-600"
          bg="bg-orange-50"
        />
        <StatCard
          label="Maintenance"
          value={stats.vehicles_maintenance}
          icon={<Wrench className="h-4 w-4" />}
          color="text-red-600"
          bg="bg-red-50"
        />
        <StatCard
          label="This Month"
          value={stats.total_bookings_month}
          icon={<CalendarCheck className="h-4 w-4" />}
          color="text-purple-600"
          bg="bg-purple-50"
        />
        <StatCard
          label="Pending Deposits"
          value={stats.pending_deposits}
          icon={<AlertCircle className="h-4 w-4" />}
          color="text-yellow-600"
          bg="bg-yellow-50"
          alert={stats.pending_deposits > 0}
        />
      </div>

      {/* Fleet status bar */}
      <div className="card-base p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Fleet Status — 30 Vehicles</h3>
          <Link href="/fleet" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
            Manage Fleet <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <FleetStatusBar
          available={stats.vehicles_available}
          booked={stats.vehicles_booked}
          maintenance={stats.vehicles_maintenance}
          total={30}
        />
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Active & upcoming trips */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <span className="live-indicator">Active & Upcoming Trips</span>
            </h2>
            <Link href="/bookings" className="text-xs text-brand-600 hover:underline">
              View all
            </Link>
          </div>

          {activeTrips.length === 0 ? (
            <div className="card-base p-8 text-center text-muted-foreground">
              <Truck className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No active or upcoming trips right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Recent bookings */}
          <div className="card-base p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Recent Bookings</h3>
              <Link href="/bookings" className="text-xs text-brand-600 hover:underline">All</Link>
            </div>
            <div className="space-y-2">
              {recentBookings.slice(0, 6).map((b: any) => (
                <Link key={b.id} href={`/bookings/${b.id}`} className="flex items-center gap-2 py-1.5 group hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors">
                  <span className={cn("badge text-[10px]", BOOKING_STATUS_COLORS[b.status as BookingStatus])}>
                    {b.status}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{b.booking_reference}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{b.client?.full_name}</p>
                  </div>
                  <span className="text-xs font-semibold text-brand-600 shrink-0">
                    {formatZAR(b.total_zar)}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Pending deposits */}
          {pendingDeposits.length > 0 && (
            <div className="card-base p-4 border-l-4 border-l-yellow-400">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <h3 className="font-semibold text-sm">Pending Deposits</h3>
              </div>
              <div className="space-y-2">
                {pendingDeposits.slice(0, 4).map((dep: any) => (
                  <div key={dep.id} className="flex items-center justify-between py-1">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{dep.booking_reference}</p>
                      <p className="text-[10px] text-muted-foreground">{dep.client?.full_name}</p>
                    </div>
                    <span className="text-xs font-bold text-yellow-700">
                      {formatZAR(dep.deposit_amount_zar)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="card-base p-4">
            <h3 className="font-semibold text-sm mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/bookings/new" className="flex flex-col items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-3 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors text-center">
                <CalendarCheck className="h-5 w-5" />
                New Booking
              </Link>
              <Link href="/fleet" className="flex flex-col items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-3 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors text-center">
                <Truck className="h-5 w-5" />
                Fleet Status
              </Link>
              <Link href="/clients" className="flex flex-col items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-3 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors text-center">
                <User className="h-5 w-5" />
                Add Client
              </Link>
              <Link href="/finance" className="flex flex-col items-center gap-1.5 rounded-lg bg-green-50 px-3 py-3 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors text-center">
                <TrendingUp className="h-5 w-5" />
                Finance
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------
// Sub-components
// ----------------------------

function StatCard({
  label, value, icon, color, bg, live, alert,
}: {
  label: string; value: number; icon: React.ReactNode;
  color: string; bg: string; live?: boolean; alert?: boolean;
}) {
  return (
    <div className={cn("stat-card relative", alert && "border-yellow-300")}>
      {live && (
        <span className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
      )}
      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", bg, color)}>
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function FleetStatusBar({
  available, booked, maintenance, total,
}: { available: number; booked: number; maintenance: number; total: number }) {
  const inactive = total - available - booked - maintenance;
  const pct = (n: number) => `${((n / total) * 100).toFixed(0)}%`;
  return (
    <div className="space-y-2">
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        <div className="bg-fleet-available transition-all" style={{ width: pct(available) }} title={`Available: ${available}`} />
        <div className="bg-fleet-booked transition-all" style={{ width: pct(booked) }} title={`Booked: ${booked}`} />
        <div className="bg-fleet-maintenance transition-all" style={{ width: pct(maintenance) }} title={`Maintenance: ${maintenance}`} />
        <div className="bg-fleet-inactive transition-all flex-1" title={`Inactive: ${inactive}`} />
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="status-dot-available" /> {available} Available</span>
        <span className="flex items-center gap-1"><span className="status-dot-booked" /> {booked} On Trip</span>
        <span className="flex items-center gap-1"><span className="status-dot-maintenance" /> {maintenance} Maintenance</span>
        <span className="flex items-center gap-1"><span className="status-dot-inactive" /> {inactive} Inactive</span>
      </div>
    </div>
  );
}

function TripCard({ trip }: { trip: CockpitTrip }) {
  const isActive = trip.status === "active";
  return (
    <Link href={`/bookings/${trip.id}`} className="card-base block p-4 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {isActive && <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse shrink-0 mt-0.5" />}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{trip.booking_reference}</span>
              <span className="badge text-[10px] bg-brand-100 text-brand-700">
                {BOOKING_TYPE_LABELS[trip.booking_type]}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{trip.client?.full_name}</p>
          </div>
        </div>
        <span className={cn("badge text-[10px] shrink-0", BOOKING_STATUS_COLORS[trip.status])}>
          {trip.status}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Truck className="h-3 w-3 shrink-0" />
          <span className="truncate">{trip.vehicle?.registration} — {trip.vehicle?.make} {trip.vehicle?.model}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate">{trip.driver?.full_name ?? "Self-Drive"}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{trip.pickup_location}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0" />
          <span>{formatDateTime(trip.pickup_datetime)}</span>
        </div>
      </div>
    </Link>
  );
}
