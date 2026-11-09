import { useState } from "react";
import { fetchAllBatches } from "../../services/reportsService";
import { useAsyncData } from "../../hooks/useAsyncData";
import { getBatchStatus } from "../../utils/inventory";
import { formatDate, formatMoney } from "../../utils/format";
import { rupeesText } from "../../utils/csv";
import StatusBadge from "../StatusBadge";
import ReportCard from "./ReportCard";
import ReportTable from "./ReportTable";
import ExportButton from "./ExportButton";

const FILTERS = [
  ["in-stock", "In stock"],
  ["near-expiry", "Near expiry"],
  ["expired", "Expired"],
  ["quarantined", "Quarantined"],
  ["all", "All batches"],
];

export default function BatchReport() {
  const [filter, setFilter] = useState("in-stock");
  const { data, loading, error } = useAsyncData(fetchAllBatches, []);

  const all = (data ?? []).map((b) => ({ ...b, st: getBatchStatus(b) }));
  const rows = all.filter((b) => {
    if (filter === "all") return true;
    if (filter === "in-stock") return b.qty > 0;
    return b.qty > 0 && b.st === filter;
  });

  const columns = [
    { label: "Medicine", cell: (r) => <span className="font-medium text-slate-900">{r.medicine}</span> },
    { label: "Batch", cell: (r) => r.batchNo },
    { label: "Supplier", cell: (r) => r.supplier || "—" },
    { label: "Expiry", cell: (r) => formatDate(r.expiry) },
    { label: "Remaining / received", align: "right", cell: (r) => `${r.qty} / ${r.received}` },
    { label: "Cost / unit", align: "right", cell: (r) => formatMoney(r.costPaise) },
    { label: "Value at cost", align: "right", cell: (r) => formatMoney(r.qty * r.costPaise) },
    { label: "Status", cell: (r) => <StatusBadge status={r.st} /> },
  ];
  const csvRows = rows.map((r) => [
    r.medicine, r.batchNo, r.supplier, r.expiry, r.received, r.qty,
    rupeesText(r.costPaise), rupeesText(r.qty * r.costPaise), r.st,
  ]);

  return (
    <ReportCard
      title="Batch stock and expiry"
      description="As of now. Every batch with its remaining quantity, expiry date and status. Near expiry means within 90 days."
      actions={
        <>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter batches" className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm">
            {FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <ExportButton filename={`batches-${filter}.csv`} headers={["Medicine", "Batch", "Supplier", "Expiry", "Received", "Remaining", "Cost per unit (INR)", "Value at cost (INR)", "Status"]} rows={csvRows} disabled={loading} />
        </>
      }
    >
      <ReportTable columns={columns} rows={rows} loading={loading} error={error} empty="No batches match this filter." />
    </ReportCard>
  );
}
