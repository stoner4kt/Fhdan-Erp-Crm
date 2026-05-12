// ============================================================
// DRIVERS TABLE COMPONENT
// ============================================================
"use client";

import { UserCheck, Phone, CreditCard, Clock } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { Driver, DriverStatus } from "@/types";

const STATUS_COLORS: Record<DriverStatus, string> = {
  available: "bg-green-100 text-green-700",
  on_trip: "bg-orange-100 text-orange-700",
  off_duty: "bg-gray-100 text-gray-600",
  suspended: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<DriverStatus, string> = {
  available: "Available",
  on_trip: "On Trip",
  off_duty: "Off Duty",
  suspended: "Suspended",
};

interface DriversTableProps {
  drivers: Driver[];
  canManage: boolean;
}

export function DriversTable({ drivers, canManage }: DriversTableProps) {
  if (drivers.length === 0) {
    return (
      <div className="page-container">
        <div className="card-base p-12 text-center">
          <UserCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">No drivers registered yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-5">
      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(["available", "on_trip", "off_duty", "suspended"] as DriverStatus[]).map((status) => {
          const count = drivers.filter((d) => d.status === status).length;
          return (
            <div key={status} className="stat-card">
              <div className={cn("badge text-xs self-start", STATUS_COLORS[status])}>
                {STATUS_LABELS[status]}
              </div>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="card-base overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                {["Driver", "Contact", "Licence", "PDP Expiry", "Total Trips", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {drivers.map((driver) => {
                const pdpExpiringSoon = driver.pdp_expiry &&
                  Math.ceil((new Date(driver.pdp_expiry).getTime() - Date.now()) / 86400000) <= 30;
                const licenseExpiringSoon =
                  Math.ceil((new Date(driver.license_expiry).getTime() - Date.now()) / 86400000) <= 30;

                return (
                  <tr key={driver.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-bold shrink-0">
                          {driver.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium">{driver.full_name}</p>
                          <p className="text-xs text-muted-foreground">{driver.id_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {driver.phone}
                      </div>
                      {driver.email && (
                        <p className="text-xs text-muted-foreground truncate max-w-[140px]">{driver.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-mono font-bold">{driver.license_number}</span>
                        <span className="badge text-[10px] bg-blue-100 text-blue-700">Code {driver.license_code}</span>
                      </div>
                      <p className={cn("text-[10px] mt-0.5", licenseExpiringSoon ? "text-yellow-600 font-semibold" : "text-muted-foreground")}>
                        Expires: {formatDate(driver.license_expiry)}
                        {licenseExpiringSoon && " ⚠️"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {driver.pdp_expiry ? (
                        <p className={cn("text-xs", pdpExpiringSoon ? "text-yellow-600 font-semibold" : "text-muted-foreground")}>
                          {formatDate(driver.pdp_expiry)}
                          {pdpExpiringSoon && " ⚠️"}
                        </p>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {driver.total_trips ?? 0} trips
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("badge text-[10px]", STATUS_COLORS[driver.status])}>
                        {STATUS_LABELS[driver.status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
