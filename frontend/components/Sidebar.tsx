"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, MessageSquare, Settings, Sun, Moon } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/collaborators", label: "Collaborators", icon: Users },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/admin", label: "Admin", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <aside className="w-64 min-h-screen flex flex-col border-r bg-[#1C2139] dark:bg-[#131720] border-white/5 text-white">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-teal-500 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">T</span>
          </div>
          <h1 className="text-base font-semibold tracking-tight bg-gradient-to-r from-violet-300 to-teal-300 bg-clip-text text-transparent">
            TalentRadar
          </h1>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/25 shadow-sm"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon
                className={cn("w-4 h-4 shrink-0", active ? "text-violet-400" : "")}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle */}
      <div className="px-3 py-4 border-t border-white/5">
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 transition-all duration-150"
        >
          {isDark ? (
            <Sun className="w-4 h-4 shrink-0" />
          ) : (
            <Moon className="w-4 h-4 shrink-0" />
          )}
          {mounted ? (isDark ? "Light mode" : "Dark mode") : "Toggle theme"}
        </button>
      </div>
    </aside>
  );
}
