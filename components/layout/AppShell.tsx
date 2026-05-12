// ============================================================
// APP SHELL — Wraps all authenticated pages
// Provides sidebar + top header + content area
// ============================================================
"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import type { UserProfile } from "@/types";

interface AppShellProps {
  user: UserProfile;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function AppShell({ user, children, title, subtitle }: AppShellProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="hidden md:flex md:shrink-0">
        <Sidebar user={user} onSignOut={handleSignOut} />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} title={title} subtitle={subtitle} onSignOut={handleSignOut} />
        <main className="flex-1 overflow-y-auto custom-scroll bg-muted/30">
          {children}
        </main>
      </div>
    </div>
  );
}
