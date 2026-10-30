import { Info } from "lucide-react";

export default function SampleDataNote({ children }) {
  return (
    <p className="mb-4 flex items-center gap-2 rounded-md bg-sky-50 px-3 py-2 text-xs text-sky-800">
      <Info className="h-4 w-4 shrink-0" />
      {children ?? "Sample data for the Phase 1 preview. Real database records replace this in Phase 3."}
    </p>
  );
}
