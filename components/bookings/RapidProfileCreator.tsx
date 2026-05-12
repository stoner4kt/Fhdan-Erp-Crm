// ============================================================
// RAPID PROFILE CREATOR — UPSERT logic: checks client by email/ID,
// creates profile if not found, links to booking in <10 seconds
// ============================================================
"use client";

import { useState } from "react";
import { Search, UserPlus, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import type { Client, ClientType, CurrencyCode, TaxZone, RapidProfileInput } from "@/types";
import { cn } from "@/lib/utils";

interface RapidProfileCreatorProps {
  onClientResolved: (client: Client) => void;
}

type Step = "search" | "found" | "create" | "done";

export function RapidProfileCreator({ onClientResolved }: RapidProfileCreatorProps) {
  const [step, setStep] = useState<Step>("search");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundClient, setFoundClient] = useState<Client | null>(null);

  // New client form fields
  const [form, setForm] = useState<RapidProfileInput>({
    email: "",
    full_name: "",
    phone: "",
    id_number: "",
    client_type: "individual",
    company_name: "",
    preferred_currency: "ZAR",
    tax_zone: "standard",
  });

  // ----------------------------
  // SEARCH (UPSERT check)
  // ----------------------------
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/clients/search?q=${encodeURIComponent(search.trim())}`
      );
      const data = await res.json();

      if (data.client) {
        setFoundClient(data.client);
        setStep("found");
      } else {
        // Pre-fill email if search looks like an email
        const isEmail = search.includes("@");
        setForm((prev) => ({
          ...prev,
          email: isEmail ? search.trim() : prev.email,
          id_number: !isEmail ? search.trim() : prev.id_number,
        }));
        setStep("create");
      }
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------
  // USE EXISTING CLIENT
  // ----------------------------
  function handleUseExisting() {
    if (foundClient) {
      onClientResolved(foundClient);
      setStep("done");
    }
  }

  // ----------------------------
  // CREATE NEW CLIENT
  // ----------------------------
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create client");

      onClientResolved(data.client);
      setStep("done");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------
  // RENDER
  // ----------------------------

  if (step === "done") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold text-sm">Client profile linked</p>
          <p className="text-xs text-green-600 mt-0.5">Proceed to select vehicle and dates below.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-base p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm">1</div>
        <div>
          <h3 className="font-semibold text-sm">Client — Rapid Profile Creator</h3>
          <p className="text-xs text-muted-foreground">Search by email or SA ID. Creates a profile if not found.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* STEP: Search */}
      {step === "search" && (
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Email address or SA ID / Passport number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading || !search.trim()}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </button>
        </form>
      )}

      {/* STEP: Found */}
      {step === "found" && foundClient && (
        <div className="space-y-3">
          <div className="rounded-xl border bg-green-50/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-green-700">Client found!</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{foundClient.full_name}</span></div>
              <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{foundClient.email}</span></div>
              <div><span className="text-muted-foreground">Type:</span> <span className="font-medium capitalize">{foundClient.client_type}</span></div>
              <div><span className="text-muted-foreground">Currency:</span> <span className="font-medium">{foundClient.preferred_currency}</span></div>
              {foundClient.company_name && (
                <div className="col-span-2"><span className="text-muted-foreground">Company:</span> <span className="font-medium">{foundClient.company_name}</span></div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleUseExisting}
              className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
            >
              Use this client
            </button>
            <button
              onClick={() => setStep("search")}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              Search again
            </button>
          </div>
        </div>
      )}

      {/* STEP: Create new */}
      {step === "create" && (
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <UserPlus className="h-4 w-4 shrink-0" />
            No existing client found. Fill in the details below to create a new profile.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium mb-1">Full Name *</label>
              <input required value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="John Smith" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium mb-1">Email Address *</label>
              <input required type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="client@email.com" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Phone</label>
              <input value={form.phone ?? ""} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="+27 82 000 0000" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">SA ID / Passport</label>
              <input value={form.id_number ?? ""} onChange={(e) => setForm((p) => ({ ...p, id_number: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="8001015009087 or passport" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Client Type *</label>
              <select required value={form.client_type} onChange={(e) => setForm((p) => ({ ...p, client_type: e.target.value as ClientType }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="individual">Individual</option>
                <option value="corporate">Corporate</option>
                <option value="government">Government</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Currency</label>
              <select value={form.preferred_currency} onChange={(e) => setForm((p) => ({ ...p, preferred_currency: e.target.value as CurrencyCode }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="ZAR">ZAR — South African Rand</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="AED">AED — UAE Dirham</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Tax Zone</label>
              <select value={form.tax_zone} onChange={(e) => setForm((p) => ({ ...p, tax_zone: e.target.value as TaxZone }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="standard">Standard (VAT 15%)</option>
                <option value="exempt">VAT Exempt</option>
                <option value="foreign">Foreign (Zero-rated)</option>
              </select>
            </div>
            {(form.client_type === "corporate" || form.client_type === "government") && (
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1">Company / Organisation Name *</label>
                <input required value={form.company_name ?? ""} onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Acme Corporation Pty Ltd" />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {loading ? "Creating..." : "Create Client & Continue"}
            </button>
            <button type="button" onClick={() => setStep("search")}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-muted transition-colors">
              Back
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
