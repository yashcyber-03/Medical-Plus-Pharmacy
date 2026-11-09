import { fetchReceiptsInRange } from "../../services/reportsService";
import { useAsyncData } from "../../hooks/useAsyncData";
import { formatMoney } from "../../utils/format";
import { rupeesText } from "../../utils/csv";
import ReportCard from "./ReportCard";
import ReportTable from "./ReportTable";
import ExportButton from "./ExportButton";

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function PurchasesReport({ from, to }) {
  const { data, loading, error } = useAsyncData(() => fetchReceiptsInRange(from, to), [from, to]);
  const rows = data ?? [];
  const total = rows.reduce((s, r) => s + r.totalPaise, 0);

  const columns = [
    { label: "Receipt", cell: (r) => <span className="font-medium text-slate-900">{r.number}</span> },
    { label: "Received", cell: (r) => <span className="whitespace-nowrap text-slate-600">{formatDateTime(r.at)}</span> },
    { label: "Supplier", cell: (r) => r.supplier },
    { label: "Purchase order", cell: (r) => r.poNumber },
    { label: "Supplier invoice", cell: (r) => r.invoiceRef || "—" },
    { label: "Value (excl. GST)", align: "right", cell: (r) => formatMoney(r.totalPaise) },
  ];
  const csvRows = rows.map((r) => [r.number, formatDateTime(r.at), r.supplier, r.poNumber, r.invoiceRef, rupeesText(r.totalPaise)]);

  return (
    <ReportCard
      title="Purchase history"
      description="Goods actually received in the period. Orders that have not arrived are not included. Shows up to 500 receipts."
      actions={<ExportButton filename={`purchases-${from}-to-${to}.csv`} headers={["Receipt", "Received", "Supplier", "Purchase order", "Supplier invoice", "Value excl. GST (INR)"]} rows={csvRows} disabled={loading} />}
    >
      <ReportTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        empty="No goods were received in this period."
        footer={<tr><td className="px-4 py-3" colSpan={5}>Total received</td><td className="px-4 py-3 text-right">{formatMoney(total)}</td></tr>}
      />
    </ReportCard>
  );
}
