import { Activity, Settings } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import Link from "next/link";
import { ScoreCalendar } from "./ScoreCalendar";

export function Header({
  snapshotScores,
  selectedDate,
  onSelectDate,
}: {
  snapshotDate: string;
  snapshotScores: Map<string, number>;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  return (
    <header className="border-b border-[#334155] bg-[#111827]">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-semibold tracking-wide text-[#F8FAFC]">VALAR</span>
          <span className="text-xs text-[#94A3B8] font-mono">Macro Pulse Intelligence</span>
        </div>
        <div className="flex items-center gap-2">
          <ScoreCalendar
            snapshotScores={snapshotScores}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
          />
          <Link href="/mock-dashboard">
            <Button variant="ghost" size="sm" className="h-8 px-2 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] cursor-pointer">
              <Activity className="h-3.5 w-3.5" />
              <span className="text-xs ml-1.5">Mock Data</span>
            </Button>
          </Link>
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="h-8 px-2 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] cursor-pointer">
              <Settings className="h-3.5 w-3.5" />
              <span className="text-xs ml-1.5">Admin</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
