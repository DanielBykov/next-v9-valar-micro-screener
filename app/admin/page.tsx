"use client";

import { useState } from "react";
import { DataCoverageCard } from "./_components/data-coverage-card";
import { FetchStatusCard } from "./_components/fetch-status-card";
import { LatestSnapshotCard } from "./_components/latest-snapshot-card";

export default function AdminPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <DataCoverageCard key={`cov-${refreshKey}`} />
      <FetchStatusCard onFetchComplete={() => setRefreshKey((k) => k + 1)} />
    </div>
  );
}
