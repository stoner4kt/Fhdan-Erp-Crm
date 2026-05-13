// Root redirect — authenticated users go to dashboard, others to login
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      redirect("/dashboard");
    }
  } catch {
    // If Supabase env is not configured yet, default to login route.
  }

  redirect("/auth/login");
}
