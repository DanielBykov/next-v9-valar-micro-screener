import { CoverageTable } from "./coverage-table";
import { IndicatorsTable } from "./indicators-table";

export default function IndicatorsPage() {
  return (
    <div className="space-y-6">
      <CoverageTable />
      <IndicatorsTable />
    </div>
  );
}
