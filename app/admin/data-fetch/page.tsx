"use client";

import { useState } from "react";
import { CoverageTable } from "../_components/coverage-table";
import { DataFetchSection } from "./data-fetch-section";

export default function DataFetchPage() {
  const [coverageKey, setCoverageKey] = useState(0);

  return (
    <div className="space-y-6">
      <CoverageTable key={coverageKey} />
      <DataFetchSection onFetchComplete={() => setCoverageKey((k) => k + 1)} />
    </div>
  );
}
