import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = (body?.email as string | undefined)?.trim().toLowerCase() ?? "";
    const password = (body?.password as string | undefined) ?? "";

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password are required." }, { status: 400 });
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return NextResponse.json({ success: false, error: error.message || "Invalid credentials." }, { status: 401 });
    }

    if (!data.user) {
      return NextResponse.json({ success: false, error: "Sign in succeeded but no user returned." }, { status: 500 });
    }

    return NextResponse.json({ success: true, redirectTo: "/dashboard" });
  } catch (error) {
    console.error("Login route error", error);
    return NextResponse.json({ success: false, error: "Unexpected server error." }, { status: 500 });
  }
}
