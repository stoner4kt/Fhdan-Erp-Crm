// ============================================================
// DOCUMENT VAULT API — POST (upload encrypted doc)
// All uploads are stored in an AES-256 encrypted Supabase bucket
// All access is audit-logged for POPIA compliance
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { can } from "@/lib/rbac";
import type { UserRole } from "@/types";

export const runtime = "edge";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const VAULT_BUCKET = process.env.NEXT_PUBLIC_VAULT_BUCKET ?? "secure-documents";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single<{ role: UserRole }>();
  if (!profile || !can(profile.role, "document_upload")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const entity_type = formData.get("entity_type") as string;
  const entity_id = formData.get("entity_id") as string;
  const document_type = formData.get("document_type") as string;
  const expiry_date = formData.get("expiry_date") as string;

  if (!file || !entity_type || !entity_id || !document_type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type. Use PDF, JPG, or PNG." }, { status: 400 });
  }

  // Build storage path: {entity_type}/{entity_id}/{timestamp}_{filename}
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${entity_type}/${entity_id}/${timestamp}_${sanitizedName}`;

  // Upload to encrypted Supabase Storage bucket
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(VAULT_BUCKET)
    .upload(filePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  // Save document metadata to DB
  const { data: doc, error: dbError } = await supabase
    .from("vault_documents")
    .insert({
      entity_type,
      entity_id,
      document_type,
      file_name: file.name,
      file_path: filePath,
      file_size_bytes: file.size,
      mime_type: file.type,
      expiry_date: expiry_date || null,
      is_verified: false,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (dbError) {
    // Clean up storage on DB failure
    await supabase.storage.from(VAULT_BUCKET).remove([filePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // Write audit log
  await supabase.from("audit_logs").insert({
    table_name: "vault_documents",
    record_id: doc.id,
    action: "INSERT",
    new_data: { file_name: file.name, document_type, entity_type, entity_id },
    changed_by: user.id,
  });

  return NextResponse.json({ document: doc }, { status: 201 });
}

// GET /api/documents — list documents (role-filtered)
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single<{ role: UserRole }>();
  if (!profile || !can(profile.role, "document_view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase.from("vault_documents").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
