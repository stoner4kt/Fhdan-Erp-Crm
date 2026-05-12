// ============================================================
// SETTINGS PAGE — System Admin only
// ============================================================
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { can } from "@/lib/rbac";
import type { UserProfile } from "@/types";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", user.id).single();
  if (!profile || !can(profile.role, "system_settings")) redirect("/dashboard");

  const { data: allUsers } = await supabase
    .from("user_profiles")
    .select("id, email, full_name, role, is_active, created_at")
    .order("created_at", { ascending: false });

  return (
    <AppShell user={profile as UserProfile} title="System Settings" subtitle="User management and system configuration">
      <div className="page-container max-w-4xl space-y-6">
        {/* User Management */}
        <div className="card-base p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">User Accounts</h2>
            <a href="/auth/register"
              className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors">
              + Invite User
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  {["Name", "Email", "Role", "Status", "Since"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {(allUsers ?? []).map((u: any) => (
                  <tr key={u.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{u.full_name}</td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">{u.email}</td>
                    <td className="px-3 py-2">
                      <span className="badge text-[10px] bg-blue-100 text-blue-700 capitalize">
                        {u.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`badge text-[10px] ${u.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("en-ZA")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Info */}
        <div className="card-base p-6 space-y-3">
          <h2 className="font-semibold">System Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Platform</p>
              <p className="font-medium">Next.js 14 · Supabase · Cloudflare Pages</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Compliance</p>
              <p className="font-medium">POPIA Compliant · TLS 1.3 · AES-256</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Version</p>
              <p className="font-medium">Fleet Hub v1.0.0 · Built by Conextsol</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Support</p>
              <p className="font-medium">conextsol@zohomail.com · 066 119 2498</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
