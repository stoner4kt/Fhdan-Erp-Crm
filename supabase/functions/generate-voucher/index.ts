// ============================================================
// SUPABASE EDGE FUNCTION — generate-voucher
// Generates PDF travel voucher using jsPDF and emails it via Resend
// Deploy: supabase functions deploy generate-voucher
// ============================================================
// @ts-nocheck — Deno runtime
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { booking_id } = await req.json();
    if (!booking_id) return new Response(JSON.stringify({ error: "booking_id required" }), { status: 400, headers: corsHeaders });

    // Fetch booking
    const { data: booking, error } = await supabase
      .from("bookings")
      .select(`
        *, 
        client:clients(full_name, email, phone),
        vehicle:vehicles(registration, make, model, year, color),
        driver:drivers(full_name, phone)
      `)
      .eq("id", booking_id)
      .single();

    if (error || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404, headers: corsHeaders });
    }

    // Generate PDF
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 16;

    // Header
    doc.setFillColor(234, 88, 12);
    doc.rect(0, 0, pageW, 42, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("FHDAN TOURISM", margin, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Travel Voucher | Info@fhdan.co.za", margin, 26);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(booking.booking_reference, pageW - margin, 20, { align: "right" });
    doc.setFontSize(7);
    doc.text("BOOKING REFERENCE", pageW - margin, 27, { align: "right" });

    let y = 56;

    // Client & Vehicle
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("CLIENT", margin, y);
    doc.text("VEHICLE", pageW / 2 + 4, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(booking.client?.full_name ?? "N/A", margin, y);
    doc.text(`${booking.vehicle?.year} ${booking.vehicle?.make} ${booking.vehicle?.model}`, pageW / 2 + 4, y);
    y += 5;
    doc.setTextColor(100, 100, 100);
    doc.text(booking.client?.email ?? "", margin, y);
    doc.text(`Reg: ${booking.vehicle?.registration ?? "N/A"}`, pageW / 2 + 4, y);
    y += 5;
    doc.text(booking.client?.phone ?? "", margin, y);
    doc.text(`Colour: ${booking.vehicle?.color ?? "N/A"}`, pageW / 2 + 4, y);

    y += 12;
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(249, 115, 22);
    doc.rect(margin, y - 4, pageW - margin * 2, 0.4, "F");

    // Trip details
    y += 6;
    const details = [
      ["Pickup Date & Time", booking.pickup_datetime?.replace("T", " ").slice(0, 16)],
      ["Dropoff Date & Time", booking.dropoff_datetime?.replace("T", " ").slice(0, 16)],
      ["Pickup Location", booking.pickup_location],
      ["Dropoff Location", booking.dropoff_location],
      ["Drive Mode", booking.booking_type === "chauffeur" ? "Chauffeur-Driven" : "Self-Drive"],
      ["Driver", booking.driver?.full_name ?? "Self-Drive"],
      ["Special Requirements", booking.special_requirements ?? "None"],
    ];

    details.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(label + ":", margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(value ?? "—"), margin + 55, y, { maxWidth: pageW - margin * 2 - 55 });
      y += 6;
    });

    y += 4;
    doc.setFillColor(249, 115, 22);
    doc.rect(margin, y - 4, pageW - margin * 2, 0.4, "F");
    y += 4;

    // Financials
    const financials = [
      ["Subtotal", `R${Number(booking.subtotal_zar ?? 0).toFixed(2)}`],
      ["Discount", `(R${Number(booking.discount_amount_zar ?? 0).toFixed(2)})`],
      ["VAT (15%)", `R${Number(booking.vat_amount_zar ?? 0).toFixed(2)}`],
      ["TOTAL DUE", `R${Number(booking.total_zar ?? 0).toFixed(2)}`],
      ["Deposit Paid", `${booking.deposit_paid ? "Yes — " : "No — "}R${Number(booking.deposit_amount_zar ?? 0).toFixed(2)}`],
      ["Balance Due", `R${Number(booking.balance_due_zar ?? 0).toFixed(2)}`],
    ];

    financials.forEach(([label, value], i) => {
      if (i === 3) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(234, 88, 12);
      } else {
        doc.setFont("helvetica", i === financials.length - 1 ? "bold" : "normal");
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
      }
      doc.text(label + ":", margin, y);
      doc.text(value, pageW - margin, y, { align: "right" });
      y += 6;
    });

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 12;
    doc.setFillColor(234, 88, 12);
    doc.rect(0, footerY - 4, pageW, 16, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(
      `Generated: ${new Date().toISOString().slice(0, 10)} | Fhdan Tourism | POPIA Compliant | ${booking.booking_reference}`,
      pageW / 2, footerY + 4, { align: "center" }
    );

    const pdfBytes = doc.output("arraybuffer");
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

    // Upload to Supabase Storage
    const pdfPath = `vouchers/${booking.booking_reference}.pdf`;
    await supabase.storage.from("vouchers").upload(pdfPath, new Uint8Array(pdfBytes), {
      contentType: "application/pdf",
      upsert: true,
    });

    // Email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey && booking.client?.email) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `Fhdan Tourism <${Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@fhdantourism.co.za"}>`,
          to: [booking.client.email],
          subject: `Your Travel Voucher — ${booking.booking_reference}`,
          html: `<p>Dear ${booking.client.full_name},</p><p>Please find your travel voucher for booking <strong>${booking.booking_reference}</strong> attached.</p><p>Fhdan Tourism | Info@fhdan.co.za</p>`,
          attachments: [{ filename: `voucher-${booking.booking_reference}.pdf`, content: pdfBase64 }],
        }),
      });
    }

    // Update booking record
    await supabase.from("bookings").update({ voucher_sent_at: new Date().toISOString() }).eq("id", booking_id);

    return new Response(JSON.stringify({ success: true, pdf_base64: pdfBase64 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
