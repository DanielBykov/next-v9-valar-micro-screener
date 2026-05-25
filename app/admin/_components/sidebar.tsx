"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Database, LineChart, Activity, Gauge, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/database", label: "Database", icon: Database },
  { href: "/admin/data-fetch", label: "Data Fetch", icon: LineChart },
  { href: "/admin/indicators", label: "Indicators", icon: Activity },
  { href: "/admin/engine", label: "Engine", icon: Gauge },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${collapsed ? "w-12" : "w-56"} shrink-0 border-r border-[#334155] bg-[#111827] min-h-[calc(100vh-3.5rem)] transition-[width] duration-200`}
    >
      <nav className="p-2 space-y-0.5">
        {NAV.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-2.5 px-2 py-2 text-xs font-medium rounded-md transition-colors ${
                isActive
                  ? "bg-[#1E293B] text-[#F8FAFC]"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]/50"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 pt-1 border-t border-[#334155]/50">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="w-full flex items-center justify-center px-2 py-2 text-[#475569] hover:text-[#94A3B8] rounded-md hover:bg-[#1E293B]/50 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </button>
      </div>
    </aside>
  );
}
