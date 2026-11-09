import { Download } from "lucide-react";
import { downloadCsv } from "../../utils/csv";

export default function ExportButton({ filename, headers, rows, disabled }) {
  return (
    <button
      onClick={() => downloadCsv(filename, headers, rows)}
      disabled={disabled || rows.length === 0}
      className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
    >
      <Download className="h-4 w-4" /> Export CSV
    </button>
  );
}
