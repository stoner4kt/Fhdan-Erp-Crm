// ============================================================
// ENCRYPTED DOCUMENT VAULT PAGE — POPIA-compliant
// ============================================================
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { DocumentVault } from "@/components/vault/DocumentVault";
import { can } from "@/lib/rbac";
import type { UserProfile } from "@/types";

export const metadata = { title: "Document Vault" };

export default async function VaultPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", user.id).single();
  if (!profile || !can(profile.role, "document_view")) redirect("/dashboard");

  const { data: documents } = await supabase
    .from("vault_documents")
    .select(`
      id, entity_type, entity_id, document_type, file_name,
      file_size_bytes, mime_type, expiry_date, is_verified,
      uploaded_by, created_at
    `)
    .order("created_at", { ascending: false });

  return (
    <AppShell
      user={profile as UserProfile}
      title="Encrypted Document Vault"
      subtitle="POPIA-compliant · AES-256 encrypted · Signed URLs expire in 60 min"
    >
      <DocumentVault
        documents={(documents ?? []) as any[]}
        canUpload={can(profile.role, "document_upload")}
        canDownload={can(profile.role, "document_download")}
        canDelete={can(profile.role, "document_delete")}
        userId={user.id}
      />
    </AppShell>
  );
}
