"use client";

import { useState, useEffect, SetStateAction} from "react";
import {TooltipProvider} from "@/app/components/ui/tooltip";
import {toNYDateString, getNYDateParts} from "./utils";
import type {DashboardData} from "./types";
import {Header} from "./Header";
import {ScoreGauge} from "./ScoreGauge";
import {SnapshotStats} from "./SnapshotStats";
import {ScoreGaugeSkeleton, SnapshotStatsSkeleton} from "./Skeletons";
import {DomainBlockCard} from "./DomainBlockCard";
import {TrendChart} from "./TrendChart";
import {MetricsTable} from "./MetricsTable";

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  // TODO: Score calculations temporarily disabled for faster page load.
  // Re-enable once snapshot scoring performance is optimized.
  // const [snapshotScores, setSnapshotScores] = useState<Map<string, number>>(new Map());
  // const [isCalendarLoading, setIsCalendarLoading] = useState(true);
  //
  // useEffect(() => {
  //   setIsCalendarLoading(true);
  //   fetch("/api/snapshots")
  //       .then((res) => res.json())
  //       .then((list: Array<{ snapshotDate: string; totalScore: number }>) => {
  //         const map = new Map<string, number>();
  //         list.forEach((s) => map.set(s.snapshotDate, s.totalScore));
  //         setSnapshotScores(map);
  //       })
  //       .catch(() => {
  //       })
  //       .finally(() => setIsCalendarLoading(false));
  // }, []);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    const url = selectedDate
        ? `/api/dashboard?date=${toNYDateString(selectedDate)}`
        : "/api/dashboard";
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

  if (!isLoading && (error || !data)) {
    return (
        <div className="min-h-screen bg-surface-base flex items-center justify-center">
          <div className="text-red-400 font-mono text-sm">System error: Failed to load dashboard data.</div>
        </div>
    );
  }

  const nyNow = getNYDateParts(new Date());
  const nyTodayDate = new Date(`${nyNow.year}-${String(nyNow.month + 1).padStart(2, "0")}-${String(nyNow.day).padStart(2, "0")}T12:00:00-05:00`);
  const initialDate = selectedDate ?? (data ? new Date(data.snapshot.snapshotDate + "T12:00:00-05:00") : nyTodayDate);

  return (
      <TooltipProvider>
        <div className="relative min-h-screen bg-surface-base text-text-primary font-sans pb-16">

          <Header
              snapshotDate={data?.snapshot.snapshotDate ?? ""}
              selectedDate={initialDate}
              onSelectDate={(date: SetStateAction<Date | undefined>) => setSelectedDate(date)}
          />

          <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {isLoading || !data ? (
                <>
                  <ScoreGaugeSkeleton />
                  <SnapshotStatsSkeleton />
                </>
              ) : (
                <>
                  <ScoreGauge snapshot={data.snapshot} />
                  <SnapshotStats snapshot={data.snapshot} blocks={data.blocks} />
                </>
              )}
            </section>

            {!isLoading && data && (
              <div className="animate-in fade-in duration-500 space-y-8">
                <section>
                  <div className="flex items-center gap-2 mb-5">
                    <div className="h-px flex-1 bg-border-subtle" />
                    <span className="text-xs font-mono text-text-secondary uppercase tracking-[0.15em]">Domain Analysis</span>
                    <div className="h-px flex-1 bg-border-subtle" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {data.blocks.map((block, i) => (
                      <DomainBlockCard key={block.id} block={block} index={i} />
                    ))}
                  </div>
                </section>

                <section>
                  <TrendChart date={initialDate} />
                </section>

                <section>
                  <MetricsTable metrics={data.metrics} />
                </section>
              </div>
            )}

          </main>
        </div>
      </TooltipProvider>
  );
}
