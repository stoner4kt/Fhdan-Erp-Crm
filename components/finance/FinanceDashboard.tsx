// ============================================================
// FINANCE DASHBOARD COMPONENT
// ============================================================
"use client";

import { useState } from "react";
import {
  CircleDollarSign, TrendingUp, AlertCircle, CheckCircle2,
  FileText, CreditCard, Download, Plus,
} from "lucide-react";
import { cn, formatZAR, formatDate, capitalize } from "@/lib/utils";

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
  void: "bg-gray-100 text-gray-500",
};

interface FinanceDashboardProps {
  invoices: any[];
  recentPayments: any[];
  overdueInvoices: any[];
  monthlyRevenue: number;
  monthlyVAT: number;
  depositsCollected: number;
  canManage: boolean;
}

export function FinanceDashboard({
  invoices,
  recentPayments,
  overdueInvoices,
  monthlyRevenue,
  monthlyVAT,
  depositsCollected,
  canManage,
}: FinanceDashboardProps) {
  const [activeTab, setActiveTab] = useState<"invoices" | "payments" | "overdue">("invoices");

  const totalOutstanding = invoices
    .filter((i) => ["sent", "overdue"].includes(i.status))
    .reduce((s, i) => s + i.balance_due_zar, 0);

  return (
    <div className="page-container space-y-6">
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FinanceStat
          label="Monthly Revenue"
          value={formatZAR(monthlyRevenue)}
          icon={<TrendingUp className="h-4 w-4" />}
          color="text-green-600 bg-green-50"
        />
        <FinanceStat
          label="VAT Collected"
          value={formatZAR(monthlyVAT)}
          icon={<CircleDollarSign className="h-4 w-4" />}
          color="text-blue-600 bg-blue-50"
        />
        <FinanceStat
          label="Deposits Collected"
          value={formatZAR(depositsCollected)}
          icon={<CreditCard className="h-4 w-4" />}
          color="text-purple-600 bg-purple-50"
        />
        <FinanceStat
          label="Outstanding Invoices"
          value={formatZAR(totalOutstanding)}
          icon={<AlertCircle className="h-4 w-4" />}
          color="text-orange-600 bg-orange-50"
          alert={totalOutstanding > 0}
        />
      </div>

      {/* Overdue alert */}
      {overdueInvoices.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <h3 className="font-semibold text-sm text-red-800">
              {overdueInvoices.length} Overdue Invoice{overdueInvoices.length > 1 ? "s" : ""}
            </h3>
          </div>
          <div className="space-y-2">
            {overdueInvoices.slice(0, 3).map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-mono text-xs font-bold">{inv.invoice_number}</span>
                  <span className="text-red-700 text-xs ml-2">{inv.client?.full_name}</span>
                </div>
                <span className="font-bold text-red-700">{formatZAR(inv.balance_due_zar)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="card-base overflow-hidden">
        <div className="flex border-b">
          {([
            { key: "invoices", label: "Invoices", count: invoices.length },
            { key: "payments", label: "Recent Payments", count: recentPayments.length },
            { key: "overdue", label: "Overdue", count: overdueInvoices.length },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.key
                  ? "border-brand-500 text-brand-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={cn(
                  "badge text-[10px]",
                  activeTab === tab.key ? "bg-brand-100 text-brand-700" : "bg-muted text-muted-foreground"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
          {canManage && (
            <div className="ml-auto flex items-center pr-4">
              <button className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 transition-colors">
                <Plus className="h-3.5 w-3.5" /> New Invoice
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          {activeTab === "invoices" && (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  {["Invoice #", "Client", "Booking", "Due Date", "Total", "Paid", "Balance", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-brand-600">{inv.invoice_number}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium truncate max-w-[120px]">{inv.client?.full_name}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{inv.booking?.booking_reference ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">{formatDate(inv.due_date)}</td>
                    <td className="px-4 py-3 text-xs font-semibold">{formatZAR(inv.total_zar)}</td>
                    <td className="px-4 py-3 text-xs text-green-700">{formatZAR(inv.amount_paid_zar)}</td>
                    <td className="px-4 py-3 text-xs font-bold">{formatZAR(inv.balance_due_zar)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("badge text-[10px]", INVOICE_STATUS_COLORS[inv.status])}>
                        {capitalize(inv.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-xs text-brand-600 hover:underline flex items-center gap-0.5">
                        <Download className="h-3 w-3" /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "payments" && (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  {["Invoice", "Client", "Amount", "Method", "Date"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentPayments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{p.invoice?.invoice_number}</td>
                    <td className="px-4 py-3 text-xs">{p.invoice?.client?.full_name}</td>
                    <td className="px-4 py-3 text-xs font-bold text-green-700">{formatZAR(p.amount_zar)}</td>
                    <td className="px-4 py-3 text-xs capitalize">{p.method?.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "overdue" && (
            overdueInvoices.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-muted-foreground text-sm">All invoices are up to date.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    {["Invoice", "Client", "Balance Due", "Due Date", "Action"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {overdueInvoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors bg-red-50/30">
                      <td className="px-4 py-3 font-mono text-xs font-bold">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-xs">{inv.client?.full_name}</td>
                      <td className="px-4 py-3 text-xs font-bold text-red-700">{formatZAR(inv.balance_due_zar)}</td>
                      <td className="px-4 py-3 text-xs text-red-600">{formatDate(inv.due_date)}</td>
                      <td className="px-4 py-3">
                        <button className="text-xs bg-brand-50 text-brand-700 hover:bg-brand-100 px-2 py-1 rounded-md transition-colors">
                          Send Reminder
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function FinanceStat({
  label, value, icon, color, alert,
}: {
  label: string; value: string; icon: React.ReactNode; color: string; alert?: boolean;
}) {
  return (
    <div className={cn("stat-card", alert && "border-orange-200")}>
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", color)}>
        {icon}
      </div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
