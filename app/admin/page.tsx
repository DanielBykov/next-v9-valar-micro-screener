"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DatabaseSection } from "./database-section";
import { FredSection } from "./fred-section";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC] font-sans">
      <header className="border-b border-[#334155] bg-[#111827]">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/" className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-sm font-semibold tracking-wide">VALAR</span>
          <span className="text-xs text-[#94A3B8] font-mono">Admin</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <DatabaseSection />
        <FredSection />
      </main>
    </div>
  );
}
