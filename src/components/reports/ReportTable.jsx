import { Loader2 } from "lucide-react";

// columns: [{ label, align?: "right", cell: (row) => node }]
export default function ReportTable({ columns, rows, loading, error, empty = "No data for this selection.", footer }) {
  if (loading) {
    return <p className="flex items-center gap-2 p-4 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>;
  }
  if (error) return <p role="alert" className="m-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (rows.length === 0) return <p className="p-4 text-sm text-slate-500">{empty}</p>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
          <tr>
            {columns.map((c) => (
              <th key={c.label} className={`px-4 py-3 font-medium ${c.align === "right" ? "text-right" : "text-left"}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={row.id ?? row.key ?? i} className="hover:bg-slate-50">
              {columns.map((c) => (
                <td key={c.label} className={`px-4 py-3 ${c.align === "right" ? "text-right" : ""}`}>{c.cell(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && <tfoot className="border-t border-slate-200 bg-slate-50 font-medium text-slate-900">{footer}</tfoot>}
      </table>
    </div>
  );
}
