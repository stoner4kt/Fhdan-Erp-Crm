// ============================================================
// SUPABASE EDGE FUNCTION — send-arrival-alert
// Triggered by pg_cron 24 hours before booking pickup
// Sends Telegram + email + WhatsApp alerts
// Deploy: supabase functions deploy send-arrival-alert
// ============================================================
// @ts-nocheck — Deno runtime
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find bookings due in ~24 hours (23h to 25h window) that haven't been alerted
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(`
      id, booking_reference, pickup_datetime, pickup_location, dropoff_location,
      booking_type, balance_due_zar,
      client:clients(full_name, email, phone),
      vehicle:vehicles(registration, make, model),
      driver:drivers(full_name, phone)
    `)
    .in("status", ["confirmed", "pending_deposit"])
    .eq("arrival_alert_sent", false)
    .gte("pickup_datetime", new Date(now.getTime() + 23 * 3600000).toISOString())
    .lte("pickup_datetime", new Date(now.getTime() + 25 * 3600000).toISOString());

  if (error) {
    console.error("Query error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

  const results = [];

  for (const booking of bookings ?? []) {
    const msg =
      `⏰ <b>ARRIVAL ALERT — 24 HOURS</b>\n\n` +
      `📋 Ref: <code>${booking.booking_reference}</code>\n` +
      `👤 Client: ${booking.client?.full_name ?? "N/A"} (${booking.client?.phone ?? ""})\n` +
      `🚗 Vehicle: ${booking.vehicle?.registration} — ${booking.vehicle?.make} ${booking.vehicle?.model}\n` +
      `🧑‍✈️ Driver: ${booking.driver?.full_name ?? "Self-Drive"}\n` +
      `📍 Pickup: ${booking.pickup_location}\n` +
      `🕐 Time: ${new Date(booking.pickup_datetime).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}\n` +
      `💰 Balance Due: R${Number(booking.balance_due_zar ?? 0).toFixed(2)}`;

    // Telegram alert — Operations channel
    const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID_OPS");
    if (telegramToken && chatId) {
      await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML" }),
      });
    }

    // Callmebot WhatsApp alert
    const phone = Deno.env.get("CALLMEBOT_PHONE");
    const cbKey = Deno.env.get("CALLMEBOT_APIKEY");
    if (phone && cbKey) {
      const plainMsg = msg.replace(/<[^>]+>/g, "");
      await fetch(`https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(plainMsg)}&apikey=${cbKey}`);
    }

    // Email alert to agency
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@fhdantourism.co.za";
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `Fhdan Tourism <${fromEmail}>`,
          to: [fromEmail],
          subject: `⏰ ARRIVAL ALERT — ${booking.booking_reference} — Pickup in 24 hours`,
          html: msg.replace(/<[^>]+>/g, "").replace(/\n/g, "<br/>"),
        }),
      });
    }

    // Mark alert as sent
    await supabase
      .from("bookings")
      .update({ arrival_alert_sent: true })
      .eq("id", booking.id);

    // Audit log
    await supabase.from("audit_logs").insert({
      table_name: "bookings",
      record_id: booking.id,
      action: "UPDATE",
      new_data: { arrival_alert_sent: true, alert_sent_at: now.toISOString() },
      changed_by: "system",
    });

    results.push({ booking_reference: booking.booking_reference, alerted: true });
  }

  return new Response(
    JSON.stringify({ processed: results.length, bookings: results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
