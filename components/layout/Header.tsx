// ============================================================
// TOP HEADER — Breadcrumb, notifications, user info
// ============================================================
"use client";

import { Bell, Menu, LogOut } from "lucide-react";
import { getRoleLabel, getRoleColor } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types";

interface HeaderProps {
  user: UserProfile;
  title?: string;
  subtitle?: string;
  onSignOut: () => void;
}

export function Header({ user, title, subtitle, onSignOut }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-card px-4 shadow-sm">
      {/* Mobile menu (placeholder — wire up drawer if needed) */}
      <button className="md:hidden text-muted-foreground hover:text-foreground">
        <Menu className="h-5 w-5" />
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        {title && (
          <h1 className="text-base font-semibold truncate leading-tight">{title}</h1>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Notification bell placeholder */}
        <button className="relative rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-brand-500 ring-1 ring-card" />
        </button>

        {/* Role badge */}
        <span className={cn("badge text-[10px] hidden sm:inline-flex", getRoleColor(user.role))}>
          {getRoleLabel(user.role)}
        </span>

        {/* Mobile sign out */}
        <button
          onClick={onSignOut}
          className="md:hidden rounded-full p-1.5 text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
