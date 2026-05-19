"use client";

import { useState } from "react";
import { CoverageTable } from "../_components/coverage-table";
import { IndicatorsTable } from "./indicators-table";

export default function IndicatorsPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>();

  return (
    <div className="space-y-6">
      <CoverageTable onMonthClick={setSelectedMonth} />
      <IndicatorsTable filterMonth={selectedMonth} />
    </div>
  );
}
