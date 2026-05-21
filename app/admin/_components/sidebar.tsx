"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Database, LineChart, Activity, Gauge } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/database", label: "Database", icon: Database },
  { href: "/admin/fred", label: "FRED", icon: LineChart },
  { href: "/admin/indicators", label: "Indicators", icon: Activity },
  { href: "/admin/engine", label: "Engine", icon: Gauge },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-[#334155] bg-[#111827] min-h-[calc(100vh-3.5rem)]">
      <nav className="p-3 space-y-0.5">
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
              className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                isActive
                  ? "bg-[#1E293B] text-[#F8FAFC]"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]/50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
