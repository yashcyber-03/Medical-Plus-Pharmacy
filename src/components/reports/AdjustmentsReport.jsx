import { fetchAdjustments } from "../../services/reportsService";
import { useAsyncData } from "../../hooks/useAsyncData";
import ReportCard from "./ReportCard";
import ReportTable from "./ReportTable";
import ExportButton from "./ExportButton";

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdjustmentsReport({ from, to }) {
  const { data, loading, error } = useAsyncData(() => fetchAdjustments(from, to), [from, to]);
  const rows = data ?? [];

  const columns = [
    { label: "When", cell: (r) => <span className="whitespace-nowrap text-slate-600">{formatDateTime(r.at)}</span> },
    { label: "Medicine", cell: (r) => <span className="font-medium text-slate-900">{r.medicine}</span> },
    { label: "Batch", cell: (r) => r.batchNo },
    { label: "Type", cell: (r) => (r.type === "disposal" ? "Disposal" : "Adjustment") },
    { label: "Change", align: "right", cell: (r) => <span className={r.change > 0 ? "text-emerald-700" : "text-red-700"}>{r.change > 0 ? `+${r.change}` : r.change}</span> },
    { label: "Batch balance", align: "right", cell: (r) => r.balanceAfter },
    { label: "Reason", cell: (r) => r.reason || "—" },
    { label: "By", cell: (r) => r.by },
  ];
  const csvRows = rows.map((r) => [formatDateTime(r.at), r.medicine, r.batchNo, r.type, r.change, r.balanceAfter, r.reason, r.by]);

  return (
    <ReportCard
      title="Stock adjustments and disposals"
      description="Manual corrections and disposals in the period, with the reason and who made them. Shows up to 500 rows."
      actions={<ExportButton filename={`adjustments-${from}-to-${to}.csv`} headers={["When", "Medicine", "Batch", "Type", "Change", "Batch balance", "Reason", "By"]} rows={csvRows} disabled={loading} />}
    >
      <ReportTable columns={columns} rows={rows} loading={loading} error={error} empty="No adjustments or disposals in this period." />
    </ReportCard>
  );
}
