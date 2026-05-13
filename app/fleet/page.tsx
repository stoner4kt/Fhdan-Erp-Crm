// ============================================================
// FLEET MANAGEMENT PAGE
// ============================================================
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { VehicleGrid } from "@/components/fleet/VehicleGrid";
import { can } from "@/lib/rbac";
import type { UserProfile, Vehicle } from "@/types";

export const runtime = "edge";
export const metadata = { title: "Fleet Management" };

export default async function FleetPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", user.id).single();
  if (!profile || !can(profile.role, "vehicle_view")) redirect("/dashboard");

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("*")
    .order("status")
    .order("make");

  return (
    <AppShell user={profile as UserProfile} title="Fleet Management" subtitle="30-vehicle fleet — live availability">
      <VehicleGrid
        vehicles={(vehicles ?? []) as Vehicle[]}
        userRole={profile.role}
        canManage={can(profile.role, "vehicle_update")}
        canCreate={can(profile.role, "vehicle_create")}
      />
    </AppShell>
  );
}
