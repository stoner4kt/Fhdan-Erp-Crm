"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/login` : undefined,
    });

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("If an account exists for this email, a reset link has been sent.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg border p-6 space-y-4">
        <h1 className="text-xl font-bold">Forgot password</h1>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="you@company.com" />
        <button type="submit" className="w-full rounded bg-brand-500 text-white py-2">Send reset link</button>
        {message && <p className="text-sm text-green-700">{message}</p>}
        {error && <p className="text-sm text-red-700">{error}</p>}
        <Link href="/auth/login" className="text-sm text-brand-600 hover:underline">Back to login pages</Link>
      </form>
    </div>
  );
}
