import { Calendar } from "lucide-react";
import { toNYDateString, getScoreColor } from "./utils";

function ThreeMonthCalendar({
  snapshotScores,
  selectedDate,
  onSelectDate,
}: {
  snapshotScores: Map<string, number>;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const centerDate = new Date(selectedDate);
  const months: Date[] = [];
  for (let offset = -1; offset <= 1; offset++) {
    const d = new Date(centerDate.getFullYear(), centerDate.getMonth() + offset, 1);
    months.push(d);
  }

  const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  function getStartDay(year: number, month: number): number {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  }

  const selectedStr = toNYDateString(selectedDate);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {months.map((monthDate) => {
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const startDay = getStartDay(year, month);
        const monthLabel = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

        const cells: React.ReactNode[] = [];
        for (let i = 0; i < startDay; i++) {
          cells.push(<div key={`empty-${i}`} className="h-10" />);
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
                if (hasData) onSelectDate(new Date(dateStr + "T12:00:00-05:00"));
              }}
              disabled={!hasData}
              className={`
                h-10 rounded-lg flex flex-col justify-center px-2 text-xs font-mono transition-all
                ${isSelected
                  ? "bg-amber-600/30 border border-amber-500/50 ring-1 ring-amber-500/30"
                  : hasData
                    ? "hover:bg-[#1E293B] border border-transparent hover:border-[#334155] cursor-pointer"
                    : "opacity-30 cursor-default border border-transparent"
                }
              `}
            >
              <span className={`${isSelected ? "text-[12px] text-amber-300 font-semibold" : "text-[#94A3B8]"}`}>
                {day}
              </span>
              {hasData && (
                <span
                  className="text-[8px] font-semibold tabular-nums"
                  style={{ color: getScoreColor(score) }}
                >
                  {score}
                </span>
              )}
            </button>
          );
        }

        return (
          <div key={monthLabel}>
            <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3 text-center">{monthLabel}</h3>
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-center text-[10px] text-[#94A3B8] font-mono py-1">{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells}
            </div>
          </div>
        );
      })}
    </div>
  );
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
  return (
    <div className="bg-[#111827] border border-[#334155] rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[#334155] flex items-center gap-2">
        <Calendar className="h-4 w-4 text-[#3B82F6]" />
        <h2 className="text-sm font-semibold text-[#F8FAFC] uppercase tracking-wider">Score Calendar</h2>
      </div>
      <div className="p-6">
        <ThreeMonthCalendar
          snapshotScores={snapshotScores}
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
        />
      </div>
    </div>
  );
}
