// ============================================================
// SUPABASE EDGE FUNCTION — send-notifications
// General-purpose notification dispatcher
// Can be called by webhooks, pg_cron, or API routes
// Deploy: supabase functions deploy send-notifications
// ============================================================
// @ts-nocheck — Deno runtime
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NotificationChannel = "telegram_ops" | "telegram_sales" | "telegram_finance" | "whatsapp" | "email";

interface NotificationPayload {
  channels: NotificationChannel[];
  message: string;
  subject?: string;       // For email
  to_email?: string;      // For email — defaults to agency email
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { channels, message, subject, to_email }: NotificationPayload = await req.json();

    if (!channels || !message) {
      return new Response(JSON.stringify({ error: "channels and message are required" }), { status: 400, headers: corsHeaders });
    }

    const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const results: Record<string, boolean> = {};

    for (const channel of channels) {
      try {
        switch (channel) {
          case "telegram_ops": {
            const chatId = Deno.env.get("TELEGRAM_CHAT_ID_OPS");
            if (!telegramToken || !chatId) { results[channel] = false; break; }
            const res = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
            });
            results[channel] = res.ok;
            break;
          }
          case "telegram_sales": {
            const chatId = Deno.env.get("TELEGRAM_CHAT_ID_SALES");
            if (!telegramToken || !chatId) { results[channel] = false; break; }
            const res = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
            });
            results[channel] = res.ok;
            break;
          }
          case "telegram_finance": {
            const chatId = Deno.env.get("TELEGRAM_CHAT_ID_FINANCE");
            if (!telegramToken || !chatId) { results[channel] = false; break; }
            const res = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
            });
            results[channel] = res.ok;
            break;
          }
          case "whatsapp": {
            const phone = Deno.env.get("CALLMEBOT_PHONE");
            const apiKey = Deno.env.get("CALLMEBOT_APIKEY");
            if (!phone || !apiKey) { results[channel] = false; break; }
            const plain = message.replace(/<[^>]+>/g, "");
            const res = await fetch(
              `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(plain)}&apikey=${apiKey}`
            );
            results[channel] = res.ok;
            break;
          }
          case "email": {
            const resendKey = Deno.env.get("RESEND_API_KEY");
            const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@fhdantourism.co.za";
            const fromName = Deno.env.get("RESEND_FROM_NAME") ?? "Fhdan Tourism";
            const recipient = to_email ?? fromEmail;
            if (!resendKey) { results[channel] = false; break; }
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                from: `${fromName} <${fromEmail}>`,
                to: [recipient],
                subject: subject ?? "Fhdan Fleet Hub Notification",
                html: message.replace(/\n/g, "<br/>"),
              }),
            });
            results[channel] = res.ok;
            break;
          }
          default:
            results[channel] = false;
        }
      } catch (err) {
        console.error(`[Notification] Channel ${channel} failed:`, err);
        results[channel] = false;
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
