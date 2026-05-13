// ============================================================
// BOOKINGS API ROUTE — GET (list), POST (create)
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/rbac";
import type { UserRole } from "@/types";
import { notifyNewBooking } from "@/lib/notifications";

// GET /api/bookings — list bookings (role-filtered by RLS)
export const runtime = "edge";
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single<{ role: UserRole }>();
  if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const perPage = 20;
  const status = url.searchParams.get("status");

  let query = supabase
    .from("bookings")
    .select(`
      *, client:clients(*), vehicle:vehicles(*), driver:drivers(*)
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (status && status !== "all") query = query.eq("status", status);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, count, page, per_page: perPage });
}

// POST /api/bookings — create a new booking
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: UserRole }>();
  if (!profile || !can(profile.role, "booking_create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  // Double-booking prevention via PostgreSQL function
  const { data: avail, error: availErr } = await (supabase as any).rpc("check_vehicle_availability", {
    p_vehicle_id: body.vehicle_id,
    p_pickup_datetime: body.pickup_datetime,
    p_dropoff_datetime: body.dropoff_datetime,
    p_booking_type: body.booking_type,
    p_exclude_booking_id: null,
  });

  if (availErr || !avail) {
    return NextResponse.json(
      { error: "Vehicle is not available for the selected dates and booking type." },
      { status: 409 }
    );
  }

  // Create booking
  const { data: booking, error } = await supabase
    .from("bookings")
    .insert(body)
    .select(`*, client:clients(*), vehicle:vehicles(*), driver:drivers(*)`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update vehicle status to 'booked'
  await (supabase as any)
    .from("vehicles")
    .update({ status: "booked", updated_at: new Date().toISOString() })
    .eq("id", body.vehicle_id);

  // Fire-and-forget notifications
  notifyNewBooking(booking as any).catch(console.error);

  return NextResponse.json({ booking }, { status: 201 });
}
