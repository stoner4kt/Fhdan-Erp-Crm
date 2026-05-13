// ============================================================
// SUPABASE SERVER CLIENT
// Use in Server Components, Server Actions, and Route Handlers
// ============================================================
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";
import { getServiceRoleKey, getSupabaseEnv } from "@/lib/supabase/env";

export function createClient() {
  const cookieStore = cookies();

  const supabaseEnv = getSupabaseEnv();

  if (!supabaseEnv) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createServerClient<Database>(
    supabaseEnv.url,
    supabaseEnv.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component — cookies can only be set in middleware or route handlers
          }
        },
      },
    }
  );
}

// Service role client — bypasses RLS (use ONLY in trusted server contexts)
export function createServiceClient() {
  const supabaseEnv = getSupabaseEnv();
  const serviceRoleKey = getServiceRoleKey();

  if (!supabaseEnv || !serviceRoleKey) {
    throw new Error("Missing Supabase server environment variables.");
  }

  return createServerClient<Database>(
    supabaseEnv.url,
    serviceRoleKey,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );
}
