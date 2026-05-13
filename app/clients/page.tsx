// ============================================================
// CLIENTS CRM PAGE
// ============================================================
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ClientsTable } from "@/components/clients/ClientsTable";
import { can } from "@/lib/rbac";
import type { UserProfile } from "@/types";

export const runtime = "edge";
export const metadata = { title: "Clients" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", user.id).single();
  if (!profile || !can(profile.role, "client_view")) redirect("/dashboard");

  const page = parseInt(searchParams.page ?? "1");
  const perPage = 25;
  const q = searchParams.q ?? "";

  let query = supabase
    .from("clients")
    .select(`
      id, email, full_name, phone, client_type, status, company_name,
      preferred_currency, tax_zone, country, created_at
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,company_name.ilike.%${q}%`);
  }

  const { data: clients, count } = await query;

  return (
    <AppShell user={profile as UserProfile} title="Clients" subtitle={`${count ?? 0} registered clients`}>
      <ClientsTable
        clients={(clients ?? []) as any[]}
        total={count ?? 0}
        page={page}
        perPage={perPage}
        canCreate={can(profile.role, "client_create")}
        searchQuery={q}
      />
    </AppShell>
  );
}
