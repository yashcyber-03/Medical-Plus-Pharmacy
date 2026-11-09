import { useState } from "react";
import { fetchBestSellers } from "../../services/reportsService";
import { useAsyncData } from "../../hooks/useAsyncData";
import { formatMoney } from "../../utils/format";
import { rupeesText } from "../../utils/csv";
import ReportCard from "./ReportCard";
import ReportTable from "./ReportTable";
import ExportButton from "./ExportButton";

export default function BestSellersReport({ from, to }) {
  const [limit, setLimit] = useState(10);
  const { data, loading, error } = useAsyncData(() => fetchBestSellers(from, to, limit), [from, to, limit]);
  const rows = (data ?? []).map((r, i) => ({ ...r, key: r.medicineId, rank: i + 1, net: r.sold - r.returned }));

  const columns = [
    { label: "#", cell: (r) => r.rank },
    { label: "Medicine", cell: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
    { label: "Units sold", align: "right", cell: (r) => r.sold },
    { label: "Units returned", align: "right", cell: (r) => r.returned },
    { label: "Net units", align: "right", cell: (r) => r.net },
    { label: "Net revenue (excl. GST)", align: "right", cell: (r) => formatMoney(r.netRevenuePaise) },
  ];
  const csvRows = rows.map((r) => [r.rank, r.name, r.sold, r.returned, r.net, rupeesText(r.netRevenuePaise)]);

  return (
    <ReportCard
      title="Best-selling medicines"
      description="Ranked by net units: units sold minus units from approved returns in the same period."
      actions={
        <>
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} aria-label="Number of rows" className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm">
            <option value={10}>Top 10</option>
            <option value={25}>Top 25</option>
            <option value={50}>Top 50</option>
          </select>
          <ExportButton filename={`best-sellers-${from}-to-${to}.csv`} headers={["Rank", "Medicine", "Units sold", "Units returned", "Net units", "Net revenue (INR)"]} rows={csvRows} disabled={loading} />
        </>
      }
    >
      <ReportTable columns={columns} rows={rows} loading={loading} error={error} empty="No sales in this period." />
    </ReportCard>
  );
}
