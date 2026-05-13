// ============================================================
// DOCUMENT DELETE API — DELETE /api/documents/[id]
// POPIA: Deletion is logged permanently. Only System Admin allowed.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/rbac";
import type { UserRole } from "@/types";

export const runtime = "edge";
const VAULT_BUCKET = process.env.NEXT_PUBLIC_VAULT_BUCKET ?? "secure-documents";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, email")
    .eq("id", user.id)
    .single<{ role: UserRole; email: string }>();

  if (!profile || !can(profile.role, "document_delete")) {
    return NextResponse.json(
      { error: "Forbidden — Only System Administrators may delete vault documents" },
      { status: 403 }
    );
  }

  const docId = params.id;

  // Fetch document metadata before deletion
  const { data: doc, error: docErr } = await supabase
    .from("vault_documents")
    .select("*")
    .eq("id", docId)
    .single();

  if (docErr || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // POPIA Audit Log FIRST — record deletion before it happens
  await supabase.from("audit_logs").insert({
    table_name: "vault_documents",
    record_id: docId,
    action: "DELETE",
    old_data: {
      id: doc.id,
      entity_type: doc.entity_type,
      entity_id: doc.entity_id,
      document_type: doc.document_type,
      file_name: doc.file_name,
      file_path: doc.file_path,
      uploaded_by: doc.uploaded_by,
      created_at: doc.created_at,
    },
    new_data: null,
    changed_by: user.id,
    changed_by_email: profile.email,
    changed_by_role: profile.role,
    ip_address: req.headers.get("x-forwarded-for") ?? null,
    user_agent: req.headers.get("user-agent") ?? null,
  });

  // Delete from Supabase Storage
  const { error: storageErr } = await supabase.storage
    .from(VAULT_BUCKET)
    .remove([doc.file_path]);

  if (storageErr) {
    console.error("[VaultDelete] Storage error:", storageErr);
    // Continue with DB deletion even if storage fails
  }

  // Delete from database
  const { error: dbErr } = await supabase
    .from("vault_documents")
    .delete()
    .eq("id", docId);

  if (dbErr) {
    return NextResponse.json({ error: `DB deletion failed: ${dbErr.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted_id: docId });
}

// GET /api/documents/[id] — get single document metadata
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single();
  if (!profile || !can(profile.role, "document_view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: doc, error } = await supabase
    .from("vault_documents")
    .select("id, entity_type, entity_id, document_type, file_name, file_size_bytes, mime_type, expiry_date, is_verified, uploaded_by, created_at")
    .eq("id", params.id)
    .single();

  if (error || !doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  return NextResponse.json({ document: doc });
}
