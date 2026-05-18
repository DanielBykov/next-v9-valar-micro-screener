"use client";

import { useState } from "react";
import { CoverageTable } from "../_components/coverage-table";
import { FredSection } from "./fred-section";

export default function FredPage() {
  const [coverageKey, setCoverageKey] = useState(0);

  return (
    <div className="space-y-6">
      <CoverageTable key={coverageKey} />
      <FredSection onFetchComplete={() => setCoverageKey((k) => k + 1)} />
    </div>
  );
}
