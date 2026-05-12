// ============================================================
// NEW BOOKING PAGE — Rapid Profile Creator + Dual-Mode Form
// ============================================================
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { BookingForm } from "@/components/bookings/BookingForm";
import { can } from "@/lib/rbac";
import type { UserProfile, Vehicle, Driver } from "@/types";

export const metadata = { title: "New Booking" };

export default async function NewBookingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", user.id).single();
  if (!profile || !can(profile.role, "booking_create")) redirect("/dashboard");

  const [{ data: vehicles }, { data: drivers }] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, registration, make, model, year, color, category, drive_modes, status, daily_rate_zar, chauffeur_rate_zar, seating_capacity")
      .eq("status", "available")
      .order("make"),
    supabase
      .from("drivers")
      .select("id, full_name, phone, status, license_code")
      .eq("status", "available")
      .order("full_name"),
  ]);

  return (
    <AppShell user={profile as UserProfile} title="New Booking" subtitle="Create a booking with Rapid Profile Creator">
      <BookingForm
        vehicles={(vehicles ?? []) as any[]}
        drivers={(drivers ?? []) as any[]}
        createdBy={user.id}
      />
    </AppShell>
  );
}
