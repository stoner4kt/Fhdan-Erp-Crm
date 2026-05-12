// ============================================================
// PDF VOUCHER GENERATOR — jsPDF
// Generates a branded Travel Voucher PDF in the browser/server
// ============================================================
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Booking } from "@/types";
import { formatDate, formatDateTime, formatZAR, BOOKING_TYPE_LABELS, daysBetween } from "./utils";

export function generateVoucherPDF(booking: Booking): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;

  // ── Header Background ─────────────────────────────────
  doc.setFillColor(234, 88, 12); // brand orange
  doc.rect(0, 0, pageW, 45, "F");

  // ── Company Name ──────────────────────────────────────
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("FHDAN TOURISM", margin, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Travel Voucher", margin, 26);
  doc.text("Info@fhdan.co.za  |  www.fhdantourism.co.za", margin, 32);

  // ── Voucher Badge ─────────────────────────────────────
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageW - margin - 54, 8, 54, 28, 3, 3, "F");
  doc.setTextColor(234, 88, 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("BOOKING REF", pageW - margin - 27, 16, { align: "center" });
  doc.setFontSize(10);
  doc.text(booking.booking_reference, pageW - margin - 27, 24, { align: "center" });

  // ── POPIA Notice ──────────────────────────────────────
  doc.setFillColor(255, 247, 237);
  doc.rect(0, 45, pageW, 8, "F");
  doc.setTextColor(120, 53, 15);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text(
    "POPIA NOTICE: This document contains personal information. It is strictly confidential and for the named recipient only.",
    margin,
    50
  );

  let y = 62;

  // ── Status Badge ─────────────────────────────────────
  const statusColors: Record<string, [number, number, number]> = {
    confirmed: [59, 130, 246],
    active: [34, 197, 94],
    completed: [16, 185, 129],
  };
  const statusColor = statusColors[booking.status] ?? [107, 114, 128];
  doc.setFillColor(...statusColor);
  doc.roundedRect(margin, y - 5, 36, 8, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(booking.status.toUpperCase(), margin + 18, y, { align: "center" });

  const typeLabel = BOOKING_TYPE_LABELS[booking.booking_type];
  doc.setFillColor(249, 115, 22);
  doc.roundedRect(margin + 40, y - 5, 44, 8, 2, 2, "F");
  doc.text(typeLabel.toUpperCase(), margin + 40 + 22, y, { align: "center" });
  y += 12;

  // ── Client & Vehicle Info ─────────────────────────────
  const client = booking.client;
  const vehicle = booking.vehicle;
  const driver = booking.driver;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["CLIENT INFORMATION", "VEHICLE INFORMATION"]],
    body: [
      [
        `Name: ${client?.full_name ?? "N/A"}\nEmail: ${client?.email ?? "N/A"}\nPhone: ${client?.phone ?? "N/A"}`,
        `${vehicle?.year} ${vehicle?.make} ${vehicle?.model}\nReg: ${vehicle?.registration ?? "N/A"}\nColour: ${vehicle?.color ?? "N/A"}`,
      ],
    ],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: "bold", fontSize: 8 },
    columnStyles: { 0: { cellWidth: (pageW - margin * 2) / 2 }, 1: { cellWidth: (pageW - margin * 2) / 2 } },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Trip Details ──────────────────────────────────────
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["TRIP DETAILS", ""]],
    body: [
      ["Pickup Date & Time", formatDateTime(booking.pickup_datetime)],
      ["Dropoff Date & Time", formatDateTime(booking.dropoff_datetime)],
      ["Duration", `${daysBetween(booking.pickup_datetime, booking.dropoff_datetime)} day(s)`],
      ["Pickup Location", booking.pickup_location],
      ["Dropoff Location", booking.dropoff_location],
      ["Driver", driver ? driver.full_name : "Self-Drive (Client)"],
      ["Special Requirements", booking.special_requirements ?? "None"],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [255, 247, 237] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 } },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Financial Summary ──────────────────────────────────
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["FINANCIAL SUMMARY", "AMOUNT (ZAR)"]],
    body: [
      ["Subtotal", formatZAR(booking.subtotal_zar)],
      ["Discount", `(${formatZAR(booking.discount_amount_zar)})`],
      ["VAT (15%)", formatZAR(booking.vat_amount_zar)],
      ["Deposit Paid", `${booking.deposit_paid ? "✓" : "Pending"} ${formatZAR(booking.deposit_amount_zar)}`],
      ["BALANCE DUE", formatZAR(booking.balance_due_zar)],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: "bold", fontSize: 8 },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    didParseCell: (data) => {
      if (data.row.index === 4) {
        data.cell.styles.fillColor = [254, 215, 170];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // ── Terms ─────────────────────────────────────────────
  doc.setTextColor(107, 114, 128);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const terms = [
    "1. Please present this voucher to your driver at pickup. 2. Late returns may incur additional charges.",
    "3. Cancellation policy: 48h notice required for full refund. 4. The company accepts no liability for loss of personal property.",
  ];
  terms.forEach((t) => {
    doc.text(t, margin, y, { maxWidth: pageW - margin * 2 });
    y += 5;
  });

  // ── Footer ────────────────────────────────────────────
  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.setFillColor(234, 88, 12);
  doc.rect(0, footerY - 4, pageW, 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(
    `Generated: ${formatDate(new Date().toISOString())} | Fhdan Tourism | POPIA Compliant | Ref: ${booking.booking_reference}`,
    pageW / 2,
    footerY + 4,
    { align: "center" }
  );

  return doc.output("arraybuffer") as unknown as Uint8Array;
}

export function voucherToBase64(booking: Booking): string {
  const bytes = generateVoucherPDF(booking);
  const binary = Array.from(new Uint8Array(bytes))
    .map((b) => String.fromCharCode(b))
    .join("");
  return btoa(binary);
}
