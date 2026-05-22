"use client";

import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/app/components/ui/popover";
import { toNYDateString, getScoreColor, formatSnapshotDate } from "./utils";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getStartDay(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export function ScoreCalendar({
  snapshotScores,
  selectedDate,
  onSelectDate,
}: {
  snapshotScores: Map<string, number>;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  const selectedStr = toNYDateString(selectedDate);
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const startDay = getStartDay(year, month);
  const monthLabel = viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  function prevMonth() {
    setViewMonth(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setViewMonth(new Date(year, month + 1, 1));
  }

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < startDay; i++) {
    cells.push(<div key={`empty-${i}`} className="h-11" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const score = snapshotScores.get(dateStr);
    const hasData = score !== undefined;
    const isSelected = dateStr === selectedStr;

    cells.push(
      <button
        key={day}
        onClick={() => {
          if (hasData) {
            onSelectDate(new Date(dateStr + "T12:00:00-05:00"));
            setOpen(false);
          }
        }}
        disabled={!hasData}
        className={`
          h-11 w-11 rounded-lg flex flex-col items-center justify-center text-xs font-mono transition-all
          ${isSelected
            ? "bg-amber-600/30 border border-amber-500/50 ring-1 ring-amber-500/30"
            : hasData
              ? "hover:bg-[#1E293B] border border-transparent hover:border-[#334155] cursor-pointer"
              : "opacity-30 cursor-default border border-transparent"
          }
        `}
      >
        <span className={isSelected ? "text-[12px] text-amber-300 font-semibold" : "text-[#94A3B8]"}>
          {day}
        </span>
        {hasData && (
          <span
            className="text-[8px] font-semibold tabular-nums leading-none"
            style={{ color: getScoreColor(score) }}
          >
            {score}
          </span>
        )}
      </button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto px-3 py-1.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] font-mono gap-2 cursor-pointer"
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>{formatSnapshotDate(toNYDateString(selectedDate))} (NY)</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="bg-[#111827] border-[#334155] p-4 w-auto"
      >
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="sm" onClick={prevMonth} className="h-7 w-7 p-0 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] cursor-pointer">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-sm font-semibold text-[#F8FAFC] font-mono">{monthLabel}</h3>
          <Button variant="ghost" size="sm" onClick={nextMonth} className="h-7 w-7 p-0 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] cursor-pointer">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="h-11 w-11 flex items-center justify-center text-[10px] text-[#94A3B8] font-mono">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells}
        </div>
      </PopoverContent>
    </Popover>
  );
}
