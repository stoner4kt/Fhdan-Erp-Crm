// ============================================================
// FINANCE DASHBOARD PAGE
// ============================================================
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { FinanceDashboard } from "@/components/finance/FinanceDashboard";
import { can } from "@/lib/rbac";
import type { UserProfile } from "@/types";

export const metadata = { title: "Finance" };

export default async function FinancePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", user.id).single();
  if (!profile || !can(profile.role, "finance_dashboard")) redirect("/dashboard");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { data: invoices },
    { data: recentPayments },
    { data: monthBookings },
    { data: overdue },
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select(`
        id, invoice_number, status, total_zar, amount_paid_zar,
        balance_due_zar, due_date, created_at,
        client:clients(full_name, email),
        booking:bookings(booking_reference)
      `)
      .order("created_at", { ascending: false })
      .limit(20),

    supabase
      .from("payments")
      .select(`
        id, amount_zar, method, created_at,
        invoice:invoices(invoice_number, client:clients(full_name))
      `)
      .order("created_at", { ascending: false })
      .limit(10),

    supabase
      .from("bookings")
      .select("total_zar, deposit_amount_zar, deposit_paid, vat_amount_zar, status")
      .gte("created_at", monthStart),

    supabase
      .from("invoices")
      .select("id, invoice_number, balance_due_zar, due_date, client:clients(full_name)")
      .eq("status", "overdue"),
  ]);

  const totalRevenue = monthBookings?.filter((b) => b.status === "completed").reduce((s, b) => s + b.total_zar, 0) ?? 0;
  const totalVAT = monthBookings?.filter((b) => b.status === "completed").reduce((s, b) => s + b.vat_amount_zar, 0) ?? 0;
  const depositsCollected = monthBookings?.filter((b) => b.deposit_paid).reduce((s, b) => s + b.deposit_amount_zar, 0) ?? 0;

  return (
    <AppShell user={profile as UserProfile} title="Finance" subtitle="Invoices, payments, and revenue">
      <FinanceDashboard
        invoices={(invoices ?? []) as any[]}
        recentPayments={(recentPayments ?? []) as any[]}
        overdueInvoices={(overdue ?? []) as any[]}
        monthlyRevenue={totalRevenue}
        monthlyVAT={totalVAT}
        depositsCollected={depositsCollected}
        canManage={can(profile.role, "invoice_create")}
      />
    </AppShell>
  );
}
