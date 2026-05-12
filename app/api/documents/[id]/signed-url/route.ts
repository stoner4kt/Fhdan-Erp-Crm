// ============================================================
// SIGNED URL API — Generate 60-min expiring signed URL
// GET /api/documents/[id]/signed-url
// All accesses are permanently audit-logged (POPIA)
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/rbac";
import type { UserRole } from "@/types";

const VAULT_BUCKET = process.env.NEXT_PUBLIC_VAULT_BUCKET ?? "secure-documents";
const SIGNED_URL_EXPIRY_SECONDS = 3600; // 60 minutes

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("user_profiles").select("role, email").eq("id", user.id).single<{ role: UserRole; email: string }>();
  if (!profile || !can(profile.role, "document_download")) {
    return NextResponse.json({ error: "Forbidden — Document access restricted by RBAC policy" }, { status: 403 });
  }

  const docId = params.id;

  // Fetch document metadata
  const { data: doc, error: docErr } = await supabase
    .from("vault_documents")
    .select("*")
    .eq("id", docId)
    .single();

  if (docErr || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Generate signed URL (expires in 60 minutes)
  const { data: signed, error: signErr } = await supabase.storage
    .from(VAULT_BUCKET)
    .createSignedUrl(doc.file_path, SIGNED_URL_EXPIRY_SECONDS);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: "Could not generate signed URL" }, { status: 500 });
  }

  // POPIA Audit Log — every view is recorded permanently
  await supabase.from("audit_logs").insert({
    table_name: "vault_documents",
    record_id: docId,
    action: "VIEW_DOCUMENT",
    new_data: {
      document_type: doc.document_type,
      entity_type: doc.entity_type,
      entity_id: doc.entity_id,
      file_name: doc.file_name,
      url_expires_at: new Date(Date.now() + SIGNED_URL_EXPIRY_SECONDS * 1000).toISOString(),
    },
    changed_by: user.id,
    changed_by_email: profile.email,
    changed_by_role: profile.role,
    ip_address: req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? null,
    user_agent: req.headers.get("user-agent") ?? null,
  });

  return NextResponse.json({
    url: signed.signedUrl,
    expires_in_seconds: SIGNED_URL_EXPIRY_SECONDS,
    document_name: doc.file_name,
    document_type: doc.document_type,
  });
}
