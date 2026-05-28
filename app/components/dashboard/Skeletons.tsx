function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-[#1E293B] ${className}`} />;
}

export function ScoreGaugeSkeleton() {
  return (
    <div className="lg:col-span-5 bg-[#111827] border border-[#334155] rounded-xl p-8 flex flex-col items-center relative">
      <Pulse className="h-3 w-32 mb-1" />
      {/* gauge arc placeholder */}
      <div className="relative h-44 w-full flex items-end justify-center mt-2">
        <Pulse className="w-48 h-24 rounded-t-full" />
      </div>
      {/* score + regime */}
      <div className="mt-5 flex flex-col items-center gap-2">
        <Pulse className="h-6 w-28" />
        <Pulse className="h-4 w-20" />
      </div>
      {/* date */}
      <div className="mt-4 flex flex-col items-center gap-1">
        <Pulse className="h-5 w-40" />
        <Pulse className="h-3 w-24" />
      </div>
    </div>
  );
}

export function SnapshotStatsSkeleton() {
  return (
    <div className="lg:col-span-7 bg-[#111827] border border-[#334155] rounded-xl overflow-hidden flex flex-col">
      {/* header row */}
      <div className="px-6 py-4 border-b border-[#334155] flex items-center gap-2">
        <Pulse className="h-4 w-4" />
        <Pulse className="h-4 w-40" />
      </div>
      {/* stat rows */}
      <div className="flex-1 flex flex-col">
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#334155]">
          {[0, 1].map((i) => (
            <div key={i} className="px-6 py-5 flex justify-between items-center">
              <Pulse className="h-4 w-24" />
              <Pulse className="h-6 w-12" />
            </div>
          ))}
        </div>
        <div className="border-t border-[#334155] grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#334155]">
          {[0, 1].map((i) => (
            <div key={i} className="px-6 py-5 flex justify-between items-center">
              <Pulse className="h-4 w-24" />
              <Pulse className="h-6 w-12" />
            </div>
          ))}
        </div>
        {/* interpretation */}
        <div className="border-t border-[#334155] px-6 py-4 flex-1 flex flex-col gap-2">
          <Pulse className="h-3 w-full" />
          <Pulse className="h-3 w-5/6" />
          <Pulse className="h-3 w-4/6" />
        </div>
      </div>
    </div>
  );
}
