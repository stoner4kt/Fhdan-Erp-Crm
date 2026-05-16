// ============================================================
// DISPATCHER'S COCKPIT — Real-time fleet overview
// ============================================================
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { DispatcherCockpit } from "@/components/dashboard/DispatcherCockpit";
import { can } from "@/lib/rbac";
import type { UserProfile } from "@/types";

export const runtime = "edge";
export const metadata = { title: "Dispatcher's Cockpit" };

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Fetch user profile with role
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/unauthorized?reason=missing_profile");

  if (!can(profile.role, "dispatcher_cockpit") && !can(profile.role, "booking_view_own_trips")) {
    redirect("/unauthorized?reason=role_denied");
  }

  // Fetch dashboard stats
  const [
    { count: totalBookingsMonth },
    { data: activeTrips },
    { data: vehicleStats },
    { data: recentBookings },
    { data: pendingDeposits },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),

    supabase
      .from("bookings")
      .select(`
        id, booking_reference, status, booking_type,
        pickup_datetime, dropoff_datetime, pickup_location, dropoff_location,
        client:clients(full_name, phone),
        vehicle:vehicles(registration, make, model, category),
        driver:drivers(full_name, phone)
      `)
      .in("status", ["active", "confirmed"])
      .order("pickup_datetime", { ascending: true })
      .limit(20),

    supabase
      .from("vehicles")
      .select("status"),

    supabase
      .from("bookings")
      .select(`
        id, booking_reference, status, booking_type, total_zar, created_at,
        pickup_datetime, pickup_location,
        client:clients(full_name)
      `)
      .order("created_at", { ascending: false })
      .limit(10),

    supabase
      .from("bookings")
      .select("id, booking_reference, deposit_amount_zar, total_zar, client:clients(full_name, email)")
      .eq("deposit_paid", false)
      .in("status", ["pending_deposit", "confirmed"])
      .order("pickup_datetime", { ascending: true })
      .limit(10),
  ]);

  // Calculate vehicle stats
  const available = vehicleStats?.filter((v) => v.status === "available").length ?? 0;
  const booked = vehicleStats?.filter((v) => v.status === "booked").length ?? 0;
  const maintenance = vehicleStats?.filter((v) => v.status === "maintenance").length ?? 0;

  const stats = {
    total_bookings_month: totalBookingsMonth ?? 0,
    active_trips: activeTrips?.length ?? 0,
    vehicles_available: available,
    vehicles_booked: booked,
    vehicles_maintenance: maintenance,
    pending_deposits: pendingDeposits?.length ?? 0,
  };

  return (
    <AppShell
      user={profile as UserProfile}
      title="Dispatcher's Cockpit"
      subtitle="Live fleet overview & operations"
    >
      <DispatcherCockpit
        user={profile as UserProfile}
        stats={stats}
        activeTrips={(activeTrips ?? []) as any[]}
        recentBookings={(recentBookings ?? []) as any[]}
        pendingDeposits={(pendingDeposits ?? []) as any[]}
      />
    </AppShell>
  );
}
