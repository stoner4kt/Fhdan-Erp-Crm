"use server";

import { createClient } from "@/lib/supabase/server";

interface LoginResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
}

export async function loginAction(
  formData: FormData
): Promise<LoginResult> {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
  const password = (formData.get("password") as string | null) ?? "";

  if (!email || !password) {
    return {
      success: false,
      error: "Email and password are required",
    };
  }

  const supabase = createClient();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to sign in",
      };
    }

    // Some Supabase projects can return a user without an immediate session
    // (for example when additional verification is required).
    // Treat this as a successful sign-in request so the app can continue.
    if (!data.session && !data.user) {
      return {
        success: false,
        error: "Authentication succeeded but no user/session was returned.",
      };
    }
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }

  return {
    success: true,
    redirectTo: "/dashboard",
  };
}
