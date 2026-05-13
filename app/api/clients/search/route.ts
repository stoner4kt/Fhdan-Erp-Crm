// ============================================================
// CLIENT SEARCH API — Used by Rapid Profile Creator
// GET /api/clients/search?q=email@example.com or SA ID
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/rbac";
import type { UserRole } from "@/types";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single<{ role: UserRole }>();
  if (!profile || !can(profile.role, "client_view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ client: null });

  const isEmail = q.includes("@");

  let query = supabase.from("clients").select("*");
  if (isEmail) {
    query = query.eq("email", q);
  } else {
    // Could be SA ID or passport
    query = query.eq("id_number", q);
  }

  const { data: client } = await query.maybeSingle();
  return NextResponse.json({ client: client ?? null });
}
