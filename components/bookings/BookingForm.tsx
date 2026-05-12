// ============================================================
// BOOKING FORM — Multi-step form with Rapid Profile Creator,
// Dual-Mode Availability Engine, and financial calculations
// ============================================================
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RapidProfileCreator } from "./RapidProfileCreator";
import {
  CalendarCheck, Truck, CircleDollarSign, FileText,
  ChevronRight, ChevronLeft, AlertCircle, Loader2, CheckCircle2,
} from "lucide-react";
import { cn, generateBookingReference, calcTotal, formatZAR, VAT_RATE, daysBetween } from "@/lib/utils";
import type { Client, CurrencyCode, BookingType, ExtraService } from "@/types";

interface BookingFormProps {
  vehicles: any[];
  drivers: any[];
  createdBy: string;
}

const STEPS = [
  { id: 1, label: "Client",    icon: "👤" },
  { id: 2, label: "Vehicle",   icon: "🚗" },
  { id: 3, label: "Financials",icon: "💰" },
  { id: 4, label: "Review",    icon: "📋" },
];

export function BookingForm({ vehicles, drivers, createdBy }: BookingFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  // Step 1 — Client
  const [client, setClient] = useState<Client | null>(null);

  // Step 2 — Vehicle & Dates
  const [vehicleId, setVehicleId] = useState("");
  const [bookingType, setBookingType] = useState<BookingType>("chauffeur");
  const [pickupDatetime, setPickupDatetime] = useState("");
  const [dropoffDatetime, setDropoffDatetime] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [driverId, setDriverId] = useState("");
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Step 3 — Financials
  const [currency, setCurrency] = useState<CurrencyCode>("ZAR");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState(30);
  const [extraServices, setExtraServices] = useState<ExtraService[]>([]);
  const [specialRequirements, setSpecialRequirements] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  // Calculated totals
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const numDays = pickupDatetime && dropoffDatetime ? daysBetween(pickupDatetime, dropoffDatetime) : 0;
  const vehicleRate = selectedVehicle
    ? bookingType === "chauffeur"
      ? selectedVehicle.chauffeur_rate_zar
      : selectedVehicle.daily_rate_zar
    : 0;
  const extrasSubtotal = extraServices.reduce((sum, e) => sum + e.quantity * e.unit_price_zar, 0);
  const vehicleSubtotal = vehicleRate * numDays;
  const subtotal = vehicleSubtotal + extrasSubtotal;
  const totals = calcTotal(subtotal, discountAmount);

  // Set default deposit (30% of total)
  useEffect(() => {
    if (totals.total > 0 && depositAmount === 0) {
      setDepositAmount(Math.round(totals.total * 0.3));
    }
  }, [totals.total]);

  // Pre-fill client currency
  useEffect(() => {
    if (client?.preferred_currency) setCurrency(client.preferred_currency);
  }, [client]);

  // ----------------------------
  // AVAILABILITY CHECK (Dual-Mode Engine)
  // ----------------------------
  const checkAvailability = useCallback(async () => {
    if (!vehicleId || !pickupDatetime || !dropoffDatetime) return;
    setCheckingAvailability(true);
    setAvailabilityError(null);

    try {
      const res = await fetch("/api/vehicles/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_id: vehicleId,
          pickup_datetime: pickupDatetime,
          dropoff_datetime: dropoffDatetime,
          booking_type: bookingType,
        }),
      });
      const data = await res.json();
      if (!data.available) {
        setAvailabilityError(
          `This vehicle is not available for ${bookingType === "chauffeur" ? "Chauffeur-Driven" : "Self-Drive"} ` +
          `from ${pickupDatetime} to ${dropoffDatetime}. ${data.conflict_ref ? `Conflicting booking: ${data.conflict_ref}` : ""}`
        );
      }
    } catch {
      setAvailabilityError("Could not check availability. Please verify manually.");
    } finally {
      setCheckingAvailability(false);
    }
  }, [vehicleId, pickupDatetime, dropoffDatetime, bookingType]);

  useEffect(() => {
    if (vehicleId && pickupDatetime && dropoffDatetime) {
      checkAvailability();
    }
  }, [vehicleId, pickupDatetime, dropoffDatetime, bookingType, checkAvailability]);

  // ----------------------------
  // SUBMIT
  // ----------------------------
  async function handleSubmit() {
    if (!client || !vehicleId) return;
    setLoading(true);
    setError(null);

    try {
      const payload = {
        booking_reference: generateBookingReference(),
        client_id: client.id,
        vehicle_id: vehicleId,
        driver_id: driverId || null,
        booking_type: bookingType,
        status: "pending_deposit",
        pickup_datetime: pickupDatetime,
        dropoff_datetime: dropoffDatetime,
        pickup_location: pickupLocation,
        dropoff_location: dropoffLocation,
        currency,
        exchange_rate_locked: 1,
        subtotal_zar: subtotal,
        discount_amount_zar: discountAmount,
        vat_amount_zar: totals.vat,
        total_zar: totals.total,
        deposit_amount_zar: depositAmount,
        deposit_paid: false,
        balance_due_zar: totals.total - depositAmount,
        payment_terms_days: paymentTerms,
        extra_services: extraServices,
        special_requirements: specialRequirements,
        internal_notes: internalNotes,
        arrival_alert_sent: false,
        created_by: createdBy,
      };

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create booking");

      router.push(`/bookings/${data.booking.id}?created=1`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------
  // RENDER
  // ----------------------------
  return (
    <div className="page-container max-w-3xl mx-auto space-y-6">
      {/* Step indicators */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors",
                step > s.id ? "bg-green-500 text-white"
                  : step === s.id ? "bg-brand-500 text-white shadow-md"
                  : "bg-muted text-muted-foreground"
              )}>
                {step > s.id ? <CheckCircle2 className="h-4 w-4" /> : s.id}
              </div>
              <span className={cn("text-[10px] mt-1 font-medium hidden sm:block", step === s.id ? "text-brand-600" : "text-muted-foreground")}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("flex-1 h-0.5 mx-2 transition-colors", step > s.id ? "bg-green-400" : "bg-muted")} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="space-y-4">
        {/* STEP 1 — Client */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            {client ? (
              <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">{client.full_name}</p>
                  <p className="text-xs text-muted-foreground">{client.email} · {client.client_type}</p>
                </div>
                <button onClick={() => setClient(null)} className="text-xs text-muted-foreground hover:text-foreground">
                  Change
                </button>
              </div>
            ) : (
              <RapidProfileCreator onClientResolved={setClient} />
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!client}
                className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Next: Vehicle & Dates <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — Vehicle & Dates */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="card-base p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm">2</div>
                <h3 className="font-semibold text-sm">Vehicle & Trip Details</h3>
              </div>

              {/* Booking type toggle */}
              <div>
                <label className="block text-xs font-medium mb-2">Drive Mode *</label>
                <div className="flex rounded-xl border overflow-hidden">
                  {(["chauffeur", "self_drive"] as BookingType[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setBookingType(mode)}
                      className={cn(
                        "flex-1 py-2.5 text-sm font-medium transition-colors",
                        bookingType === mode ? "bg-brand-500 text-white" : "hover:bg-muted text-muted-foreground"
                      )}
                    >
                      {mode === "chauffeur" ? "🚗 Chauffeur-Driven" : "🔑 Self-Drive"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vehicle selector */}
              <div>
                <label className="block text-xs font-medium mb-2">Vehicle *</label>
                <div className="grid gap-2 max-h-64 overflow-y-auto custom-scroll">
                  {vehicles
                    .filter((v) =>
                      bookingType === "chauffeur"
                        ? v.drive_modes === "chauffeur" || v.drive_modes === "both"
                        : v.drive_modes === "self_drive" || v.drive_modes === "both"
                    )
                    .map((v) => (
                      <label
                        key={v.id}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                          vehicleId === v.id ? "border-brand-500 bg-brand-50" : "hover:border-brand-300"
                        )}
                      >
                        <input type="radio" name="vehicle" value={v.id}
                          checked={vehicleId === v.id}
                          onChange={() => setVehicleId(v.id)}
                          className="text-brand-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{v.registration} — {v.year} {v.make} {v.model}</p>
                          <p className="text-xs text-muted-foreground">{v.seating_capacity} seats · {v.category}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-brand-600">
                            {formatZAR(bookingType === "chauffeur" ? v.chauffeur_rate_zar : v.daily_rate_zar)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">/day</p>
                        </div>
                      </label>
                    ))}
                </div>
              </div>

              {/* Availability error */}
              {availabilityError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{availabilityError}</span>
                </div>
              )}
              {checkingAvailability && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Checking availability...
                </div>
              )}

              {/* Date & time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Pickup Date & Time *</label>
                  <input type="datetime-local" value={pickupDatetime}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setPickupDatetime(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Dropoff Date & Time *</label>
                  <input type="datetime-local" value={dropoffDatetime}
                    min={pickupDatetime || new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setDropoffDatetime(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Pickup Location *</label>
                  <input type="text" value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Cape Town International Airport" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Dropoff Location *</label>
                  <input type="text" value={dropoffLocation} onChange={(e) => setDropoffLocation(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="V&A Waterfront Hotel" />
                </div>
              </div>

              {/* Driver (chauffeur mode only) */}
              {bookingType === "chauffeur" && (
                <div>
                  <label className="block text-xs font-medium mb-1">Assign Driver</label>
                  <select value={driverId} onChange={(e) => setDriverId(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">— Assign later —</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>{d.full_name} · {d.license_code}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Duration summary */}
            {numDays > 0 && selectedVehicle && (
              <div className="rounded-xl bg-brand-50 border border-brand-100 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{numDays} day(s) × {formatZAR(vehicleRate)}/day</span>
                  <span className="font-semibold">{formatZAR(vehicleSubtotal)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!vehicleId || !pickupDatetime || !dropoffDatetime || !pickupLocation || !dropoffLocation || !!availabilityError}
                className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Next: Financials <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — Financials */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="card-base p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm">3</div>
                <h3 className="font-semibold text-sm">Pricing & Payment Terms</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Currency</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="ZAR">ZAR — South African Rand</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — British Pound</option>
                    <option value="AED">AED — UAE Dirham</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Payment Terms (days)</label>
                  <select value={paymentTerms} onChange={(e) => setPaymentTerms(parseInt(e.target.value))}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value={0}>Due immediately</option>
                    <option value={7}>Net 7</option>
                    <option value={30}>Net 30</option>
                    <option value={60}>Net 60</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Discount (ZAR)</label>
                  <input type="number" min={0} step={0.01} value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Deposit Required (ZAR)</label>
                  <input type="number" min={0} step={0.01} value={depositAmount}
                    onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>

              {/* Extra services */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium">Extra Services</label>
                  <button type="button" onClick={() => setExtraServices((p) => [...p, { name: "", quantity: 1, unit_price_zar: 0 }])}
                    className="text-xs text-brand-600 hover:underline">+ Add item</button>
                </div>
                {extraServices.map((svc, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input type="text" placeholder="Description" value={svc.name}
                      onChange={(e) => { const n = [...extraServices]; n[i].name = e.target.value; setExtraServices(n); }}
                      className="flex-1 rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
                    <input type="number" placeholder="Qty" value={svc.quantity}
                      onChange={(e) => { const n = [...extraServices]; n[i].quantity = parseInt(e.target.value) || 1; setExtraServices(n); }}
                      className="w-16 rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
                    <input type="number" placeholder="Unit price" value={svc.unit_price_zar}
                      onChange={(e) => { const n = [...extraServices]; n[i].unit_price_zar = parseFloat(e.target.value) || 0; setExtraServices(n); }}
                      className="w-28 rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
                    <button type="button" onClick={() => setExtraServices((p) => p.filter((_, j) => j !== i))}
                      className="text-xs text-red-500 hover:text-red-700 px-1">×</button>
                  </div>
                ))}
              </div>

              {/* Total breakdown */}
              <div className="rounded-xl bg-muted/50 border p-4 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Vehicle ({numDays} days)</span><span>{formatZAR(vehicleSubtotal)}</span></div>
                {extrasSubtotal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Extras</span><span>{formatZAR(extrasSubtotal)}</span></div>}
                {discountAmount > 0 && <div className="flex justify-between text-red-600"><span>Discount</span><span>({formatZAR(discountAmount)})</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">VAT (15%)</span><span>{formatZAR(totals.vat)}</span></div>
                <div className="flex justify-between border-t pt-1.5 font-bold text-base"><span>TOTAL</span><span className="text-brand-600">{formatZAR(totals.total)}</span></div>
                <div className="flex justify-between text-muted-foreground text-xs"><span>Deposit Required</span><span>{formatZAR(depositAmount)}</span></div>
                <div className="flex justify-between text-muted-foreground text-xs"><span>Balance Due</span><span>{formatZAR(totals.total - depositAmount)}</span></div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Special Requirements</label>
                <textarea value={specialRequirements} onChange={(e) => setSpecialRequirements(e.target.value)} rows={2}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  placeholder="Baby seat, wheelchair accessibility, preferred music, etc." />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Internal Notes (not shown to client)</label>
                <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  placeholder="Operational notes, special instructions for driver..." />
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors shadow-sm"
              >
                Review Booking <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 — Review & Confirm */}
        {step === 4 && (
          <div className="space-y-4 animate-fade-in">
            <div className="card-base p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm">4</div>
                <h3 className="font-semibold text-sm">Review & Confirm</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client</p>
                  <p className="font-medium">{client?.full_name}</p>
                  <p className="text-muted-foreground">{client?.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vehicle</p>
                  <p className="font-medium">{selectedVehicle?.registration} — {selectedVehicle?.make} {selectedVehicle?.model}</p>
                  <p className="text-muted-foreground capitalize">{bookingType.replace("_", " ")}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pickup</p>
                  <p className="font-medium">{pickupDatetime?.replace("T", " ")}</p>
                  <p className="text-muted-foreground">{pickupLocation}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dropoff</p>
                  <p className="font-medium">{dropoffDatetime?.replace("T", " ")}</p>
                  <p className="text-muted-foreground">{dropoffLocation}</p>
                </div>
                <div className="col-span-2 space-y-1 border-t pt-3">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-bold text-brand-600">{formatZAR(totals.total)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Deposit</span><span className="font-medium">{formatZAR(depositAmount)}</span></div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(3)} className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors shadow-sm"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {loading ? "Creating Booking..." : "Confirm Booking"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
