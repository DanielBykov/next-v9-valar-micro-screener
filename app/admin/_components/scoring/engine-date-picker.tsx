"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/app/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";

type Props = {
  /** ISO date string YYYY-MM-DD currently selected. */
  value: string;
  /** Called with a new ISO date string YYYY-MM-DD. */
  onChange: (isoDate: string) => void;
  /** Disable controls while a fetch is in flight. */
  disabled?: boolean;
};

function isoToDate(iso: string): Date {
  // Anchor at UTC midnight so the displayed calendar day matches the ISO date.
  return new Date(`${iso}T00:00:00Z`);
}

function dateToIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function EngineDatePicker({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const selected = isoToDate(value);
  const today = new Date();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex items-center gap-1.5 bg-surface-overlay hover:bg-border-subtle border border-border-subtle text-text-primary text-[11px] font-mono px-2 py-1 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CalendarIcon className="h-3 w-3" />
          {value}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          disabled={{ after: today }}
          onSelect={(d) => {
            if (!d) return;
            onChange(dateToIso(d));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
