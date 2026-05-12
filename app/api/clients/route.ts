// ============================================================
// CLIENTS API ROUTE — POST (create/UPSERT), GET (list)
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { can } from "@/lib/rbac";
import type { UserRole } from "@/types";

// GET /api/clients — list all clients (paginated)
export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single<{ role: UserRole }>();
  if (!profile || !can(profile.role, "client_view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const perPage = parseInt(url.searchParams.get("per_page") ?? "25");

  const { data, count, error } = await supabase
    .from("clients")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count, page, per_page: perPage });
}

// POST /api/clients — UPSERT: check by email or ID number, create if not found
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single<{ role: UserRole }>();
  if (!profile || !can(profile.role, "client_create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { email, id_number, ...rest } = body;

  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  // UPSERT logic — check existing
  let existingQuery = supabase.from("clients").select("*");
  if (id_number) {
    existingQuery = existingQuery.or(`email.eq.${email},id_number.eq.${id_number}`);
  } else {
    existingQuery = existingQuery.eq("email", email);
  }

  const { data: existing } = await existingQuery.maybeSingle();
  if (existing) {
    // Client exists — update and return
    const { data: updated, error } = await (supabase as any)
      .from("clients")
      .update({ ...rest, id_number, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ client: updated, created: false });
  }

  // Create new client
  const { data: newClient, error } = await supabase
    .from("clients")
    .insert({
      email,
      id_number: id_number || null,
      ...rest,
      status: "active",
      payment_terms_days: rest.payment_terms_days ?? 30,
      country: rest.country ?? "South Africa",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ client: newClient, created: true }, { status: 201 });
}
