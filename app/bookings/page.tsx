// ============================================================
// BOOKINGS LIST PAGE
// ============================================================
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { BookingsList } from "@/components/bookings/BookingsList";
import { can } from "@/lib/rbac";
import type { UserProfile } from "@/types";

export const metadata = { title: "Bookings" };

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/auth/login");

  const isDriver = profile.role === "driver";
  const page = parseInt(searchParams.page ?? "1");
  const perPage = 20;
  const statusFilter = searchParams.status;

  let query = supabase
    .from("bookings")
    .select(`
      id, booking_reference, status, booking_type, total_zar,
      pickup_datetime, dropoff_datetime, pickup_location, dropoff_location,
      deposit_paid, created_at,
      client:clients(full_name, email, phone),
      vehicle:vehicles(registration, make, model),
      driver:drivers(full_name)
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  // Drivers only see their own trips
  if (isDriver) {
    const { data: driverRecord } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (driverRecord) query = query.eq("driver_id", driverRecord.id);
  }

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: bookings, count } = await query;

  return (
    <AppShell
      user={profile as UserProfile}
      title={isDriver ? "My Trips" : "Bookings"}
      subtitle={`${count ?? 0} total bookings`}
    >
      <BookingsList
        bookings={(bookings ?? []) as any[]}
        total={count ?? 0}
        page={page}
        perPage={perPage}
        canCreate={can(profile.role, "booking_create")}
        isDriver={isDriver}
        currentStatus={statusFilter}
      />
    </AppShell>
  );
}
