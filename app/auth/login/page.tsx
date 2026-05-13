// ============================================================
// LOGIN PAGE
// ============================================================
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, LogIn, Truck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-16 left-16 w-64 h-64 border border-white rounded-full" />
          <div className="absolute top-24 left-24 w-48 h-48 border border-white rounded-full" />
          <div className="absolute bottom-32 right-16 w-80 h-80 border border-white rounded-full" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 p-3 rounded-xl">
              <Truck className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mt-4">Fhdan Tourism</h1>
          <p className="text-brand-100 mt-1">Enterprise Fleet & Travel Hub</p>
        </div>

        <div className="relative z-10">
          <blockquote className="text-white/90 text-xl font-medium leading-relaxed">
            "Precision operations for every journey — from quote to destination."
          </blockquote>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { label: "Vehicles", value: "30" },
              { label: "Bookings/mo", value: "500+" },
              { label: "Uptime", value: "99.9%" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/15 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-brand-100 text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-brand-200 text-xs">
          © 2026 Fhdan Tourism · POPIA Compliant · Powered by Conextsol
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="bg-brand-500 p-2 rounded-lg">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-lg">Fhdan Fleet Hub</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold">Welcome back</h2>
            <p className="text-muted-foreground mt-1">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
                placeholder="you@fhdantourism.co.za"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2.5 pr-10 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Access is restricted to authorised Fhdan Tourism staff only.
            <br />
            Contact your System Administrator if you need access.
          </p>
        </div>
      </div>
    </div>
  );
}
