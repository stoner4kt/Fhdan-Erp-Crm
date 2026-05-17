"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface LoginResult {
  success: boolean;
  error?: string;
}

export async function loginAction(
  formData: FormData
): Promise<LoginResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

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

    if (!data.session) {
      return {
        success: false,
        error: "No session returned from authentication",
      };
    }
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }

  redirect("/dashboard");
}
