// ============================================================
// VEHICLE GRID — Fleet management with filters & status
// ============================================================
"use client";

import { useState } from "react";
import { Truck, Plus, Search, Filter, Edit2, Wrench, CheckCircle2 } from "lucide-react";
import { cn, VEHICLE_STATUS_COLORS, VEHICLE_STATUS_LABELS, formatZAR, formatDate } from "@/lib/utils";
import type { Vehicle, VehicleStatus, UserRole } from "@/types";
import Link from "next/link";

interface VehicleGridProps {
  vehicles: Vehicle[];
  userRole: UserRole;
  canManage: boolean;
  canCreate: boolean;
}

const STATUS_FILTERS: { label: string; value: VehicleStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Available", value: "available" },
  { label: "Booked", value: "booked" },
  { label: "Maintenance", value: "maintenance" },
  { label: "Inactive", value: "inactive" },
];

export function VehicleGrid({ vehicles, userRole, canManage, canCreate }: VehicleGridProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | "all">("all");

  const filtered = vehicles.filter((v) => {
    const matchSearch =
      !search ||
      v.registration.toLowerCase().includes(search.toLowerCase()) ||
      v.make.toLowerCase().includes(search.toLowerCase()) ||
      v.model.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: vehicles.length,
    available: vehicles.filter((v) => v.status === "available").length,
    booked: vehicles.filter((v) => v.status === "booked").length,
    maintenance: vehicles.filter((v) => v.status === "maintenance").length,
    inactive: vehicles.filter((v) => v.status === "inactive").length,
  };

  return (
    <div className="page-container space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                statusFilter === f.value
                  ? "bg-brand-500 text-white shadow-sm"
                  : "bg-card border text-muted-foreground hover:border-brand-300"
              )}
            >
              {f.label}
              <span className="ml-1.5 text-[10px] opacity-70">
                {counts[f.value]}
              </span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search vehicles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm rounded-lg border bg-card focus:outline-none focus:ring-2 focus:ring-brand-500 w-48 transition-shadow"
            />
          </div>
          {canCreate && (
            <Link
              href="/fleet/new"
              className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add Vehicle
            </Link>
          )}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card-base p-12 text-center">
          <Truck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">No vehicles match your filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} canManage={canManage} />
          ))}
        </div>
      )}
    </div>
  );
}

function VehicleCard({ vehicle, canManage }: { vehicle: Vehicle; canManage: boolean }) {
  const statusColor = {
    available: "border-l-fleet-available bg-green-500",
    booked: "border-l-fleet-booked bg-orange-500",
    maintenance: "border-l-fleet-maintenance bg-red-500",
    inactive: "border-l-fleet-inactive bg-gray-400",
  };

  const isExpiringSoon = (date?: string) => {
    if (!date) return false;
    const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
    return days > 0 && days <= 30;
  };

  return (
    <div className={cn("card-base overflow-hidden border-l-4", `border-l-[${statusColor[vehicle.status]}]`)}>
      {/* Status strip */}
      <div className="h-1" style={{ backgroundColor: vehicle.status === "available" ? "#22c55e" : vehicle.status === "booked" ? "#f97316" : vehicle.status === "maintenance" ? "#ef4444" : "#94a3b8" }} />

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold text-sm">{vehicle.registration}</p>
            <p className="text-xs text-muted-foreground">{vehicle.year} {vehicle.make} {vehicle.model}</p>
          </div>
          <span className={cn("badge text-[10px]", VEHICLE_STATUS_COLORS[vehicle.status])}>
            {VEHICLE_STATUS_LABELS[vehicle.status]}
          </span>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <div>
            <p className="text-muted-foreground">Category</p>
            <p className="font-medium capitalize">{vehicle.category.replace("_", " ")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Seats</p>
            <p className="font-medium">{vehicle.seating_capacity}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Drive Mode</p>
            <p className="font-medium capitalize">{vehicle.drive_modes.replace("_", " ")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Daily Rate</p>
            <p className="font-medium text-brand-600">{formatZAR(vehicle.daily_rate_zar)}</p>
          </div>
        </div>

        {/* Expiry warnings */}
        {(isExpiringSoon(vehicle.insurance_expiry) || isExpiringSoon(vehicle.roadworthy_expiry)) && (
          <div className="flex items-center gap-1.5 rounded-md bg-yellow-50 px-2 py-1.5 text-yellow-700 text-xs">
            <Wrench className="h-3 w-3 shrink-0" />
            {isExpiringSoon(vehicle.insurance_expiry) && (
              <span>Insurance expires {formatDate(vehicle.insurance_expiry!)}</span>
            )}
            {isExpiringSoon(vehicle.roadworthy_expiry) && (
              <span>Roadworthy expires {formatDate(vehicle.roadworthy_expiry!)}</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Link
            href={`/fleet/${vehicle.id}`}
            className="flex-1 flex items-center justify-center gap-1 rounded-md border py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            View Details
          </Link>
          {canManage && (
            <Link
              href={`/fleet/${vehicle.id}/edit`}
              className="flex items-center gap-1 rounded-md bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors"
            >
              <Edit2 className="h-3 w-3" />
              Edit
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
