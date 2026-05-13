// ============================================================
// DRIVERS MANAGEMENT PAGE
// ============================================================
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { DriversTable } from "@/components/drivers/DriversTable";
import { can } from "@/lib/rbac";
import type { UserProfile } from "@/types";

export const runtime = "edge";
export const metadata = { title: "Drivers" };

export default async function DriversPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", user.id).single();
  if (!profile || !can(profile.role, "driver_view")) redirect("/dashboard");

  const { data: drivers } = await supabase
    .from("drivers")
    .select("*")
    .order("status")
    .order("full_name");

  return (
    <AppShell user={profile as UserProfile} title="Drivers" subtitle="Fleet driver roster & availability">
      <DriversTable
        drivers={(drivers ?? []) as any[]}
        canManage={can(profile.role, "driver_manage")}
      />
    </AppShell>
  );
}
