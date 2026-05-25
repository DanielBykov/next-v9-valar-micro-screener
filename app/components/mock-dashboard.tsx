"use client";

import {useState, useEffect} from "react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceArea,
    PieChart, Pie, Cell
} from "recharts";
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/app/components/ui/collapsible";
import {Button} from "@/app/components/ui/button";
import {Tooltip, TooltipContent, TooltipTrigger, TooltipProvider} from "@/app/components/ui/tooltip";
import {ChevronDown, ChevronUp, Calendar, Info, Activity, Settings} from "lucide-react";
import Link from "next/link";

const GAUGE_DATA = [
    {name: 'Risk-Off', value: 55, fill: '#EF4444'},
    {name: 'Fragile', value: 15, fill: '#F59E0B'},
    {name: 'Neutral', value: 15, fill: '#3B82F6'},
    {name: 'Constructive', value: 15, fill: '#14B8A6'},
    {name: 'Risk-On', value: 20, fill: '#10B981'},
];

function getBlockSignal(score: number): { label: string; color: string; glowClass: string; borderColor: string } {
    if (score >= 16) return {
        label: "Strong Positive",
        color: "#10B981",
        glowClass: "glow-emerald",
        borderColor: "border-emerald-500/30"
    };
    if (score >= 12) return {
        label: "Neutral / Balanced",
        color: "#3B82F6",
        glowClass: "glow-blue",
        borderColor: "border-blue-500/30"
    };
    if (score >= 8) return {
        label: "Fragile",
        color: "#F59E0B",
        glowClass: "glow-amber",
        borderColor: "border-amber-500/30"
    };
    return {label: "Risk-Off", color: "#EF4444", glowClass: "glow-red", borderColor: "border-red-500/30"};
}

function getMetricDot(score: number): string {
    if (score >= 4) return "bg-emerald-500";
    if (score === 3) return "bg-blue-400";
    if (score === 2) return "bg-amber-500";
    return "bg-red-500";
}

function getRegimeForScore(score: number): string {
    if (score >= 100) return "Strong Risk-On";
    if (score >= 85) return "Constructive Risk-On";
    if (score >= 70) return "Neutral / Balanced";
    if (score >= 55) return "Fragile & Volatile";
    return "Risk-Off";
}

interface DashboardData {
    snapshot: {
        id: number;
        snapshotDate: string;
        totalScore: number;
        regime: string;
        regimeSubtitle: string | null;
        interpretation: string;
        vsYesterday: number | null;
        vs3mAvg: number | null;
        vs1yAvg: number | null;
        oneYearAgoScore: number | null;
    };
    blocks: Array<{
        id: number;
        name: string;
        score: number;
        maxScore: number;
        summary: string;
        drivers: Array<{ name: string; score: number }>;
        metrics: Array<{
            id: number;
            name: string;
            domain: string;
            score: number;
            maxScore: number;
            interpretation: string;
            isTopDriver: number;
        }>;
    }>;
    metrics: Array<{
        id: number;
        name: string;
        domain: string;
        score: number;
        maxScore: number;
        interpretation: string;
    }>;
    trend: Array<{
        month: string;
        score: number;
        sortOrder: number;
    }>;
}

function CustomTrendTooltip({active, payload, label}: any) {
    if (!active || !payload?.length) return null;
    const score = payload[0].value;
    const regime = getRegimeForScore(score);
    return (
        <div className="bg-[#1E293B] border border-[#334155] rounded-lg px-4 py-3 shadow-xl">
            <p className="text-xs text-[#94A3B8] mb-1 font-mono">{label}</p>
            <p className="text-lg font-semibold text-[#F8FAFC] font-mono">{score}</p>
            <p className="text-xs text-[#94A3B8] mt-1">{regime}</p>
        </div>
    );
}

function toNYDateString(date: Date): string {
    return date.toLocaleDateString("en-CA", {timeZone: "America/New_York"}); // returns YYYY-MM-DD
}

function formatSnapshotDate(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00-05:00');
    return d.toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "America/New_York"
    });
}

function getScoreColor(score: number): string {
    if (score >= 100) return "#10B981"; // Risk-On
    if (score >= 85) return "#14B8A6";  // Constructive
    if (score >= 70) return "#3B82F6";  // Neutral
    if (score >= 55) return "#F59E0B";  // Fragile
    return "#EF4444";                   // Risk-Off
}

function ThreeMonthCalendar({
                                snapshotScores,
                                selectedDate,
                                onSelectDate,
                            }: {
    snapshotScores: Map<string, number>;
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
}) {
    // Build 3 months centered on the selected date's month
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

    // Monday=0 based start day
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
                const monthLabel = monthDate.toLocaleDateString("en-US", {month: "long", year: "numeric"});

                const cells: React.ReactNode[] = [];
                // Empty cells for padding
                for (let i = 0; i < startDay; i++) {
                    cells.push(<div key={`empty-${i}`} className="h-10"/>);
                }
                // Day cells
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
                                    style={{color: getScoreColor(score)}}
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

export default function Home() {
    const [isTableOpen, setIsTableOpen] = useState(false);
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [snapshotScores, setSnapshotScores] = useState<Map<string, number>>(new Map());

    // Fetch list of available snapshot dates with scores
    useEffect(() => {
        fetch("/api/mock-snapshots")
            .then((res) => res.json())
            .then((list: Array<{ snapshotDate: string; totalScore: number }>) => {
                const map = new Map<string, number>();
                list.forEach((s) => map.set(s.snapshotDate, s.totalScore));
                setSnapshotScores(map);
            })
            .catch(() => {
            });
    }, []);

    // Fetch dashboard data (initial load or when date changes)
    useEffect(() => {
        setIsLoading(true);
        setError(null);
        const url = selectedDate
            ? `/api/mock-dashboard?date=${toNYDateString(selectedDate)}`
            : "/api/mock-dashboard";
        fetch(url)
            .then((res) => {
                if (!res.ok) throw new Error("No data for this date");
                return res.json();
            })
            .then((d) => {
                setData(d);
                setIsLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setIsLoading(false);
            });
    }, [selectedDate]);

    if (isLoading && !data) {
        return (
            <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
                <div className="flex items-center gap-3 text-[#94A3B8]">
                    <Activity className="h-5 w-5 animate-pulse"/>
                    <span className="font-mono text-sm">Loading macro intelligence...</span>
                </div>
            </div>
        );
    }

    if (!isLoading && (error || !data)) {
        return (
            <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
                <div className="text-red-400 font-mono text-sm">System error: Failed to load dashboard data.</div>
            </div>
        );
    }

    const {snapshot, blocks: blocksData, metrics: metricsData, trend: trendData} = data!;
    const needleRotation = (snapshot.totalScore / 120) * 180 - 90;
    const deltaYoY = snapshot.oneYearAgoScore ? snapshot.totalScore - snapshot.oneYearAgoScore : null;

    return (
        <TooltipProvider>
            <div className="relative min-h-screen bg-[#0F172A] text-[#F8FAFC] font-sans pb-16">

                {isLoading && data && (
                    <div className="fixed inset-0 z-50 bg-[#0F172A]/70 flex items-center justify-center">
                        <div className="flex items-center gap-3 text-[#94A3B8]">
                            <Activity className="h-5 w-5 animate-pulse"/>
                            <span className="font-mono text-sm">Loading macro intelligence...</span>
                        </div>
                    </div>
                )}

                <header className="border-b border-[#334155] bg-[#111827]">
                    <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"/>
                            <span className="text-sm font-semibold tracking-wide text-[#F8FAFC]">VALAR</span>
                            <span className="text-xs text-[#94A3B8] font-mono">Macro Pulse Intelligence (mock data)</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-xs text-[#94A3B8] font-mono">
                                <Calendar className="h-3.5 w-3.5"/>
                                <span>{formatSnapshotDate(snapshot.snapshotDate)} (New York)</span>
                            </div>
                            <Link href="/">
                                <Button variant="ghost" size="sm"
                                        className="h-8 px-2 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] cursor-pointer">
                                    <span className="text-xs">Real Data</span>
                                </Button>
                            </Link>
                            <Link href="/admin">
                                <Button variant="ghost" size="sm"
                                        className="h-8 px-2 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] cursor-pointer">
                                    <Settings className="h-3.5 w-3.5"/>
                                    <span className="text-xs ml-1.5">Admin</span>
                                </Button>
                            </Link>
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

                    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        <div
                            className="lg:col-span-5 bg-[#111827] border border-[#334155] rounded-xl p-8 flex flex-col items-center relative">
                            <p className="text-xs font-mono text-[#94A3B8] uppercase tracking-[0.15em] mb-1">Macro Pulse
                                Score</p>

                            <div className="relative h-44 w-full flex items-end justify-center mt-2">
                                <ResponsiveContainer width="100%" height="200%">
                                    <PieChart>
                                        <Pie
                                            data={GAUGE_DATA}
                                            cx="50%"
                                            cy="100%"
                                            startAngle={180}
                                            endAngle={0}
                                            innerRadius="72%"
                                            outerRadius="100%"
                                            paddingAngle={2}
                                            dataKey="value"
                                            stroke="none"
                                            isAnimationActive={false}
                                        >
                                            {GAUGE_DATA.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} opacity={0.7}/>
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>

                                <div
                                    className="absolute bottom-0 w-1.5 h-20 bg-[#F8FAFC] origin-bottom rounded-t-full z-10 transition-transform duration-1000 ease-out"
                                    style={{
                                        transform: `rotate(${needleRotation}deg)`,
                                        boxShadow: '0 0 8px rgba(248,250,252,0.3)'
                                    }}
                                />
                                <div className="absolute bottom-[-5px] w-3.5 h-3.5 bg-[#F8FAFC] rounded-full z-20"
                                     style={{boxShadow: '0 0 10px rgba(248,250,252,0.4)'}}/>

                                <div className="absolute bottom-3 flex flex-col items-center">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-5xl font-bold tracking-tight text-[#F8FAFC] font-mono"
                                              data-testid="text-total-score">{snapshot.totalScore}</span>
                                        <span className="text-base text-[#94A3B8] font-mono">/120</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 flex flex-col items-center gap-2">
                <span
                    className="text-sm font-semibold text-[#3B82F6] px-3 py-1 bg-[#3B82F6]/10 rounded border border-[#3B82F6]/20"
                    data-testid="text-regime">
                  {snapshot.regime}
                </span>
                                {snapshot.regimeSubtitle && (
                                    <span className="text-xs text-[#94A3B8] font-mono"
                                          data-testid="text-regime-subtitle">{snapshot.regimeSubtitle}</span>
                                )}
                            </div>

                            <div className="mt-4 flex flex-col items-center gap-1">
                                <span className="text-lg font-semibold text-[#F8FAFC]"
                                      data-testid="text-snapshot-date">{formatSnapshotDate(snapshot.snapshotDate)} (NY)</span>
                                <span className="text-[11px] text-[#94A3B8] font-mono uppercase tracking-wider">Daily Snapshot</span>
                            </div>
                        </div>

                        <div
                            className="lg:col-span-7 bg-[#111827] border border-[#334155] rounded-xl overflow-hidden flex flex-col">
                            <div className="px-6 py-4 border-b border-[#334155] flex items-center gap-2">
                                <Activity className="h-4 w-4 text-[#3B82F6]"/>
                                <h2 className="text-sm font-semibold text-[#F8FAFC] uppercase tracking-wider">Macro Risk
                                    Snapshot</h2>
                            </div>

                            <div className="flex-1 flex flex-col">
                                <div
                                    className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#334155]">
                                    <div className="px-6 py-5 flex justify-between items-center">
                                        <span className="text-sm text-[#94A3B8]">Daily Change</span>
                                        <span className="font-mono text-xl font-semibold text-[#F8FAFC]"
                                              data-testid="text-vs-yesterday">{snapshot.vsYesterday}</span>
                                    </div>
                                    <div className="px-6 py-5 flex justify-between items-center">
                                        <span className="text-sm text-[#94A3B8]">vs 3M Avg</span>
                                        <span className="font-mono text-xl font-semibold text-[#F59E0B]"
                                              data-testid="text-vs-3m">{snapshot.vs3mAvg}</span>
                                    </div>
                                </div>
                                <div
                                    className="border-t border-[#334155] grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#334155]">
                                    <div className="px-6 py-5 flex justify-between items-center">
                                        <span className="text-sm text-[#94A3B8]">vs 1Y Avg</span>
                                        <span className="font-mono text-xl font-semibold text-[#EF4444]"
                                              data-testid="text-vs-1y">{snapshot.vs1yAvg}</span>
                                    </div>
                                    <div className="px-6 py-5 flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-sm text-[#94A3B8]">1Y Ago</span>
                                            {deltaYoY !== null && <span
                                              className="text-xs text-[#94A3B8] font-mono mt-0.5">{deltaYoY > 0 ? "+" : ""}{deltaYoY} YoY</span>}
                                        </div>
                                        <span className="font-mono text-xl font-semibold text-[#F8FAFC]"
                                              data-testid="text-1y-ago">{snapshot.oneYearAgoScore}</span>
                                    </div>
                                </div>

                                <div className="border-t border-[#334155] px-6 py-4 flex-1">
                                    <p className="text-[13px] text-[#94A3B8] leading-relaxed">
                                        <span
                                            className="text-[#3B82F6] font-mono text-xs uppercase tracking-wider">SYS&gt; </span>
                                        {snapshot.interpretation}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <div className="bg-[#111827] border border-[#334155] rounded-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-[#334155] flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-[#3B82F6]"/>
                                <h2 className="text-sm font-semibold text-[#F8FAFC] uppercase tracking-wider">Score
                                    Calendar</h2>
                            </div>
                            <div className="p-6">
                                <ThreeMonthCalendar
                                    snapshotScores={snapshotScores}
                                    selectedDate={selectedDate ?? new Date(snapshot.snapshotDate + "T12:00:00-05:00")}
                                    onSelectDate={(date) => setSelectedDate(date)}
                                />
                            </div>
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center gap-2 mb-5">
                            <div className="h-px flex-1 bg-[#334155]"/>
                            <span className="text-xs font-mono text-[#94A3B8] uppercase tracking-[0.15em]">Domain Analysis</span>
                            <div className="h-px flex-1 bg-[#334155]"/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {blocksData.map((block: DashboardData["blocks"][number], i: number) => {
                                const signal = getBlockSignal(block.score);
                                return (
                                    <div
                                        key={block.id}
                                        className={`bg-[#1E293B] border ${signal.borderColor} rounded-xl ${signal.glowClass} overflow-hidden`}
                                        data-testid={`card-block-${i}`}
                                    >
                                        <div
                                            className="px-5 py-4 border-b border-[#334155]/50 flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-[#F8FAFC]">{block.name}</h3>
                                            <div className="flex items-center gap-3">
                        <span
                            className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border"
                            style={{
                                color: signal.color,
                                borderColor: signal.color + '33',
                                backgroundColor: signal.color + '15'
                            }}
                        >
                          {signal.label}
                        </span>
                                                <span className="text-lg font-bold font-mono text-[#F8FAFC]">
                          {block.score}<span className="text-xs text-[#94A3B8] font-normal ml-0.5">/{block.maxScore}</span>
                        </span>
                                            </div>
                                        </div>

                                        <div className="px-5 py-3">
                                            <div className="space-y-2">
                                                {block.metrics.map((metric: DashboardData["blocks"][number]["metrics"][number]) => (
                                                    <Tooltip key={metric.id}>
                                                        <TooltipTrigger asChild>
                                                            <div
                                                                className="flex items-center gap-3 group cursor-default">
                                                                <div
                                                                    className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${getMetricDot(metric.score)}`}/>
                                                                <span
                                                                    className="text-xs text-[#94A3B8] flex-1 truncate group-hover:text-[#F8FAFC] transition-colors">
                                  {metric.name}
                                </span>
                                                                <span
                                                                    className="text-xs font-mono text-[#F8FAFC] w-8 text-right">{metric.score}/5</span>
                                                                <div
                                                                    className="w-16 h-1.5 bg-[#334155] rounded-full overflow-hidden flex-shrink-0">
                                                                    <div
                                                                        className="h-full rounded-full transition-all"
                                                                        style={{
                                                                            width: `${(metric.score / 5) * 100}%`,
                                                                            backgroundColor: signal.color
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top"
                                                                        className="bg-[#1E293B] border-[#334155] text-[#F8FAFC] text-xs max-w-xs">
                                                            <p className="font-medium mb-1">{metric.name}</p>
                                                            <p className="text-[#94A3B8]">{metric.interpretation}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="px-5 py-3 border-t border-[#334155]/50">
                                            {block.drivers.length > 0 && (
                                                <div className="flex gap-3 mb-2">
                                                    <span
                                                        className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider flex-shrink-0 pt-0.5">Drivers</span>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                        {block.drivers.map((d: {
                                                            name: string;
                                                            score: number
                                                        }, j: number) => (
                                                            <span key={j} className="text-xs text-[#94A3B8]">
                                {d.name}: <span className="font-mono text-[#F8FAFC]">{d.score}/5</span>
                              </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            <p className="text-[11px] text-[#94A3B8]/80 italic leading-relaxed">&quot;{block.summary}&quot;</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section>
                        <div className="bg-[#111827] border border-[#334155] rounded-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-[#334155] flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-[#F8FAFC] uppercase tracking-wider">Macro
                                    Pulse Trend — 12 Months</h3>
                                <span className="text-[10px] font-mono text-[#94A3B8]">Feb 2025 — Feb 2026</span>
                            </div>
                            <div className="p-6">
                                <div className="h-[320px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={trendData} margin={{top: 5, right: 10, left: -20, bottom: 0}}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false}/>

                                            <ReferenceArea y1={55} y2={69} fill="#F59E0B" fillOpacity={0.03}/>
                                            <ReferenceArea y1={70} y2={84} fill="#3B82F6" fillOpacity={0.04}/>
                                            <ReferenceArea y1={85} y2={99} fill="#14B8A6" fillOpacity={0.03}/>
                                            <ReferenceArea y1={100} y2={120} fill="#10B981" fillOpacity={0.03}/>

                                            <XAxis
                                                dataKey="month"
                                                stroke="#94A3B8"
                                                fontSize={11}
                                                tickLine={false}
                                                axisLine={false}
                                                dy={10}
                                                fontFamily="JetBrains Mono"
                                            />
                                            <YAxis
                                                domain={[60, 100]}
                                                stroke="#94A3B8"
                                                fontSize={11}
                                                tickLine={false}
                                                axisLine={false}
                                                fontFamily="JetBrains Mono"
                                            />
                                            <RechartsTooltip content={<CustomTrendTooltip/>}/>
                                            <Line
                                                type="monotone"
                                                dataKey="score"
                                                stroke="#3B82F6"
                                                strokeWidth={2}
                                                dot={{r: 3, fill: '#0F172A', strokeWidth: 2, stroke: '#3B82F6'}}
                                                activeDot={{r: 5, fill: '#3B82F6', stroke: '#0F172A', strokeWidth: 2}}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <Collapsible
                            open={isTableOpen}
                            onOpenChange={setIsTableOpen}
                            className="bg-[#111827] border border-[#334155] rounded-xl overflow-hidden"
                        >
                            <CollapsibleTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="w-full flex justify-between items-center px-6 py-5 h-auto hover:bg-[#1E293B] rounded-none text-sm font-semibold text-[#F8FAFC] uppercase tracking-wider"
                                    data-testid="button-toggle-metrics"
                                >
                  <span className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-[#3B82F6]"/>
                    Expand Full 36-Metric Intelligence Panel
                  </span>
                                    {isTableOpen ? <ChevronUp className="h-4 w-4 text-[#94A3B8]"/> :
                                        <ChevronDown className="h-4 w-4 text-[#94A3B8]"/>}
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="border-t border-[#334155] overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead
                                            className="text-[10px] text-[#94A3B8] bg-[#0F172A] border-b border-[#334155] uppercase tracking-wider font-mono">
                                        <tr>
                                            <th className="px-5 py-3">Domain</th>
                                            <th className="px-5 py-3">Metric</th>
                                            <th className="px-5 py-3 text-center">Score (0-5)</th>
                                            <th className="px-5 py-3">Interpretation</th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#334155]/50">
                                        {metricsData.map((metric: DashboardData["metrics"][number]) => (
                                            <tr key={metric.id} className="hover:bg-[#1E293B]/50 transition-colors"
                                                data-testid={`row-metric-${metric.id}`}>
                                                <td className="px-5 py-3 text-[#94A3B8] text-xs whitespace-nowrap">{metric.domain}</td>
                                                <td className="px-5 py-3 text-[#F8FAFC] text-xs font-medium">{metric.name}</td>
                                                <td className="px-5 py-3 text-center">
                            <span className={`inline-flex items-center justify-center h-6 w-6 rounded text-xs font-mono font-bold
                              ${metric.score >= 4 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                                metric.score === 3 ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' :
                                    metric.score === 2 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                                        'bg-red-500/15 text-red-400 border border-red-500/20'}`}>
                              {metric.score}
                            </span>
                                                </td>
                                                <td className="px-5 py-3 text-[#94A3B8] text-xs">{metric.interpretation}</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    </section>

                </main>
            </div>
        </TooltipProvider>
    );
}
