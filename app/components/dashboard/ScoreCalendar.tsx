"use client";

import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/app/components/ui/popover";
import { toNYDateString, getNYDateParts, formatSnapshotDate } from "./utils";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getStartDay(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

// TODO: Score display temporarily disabled for faster page load.
// Re-enable snapshotScores + isLoading props once scoring performance is optimized.
export function ScoreCalendar({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedNY = getNYDateParts(selectedDate);
  const [viewMonth, setViewMonth] = useState<Date>(
    new Date(selectedNY.year, selectedNY.month, 1)
  );

  const selectedStr = toNYDateString(selectedDate);
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const startDay = getStartDay(year, month);
  const monthLabel = viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const todayNY = getNYDateParts(new Date());
  const todayStr = toNYDateString(new Date());
  const minDate = "2023-01-01";
  const canGoPrev = !(year === 2023 && month === 0);
  const canGoNext = !(year === todayNY.year && month === todayNY.month);

  function prevMonth() {
    if (canGoPrev) setViewMonth(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    if (canGoNext) setViewMonth(new Date(year, month + 1, 1));
  }

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < startDay; i++) {
    cells.push(<div key={`empty-${i}`} className="h-11" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isSelected = dateStr === selectedStr;
    const isToday = dateStr === todayStr;
    const isDisabled = dateStr > todayStr || dateStr < minDate;

    cells.push(
      <button
        key={day}
        disabled={isDisabled}
        onClick={() => {
          if (!isDisabled) {
            onSelectDate(new Date(dateStr + "T12:00:00-05:00"));
            setOpen(false);
          }
        }}
        className={`
          h-11 w-11 rounded-lg flex flex-col items-center justify-center text-xs font-mono transition-all
          ${isSelected
            ? "bg-amber-600/30 border border-amber-500/50 ring-1 ring-amber-500/30"
            : isToday
              ? "border border-emerald-500/50 hover:bg-surface-overlay hover:border-emerald-400/60 cursor-pointer"
              : isDisabled
                ? "opacity-30 cursor-default border border-transparent"
                : "hover:bg-surface-overlay border border-transparent hover:border-border-subtle cursor-pointer"
          }
        `}
      >
        <span className={isSelected ? "text-[12px] text-amber-300 font-semibold" : isToday ? "text-emerald-400 font-semibold" : "text-text-secondary"}>
          {day}
        </span>
        {/* TODO: Re-enable score display once scoring performance is optimized.
        {hasData && (
          <span
            className="text-[8px] font-semibold tabular-nums leading-none"
            style={{ color: getScoreColor(score) }}
          >
            {score}
          </span>
        )} */}
      </button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-overlay font-mono gap-2 cursor-pointer"
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>{formatSnapshotDate(toNYDateString(selectedDate))} (NY)</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="bg-surface-raised border-border-subtle p-4 w-auto"
      >
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="sm" onClick={prevMonth} disabled={!canGoPrev} className="h-7 w-7 p-0 text-text-secondary hover:text-text-primary hover:bg-surface-overlay cursor-pointer disabled:opacity-30 disabled:cursor-default">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-sm font-semibold text-text-primary font-mono">{monthLabel}</h3>
          <Button variant="ghost" size="sm" onClick={nextMonth} disabled={!canGoNext} className="h-7 w-7 p-0 text-text-secondary hover:text-text-primary hover:bg-surface-overlay cursor-pointer disabled:opacity-30 disabled:cursor-default">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="h-11 w-11 flex items-center justify-center text-[10px] text-text-secondary font-mono">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells}
        </div>
        {/* TODO: Re-enable loading indicator once scoring is restored.
        {isLoading && (
          <div className="mt-3 pt-3 border-t border-border-subtle flex items-center gap-2 text-[10px] text-text-secondary font-mono">
            <Activity className="h-3 w-3 animate-pulse text-accent-blue" />
            <span>Loading available dates…</span>
          </div>
        )} */}
      </PopoverContent>
    </Popover>
  );
}
