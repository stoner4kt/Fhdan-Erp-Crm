// ============================================================
// VEHICLES API ROUTE — GET (list), POST (create)
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/rbac";

// GET /api/vehicles — list all vehicles with optional status filter
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single();
  if (!profile || !can(profile.role, "vehicle_view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get("status");
  const mode = req.nextUrl.searchParams.get("mode"); // chauffeur | self_drive | both

  let query = supabase.from("vehicles").select("*").order("status").order("make");
  if (status && status !== "all") query = query.eq("status", status);
  if (mode) {
    if (mode === "chauffeur") {
      query = query.in("drive_modes", ["chauffeur", "both"]);
    } else if (mode === "self_drive") {
      query = query.in("drive_modes", ["self_drive", "both"]);
    }
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

// POST /api/vehicles — create new vehicle
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single();
  if (!profile || !can(profile.role, "vehicle_manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  if (!body.registration || !body.make || !body.model || !body.year) {
    return NextResponse.json({ error: "registration, make, model, and year are required" }, { status: 400 });
  }

  const { data: vehicle, error } = await supabase
    .from("vehicles")
    .insert({
      ...body,
      status: body.status ?? "available",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  await supabase.from("audit_logs").insert({
    table_name: "vehicles",
    record_id: vehicle.id,
    action: "INSERT",
    new_data: { registration: vehicle.registration, make: vehicle.make, model: vehicle.model },
    changed_by: user.id,
  });

  return NextResponse.json({ vehicle }, { status: 201 });
}

// PATCH /api/vehicles — update vehicle status (used by fleet operations)
export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single();
  if (!profile || !can(profile.role, "vehicle_manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { data: vehicle, error } = await supabase
    .from("vehicles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vehicle });
}
