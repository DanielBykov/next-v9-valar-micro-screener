import { CoverageTable } from "../_components/coverage-table";
import { FredSection } from "./fred-section";

export default function FredPage() {
  return (
    <div className="space-y-6">
      <CoverageTable />
      <FredSection />
    </div>
  );
}
