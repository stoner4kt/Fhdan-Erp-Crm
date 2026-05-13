// ============================================================
// NOTIFICATION HELPERS — Telegram, Callmebot (WhatsApp), Resend
// ============================================================
import { Resend } from "resend";
import type { Booking } from "@/types";
import { formatDateTime, formatZAR, BOOKING_TYPE_LABELS } from "./utils";

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

// ----------------------------
// TELEGRAM ALERTS
// ----------------------------

export type TelegramChannel = "ops" | "sales" | "finance";

const TELEGRAM_CHAT_IDS: Record<TelegramChannel, string> = {
  ops: process.env.TELEGRAM_CHAT_ID_OPS ?? "",
  sales: process.env.TELEGRAM_CHAT_ID_SALES ?? "",
  finance: process.env.TELEGRAM_CHAT_ID_FINANCE ?? "",
};

export async function sendTelegram(
  channel: TelegramChannel,
  message: string
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = TELEGRAM_CHAT_IDS[channel];

  if (!token || !chatId) {
    console.warn(`[Telegram] Missing token or chat_id for channel: ${channel}`);
    return false;
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );
    const data = await res.json();
    if (!data.ok) throw new Error(data.description);
    return true;
  } catch (err) {
    console.error("[Telegram] Send failed:", err);
    return false;
  }
}

// ----------------------------
// CALLMEBOT (WhatsApp)
// ----------------------------

export async function sendWhatsApp(message: string): Promise<boolean> {
  const phone = process.env.CALLMEBOT_PHONE;
  const apiKey = process.env.CALLMEBOT_APIKEY;

  if (!phone || !apiKey) {
    console.warn("[Callmebot] Missing phone or apiKey");
    return false;
  }

  try {
    const encoded = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encoded}&apikey=${apiKey}`;
    const res = await fetch(url);
    return res.ok;
  } catch (err) {
    console.error("[Callmebot] Send failed:", err);
    return false;
  }
}

// ----------------------------
// RESEND EMAIL
// ----------------------------

export async function sendVoucherEmail(params: {
  toEmail: string;
  toName: string;
  bookingRef: string;
  voucherPdfBase64: string;
  booking: Booking;
}): Promise<boolean> {
  const { toEmail, toName, bookingRef, voucherPdfBase64, booking } = params;

  try {
    const resend = getResendClient();
    if (!resend) return false;
    const { error } = await resend.emails.send({
      from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
      to: [toEmail],
      subject: `Your Travel Voucher — Booking ${bookingRef}`,
      html: buildVoucherEmailHTML(toName, booking),
      attachments: [
        {
          filename: `voucher-${bookingRef}.pdf`,
          content: voucherPdfBase64,
        },
      ],
    });

    if (error) throw new Error(error.message);
    return true;
  } catch (err) {
    console.error("[Resend] Voucher email failed:", err);
    return false;
  }
}

export async function sendArrivalAlertEmail(params: {
  booking: Booking;
}): Promise<boolean> {
  const { booking } = params;
  const agencyEmail = process.env.RESEND_FROM_EMAIL!;

  try {
    const resend = getResendClient();
    if (!resend) return false;
    const { error } = await resend.emails.send({
      from: `${process.env.RESEND_FROM_NAME} <${agencyEmail}>`,
      to: [agencyEmail],
      subject: `ARRIVAL ALERT — ${booking.booking_reference} arriving in 24h`,
      html: buildArrivalAlertHTML(booking),
    });

    if (error) throw new Error(error.message);
    return true;
  } catch (err) {
    console.error("[Resend] Arrival alert email failed:", err);
    return false;
  }
}

export async function sendDepositReminderEmail(params: {
  toEmail: string;
  toName: string;
  booking: Booking;
}): Promise<boolean> {
  const { toEmail, toName, booking } = params;

  try {
    const resend = getResendClient();
    if (!resend) return false;
    const { error } = await resend.emails.send({
      from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
      to: [toEmail],
      subject: `Deposit Required — Booking ${booking.booking_reference}`,
      html: buildDepositReminderHTML(toName, booking),
    });

    if (error) throw new Error(error.message);
    return true;
  } catch (err) {
    console.error("[Resend] Deposit reminder failed:", err);
    return false;
  }
}

// ----------------------------
// BOOKING NOTIFICATION DISPATCHER
// ----------------------------

export async function notifyNewBooking(booking: Booking): Promise<void> {
  const msg =
    `🚗 <b>New Booking Created</b>\n` +
    `Ref: <code>${booking.booking_reference}</code>\n` +
    `Type: ${BOOKING_TYPE_LABELS[booking.booking_type]}\n` +
    `Pickup: ${formatDateTime(booking.pickup_datetime)}\n` +
    `From: ${booking.pickup_location}\n` +
    `Amount: ${formatZAR(booking.total_zar)}\n` +
    `Deposit: ${booking.deposit_paid ? "✅ Paid" : "⏳ Pending"}`;

  await Promise.all([
    sendTelegram("sales", msg),
    booking.total_zar > 20000 ? sendTelegram("ops", msg) : Promise.resolve(),
  ]);
}

export async function notifyArrivalIn24h(booking: Booking): Promise<void> {
  const msg =
    `⏰ <b>ARRIVAL ALERT — 24h</b>\n` +
    `Ref: <code>${booking.booking_reference}</code>\n` +
    `Client: ${booking.client?.full_name ?? "N/A"}\n` +
    `Vehicle: ${booking.vehicle?.registration ?? "N/A"} — ${booking.vehicle?.make} ${booking.vehicle?.model}\n` +
    `Driver: ${booking.driver?.full_name ?? "Self-Drive"}\n` +
    `Pickup: ${formatDateTime(booking.pickup_datetime)}\n` +
    `Location: ${booking.pickup_location}`;

  await Promise.all([
    sendTelegram("ops", msg),
    sendArrivalAlertEmail({ booking }),
    sendWhatsApp(msg.replace(/<[^>]+>/g, "")),
  ]);
}

export async function notifyLateReturn(booking: Booking): Promise<void> {
  const msg =
    `🚨 <b>LATE RETURN ALERT</b>\n` +
    `Ref: <code>${booking.booking_reference}</code>\n` +
    `Vehicle: ${booking.vehicle?.registration ?? "N/A"}\n` +
    `Expected: ${formatDateTime(booking.dropoff_datetime)}\n` +
    `Contact fleet coordinator immediately!`;

  await sendTelegram("ops", msg);
}

// ----------------------------
// EMAIL HTML TEMPLATES
// ----------------------------

function buildVoucherEmailHTML(name: string, booking: Booking): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family: Arial, sans-serif; background: #f9fafb; padding: 32px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
    <div style="background: #ea580c; padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Fhdan Tourism</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Your Travel Voucher</p>
    </div>
    <div style="padding: 32px;">
      <p>Dear ${name},</p>
      <p>Thank you for booking with Fhdan Tourism. Please find your travel voucher attached to this email.</p>
      <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="margin: 0 0 8px; font-weight: bold;">Booking Reference: ${booking.booking_reference}</p>
        <p style="margin: 0 0 4px;">Pickup: ${formatDateTime(booking.pickup_datetime)}</p>
        <p style="margin: 0 0 4px;">From: ${booking.pickup_location}</p>
        <p style="margin: 0;">Total: ${formatZAR(booking.total_zar)}</p>
      </div>
      <p>Please present this voucher to your driver at pickup time.</p>
      <p>For assistance, contact us at <a href="mailto:Info@fhdan.co.za">Info@fhdan.co.za</a></p>
    </div>
    <div style="background: #f3f4f6; padding: 16px; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #6b7280;">© 2026 Fhdan Tourism. POPIA Compliant.</p>
    </div>
  </div>
</body>
</html>`;
}

function buildArrivalAlertHTML(booking: Booking): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; padding: 32px;">
  <h2>⏰ ARRIVAL ALERT — 24 Hours</h2>
  <p><strong>Booking:</strong> ${booking.booking_reference}</p>
  <p><strong>Client:</strong> ${booking.client?.full_name}</p>
  <p><strong>Vehicle:</strong> ${booking.vehicle?.registration} — ${booking.vehicle?.make} ${booking.vehicle?.model}</p>
  <p><strong>Driver:</strong> ${booking.driver?.full_name ?? "Self-Drive"}</p>
  <p><strong>Pickup Time:</strong> ${formatDateTime(booking.pickup_datetime)}</p>
  <p><strong>Pickup Location:</strong> ${booking.pickup_location}</p>
  <p><strong>Balance Due:</strong> ${formatZAR(booking.balance_due_zar)}</p>
  <hr/>
  <p style="color: #6b7280; font-size: 12px;">This is an automated alert from Fhdan Fleet Hub.</p>
</body>
</html>`;
}

function buildDepositReminderHTML(name: string, booking: Booking): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; padding: 32px;">
  <h2>Deposit Required — ${booking.booking_reference}</h2>
  <p>Dear ${name},</p>
  <p>A deposit of <strong>${formatZAR(booking.deposit_amount_zar)}</strong> is required to confirm your booking.</p>
  <p>Please make payment at your earliest convenience to secure your vehicle.</p>
  <p>For assistance, contact us at <a href="mailto:Info@fhdan.co.za">Info@fhdan.co.za</a></p>
</body>
</html>`;
}
