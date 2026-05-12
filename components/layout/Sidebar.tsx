// ============================================================
// SIDEBAR NAVIGATION — Role-aware, RBAC-filtered
// ============================================================
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Truck, CalendarCheck, Users, CircleDollarSign,
  UserCheck, ShieldCheck, Settings, Route, LogOut, ChevronRight, Truck as TruckIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getRoleLabel, getRoleColor, can, getVisibleNavItems } from "@/lib/rbac";
import type { UserProfile } from "@/types";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Truck, CalendarCheck, Users, CircleDollarSign,
  UserCheck, ShieldCheck, Settings, Route,
};

interface SidebarProps {
  user: UserProfile;
  onSignOut: () => void;
}

export function Sidebar({ user, onSignOut }: SidebarProps) {
  const pathname = usePathname();
  const navItems = getVisibleNavItems(user.role);

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 shadow-sm">
          <TruckIcon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight">Fhdan Tourism</p>
          <p className="truncate text-xs text-muted-foreground">Fleet Hub</p>
        </div>
      </div>

      {/* Live indicator */}
      <div className="px-4 py-2">
        <div className="live-indicator text-xs text-muted-foreground">
          System Online
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto custom-scroll px-2 py-2">
        {navItems.map((item) => {
          const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={cn(
                isActive ? "sidebar-link-active" : "sidebar-link",
                "group"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-brand-600" : "text-muted-foreground group-hover:text-brand-600")} />
              <span className="flex-1 truncate">{item.label}</span>
              {isActive && <ChevronRight className="h-3 w-3 text-brand-500" />}
            </Link>
          );
        })}
      </nav>

      {/* User profile footer */}
      <div className="border-t px-3 py-3">
        <div className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted transition-colors">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
            {user.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{user.full_name}</p>
            <p className={cn("inline-flex text-[10px] px-1.5 py-0.5 rounded-full font-medium", getRoleColor(user.role))}>
              {getRoleLabel(user.role)}
            </p>
          </div>
          <button
            onClick={onSignOut}
            title="Sign out"
            className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
