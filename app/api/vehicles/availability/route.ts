// ============================================================
// VEHICLE AVAILABILITY API — Dual-Mode Engine
// POST /api/vehicles/availability — checks for double-booking
// Uses PostgreSQL atomic function to prevent race conditions
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/rbac";
import type { UserRole } from "@/types";

export const runtime = "edge";
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single<{ role: UserRole }>();
  if (!profile || !can(profile.role, "vehicle_view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { vehicle_id, pickup_datetime, dropoff_datetime, booking_type, exclude_booking_id } = body;

  if (!vehicle_id || !pickup_datetime || !dropoff_datetime) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Call PostgreSQL availability function
  const { data: isAvailable, error } = await supabase.rpc("check_vehicle_availability", {
    p_vehicle_id: vehicle_id,
    p_pickup_datetime: pickup_datetime,
    p_dropoff_datetime: dropoff_datetime,
    p_booking_type: booking_type ?? "chauffeur",
    p_exclude_booking_id: exclude_booking_id ?? null,
  });

  if (error) {
    console.error("[Availability] RPC error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Find conflicting booking ref for display
  let conflictRef: string | null = null;
  if (!isAvailable) {
    const { data: conflict } = await supabase
      .from("bookings")
      .select("booking_reference")
      .eq("vehicle_id", vehicle_id)
      .not("status", "in", '("cancelled","completed","no_show")')
      .or(
        `and(pickup_datetime.lt.${dropoff_datetime},dropoff_datetime.gt.${pickup_datetime})`
      )
      .limit(1)
      .maybeSingle();
    conflictRef = conflict?.booking_reference ?? null;
  }

  return NextResponse.json({
    available: isAvailable ?? false,
    conflict_ref: conflictRef,
  });
}
