import { Activity, Settings } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import Link from "next/link";
import { ScoreCalendar } from "./ScoreCalendar";

export function Header({
  selectedDate,
  onSelectDate,
}: {
  snapshotDate: string;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  return (
    <header className="border-b border-border-subtle bg-surface-raised">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-semibold tracking-wide text-text-primary">VALAR</span>
          <span className="text-xs text-text-secondary font-mono">Macro Pulse Intelligence</span>
        </div>
        <div className="flex items-center gap-2">
          <ScoreCalendar
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
          />
          {/*<Link href="/mock-dashboard">*/}
          {/*  <Button variant="ghost" size="sm" className="h-8 px-2 text-text-secondary hover:text-text-primary hover:bg-surface-overlay cursor-pointer">*/}
          {/*    <Activity className="h-3.5 w-3.5" />*/}
          {/*    <span className="text-xs ml-1.5">Mock Data</span>*/}
          {/*  </Button>*/}
          {/*</Link>*/}
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="h-8 px-2 text-text-secondary hover:text-text-primary hover:bg-surface-overlay cursor-pointer">
              <Settings className="h-3.5 w-3.5" />
              <span className="text-xs ml-1.5">Admin</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
