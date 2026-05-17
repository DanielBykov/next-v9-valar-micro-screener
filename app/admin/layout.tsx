import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Sidebar } from "./_components/sidebar";
import { LogoutButton } from "./_components/logout-button";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC] font-sans">
      <header className="border-b border-[#334155] bg-[#111827]">
        <div className="px-6 h-14 flex items-center gap-4">
          <Link href="/" className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-sm font-semibold tracking-wide">VALAR</span>
          <span className="text-xs text-[#94A3B8] font-mono">Admin</span>
          <LogoutButton />
        </div>
      </header>

      <div className="flex">
        <Sidebar />
        <main className="flex-1 px-6 py-10">
          <div className="max-w-4xl mx-auto space-y-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
