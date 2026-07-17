import { AiStatusSection } from "./ai-status-section";
import { NarrativesTable } from "./narratives-table";

export default function AdminAiPage() {
  return (
    <div className="space-y-6">
      <AiStatusSection />
      <NarrativesTable />
    </div>
  );
}
