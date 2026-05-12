// ============================================================
// VOUCHER API — Generate PDF voucher and send via email
// POST /api/voucher { booking_id }
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/rbac";
import { voucherToBase64 } from "@/lib/pdf-voucher";
import { sendVoucherEmail } from "@/lib/notifications";
import type { UserRole } from "@/types";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single<{ role: UserRole }>();
  if (!profile || !can(profile.role, "voucher_generate")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { booking_id } = await req.json();
  if (!booking_id) return NextResponse.json({ error: "booking_id required" }, { status: 400 });

  // Fetch full booking with relations
  const { data: booking, error } = await supabase
    .from("bookings")
    .select(`*, client:clients(*), vehicle:vehicles(*), driver:drivers(*)`)
    .eq("id", booking_id)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Generate PDF
  const pdfBase64 = voucherToBase64(booking as any);

  // Upload PDF to Supabase Storage
  const pdfPath = `vouchers/${booking.booking_reference}.pdf`;
  const pdfBuffer = Buffer.from(pdfBase64, "base64");
  await supabase.storage
    .from("vouchers")
    .upload(pdfPath, pdfBuffer, { contentType: "application/pdf", upsert: true });

  // Get signed URL (60 min)
  const { data: signedUrl } = await supabase.storage
    .from("vouchers")
    .createSignedUrl(pdfPath, 3600);

  // Send voucher email to client
  if (booking.client?.email) {
    await sendVoucherEmail({
      toEmail: booking.client.email,
      toName: booking.client.full_name,
      bookingRef: booking.booking_reference,
      voucherPdfBase64: pdfBase64,
      booking: booking as any,
    });
  }

  // Update booking with voucher URL and sent timestamp
  await supabase
    .from("bookings")
    .update({
      voucher_url: signedUrl?.signedUrl ?? null,
      voucher_sent_at: new Date().toISOString(),
    })
    .eq("id", booking_id);

  // Audit log
  await supabase.from("audit_logs").insert({
    table_name: "bookings",
    record_id: booking_id,
    action: "UPDATE",
    new_data: { voucher_generated: true },
    changed_by: user.id,
  });

  return NextResponse.json({
    success: true,
    voucher_url: signedUrl?.signedUrl,
    pdf_base64: pdfBase64,
  });
}
