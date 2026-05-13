// ============================================================
// ROOT LAYOUT — Next.js App Router
// ============================================================
import type { Metadata } from "next";
import "@/styles/globals.css";


export const metadata: Metadata = {
  title: {
    template: "%s | Fhdan Fleet Hub",
    default: "Fhdan Fleet Hub — Enterprise Travel & Fleet Operations",
  },
  description:
    "POPIA-compliant fleet management and CRM platform for Fhdan Tourism. Manage 30 vehicles, 500+ bookings/month.",
  keywords: ["fleet management", "tourism", "CRM", "POPIA", "South Africa"],
  robots: { index: false, follow: false }, // Private internal app
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
