"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, LogIn, Truck } from "lucide-react";

import type { LoginVariant } from "@/app/auth/login/login-variants";

type RoleLoginPageProps = {
  current: LoginVariant;
  variants: LoginVariant[];
};

export function RoleLoginPage({ current, variants }: RoleLoginPageProps) {
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
      const password = (formData.get("password") as string | null) ?? "";

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = (await response.json().catch(() => null)) as { success?: boolean; error?: string; redirectTo?: string } | null;

      if (!response.ok || !result?.success) {
        setError(result?.error || "Login failed");
        return;
      }

      window.location.assign(result.redirectTo || "/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 flex-col justify-between p-12 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white mt-4">Fhdan Tourism</h1>
          <p className="text-brand-100 mt-1">Enterprise Fleet & Travel Hub</p>
        </div>
        <p className="relative z-10 text-brand-200 text-xs">© 2026 Fhdan Tourism · Powered by Conextsol</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold">{current.label} Login</h2>
            <p className="text-muted-foreground mt-1">{current.description}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-3 text-sm">{error}</div>}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">Email address</label>
              <input id="email" name="email" type="email" required disabled={loading} className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm" />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <div className="relative">
                <input id="password" name="password" type={showPass ? "text" : "password"} required disabled={loading} className="w-full rounded-lg border bg-background px-3 py-2.5 pr-10 text-sm" />
                <button type="button" onClick={() => setShowPass(!showPass)} disabled={loading} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white">
              {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <LogIn className="h-4 w-4" />}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-4 flex justify-between text-sm">
            <Link href="/auth/forgot-password" className="text-brand-600 hover:underline">Forgot password?</Link>
            <Link href="/auth/login" className="text-brand-600 hover:underline">All login pages</Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2">
            {variants.filter((v) => v.slug !== current.slug).map((v) => (
              <Link key={v.slug} href={`/auth/login/${v.slug}`} className="text-xs rounded-md border px-2 py-1.5 hover:bg-muted text-center">
                {v.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
