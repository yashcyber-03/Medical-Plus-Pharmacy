import { useState } from "react";
import { fetchValuation } from "../../services/reportsService";
import { fetchMedicines } from "../../services/medicineService";
import { useAsyncData } from "../../hooks/useAsyncData";
import { getStockStatus } from "../../utils/inventory";
import { formatMoney } from "../../utils/format";
import { rupeesText } from "../../utils/csv";
import StatusBadge from "../StatusBadge";
import ReportCard from "./ReportCard";
import ReportTable from "./ReportTable";
import ExportButton from "./ExportButton";

export default function StockValuationReport() {
  const [lowOnly, setLowOnly] = useState(false);
  const { data, loading, error } = useAsyncData(async () => {
    const [valuation, medicines] = await Promise.all([fetchValuation(), fetchMedicines()]);
    const byId = new Map(medicines.map((m) => [m.id, m]));
    return valuation
      .map((v) => {
        const m = byId.get(v.medicineId);
        const reorder = m?.reorder ?? 0;
        const active = m?.active ?? true;
        return { ...v, key: v.medicineId, reorder, active, status: active ? getStockStatus(v.sellableUnits, reorder) : "inactive" };
      })
      .filter((r) => r.active || r.sellableUnits + r.expiredUnits + r.quarantinedUnits > 0);
  }, []);

  const all = data ?? [];
  const rows = lowOnly ? all.filter((r) => r.status === "low-stock" || r.status === "out-of-stock") : all;
  const sum = (key) => rows.reduce((s, r) => s + r[key], 0);

  const columns = [
    { label: "Medicine", cell: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
    { label: "Sellable units", align: "right", cell: (r) => r.sellableUnits },
    { label: "Reorder level", align: "right", cell: (r) => r.reorder },
    { label: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { label: "Sellable value", align: "right", cell: (r) => formatMoney(r.sellableValuePaise) },
    { label: "Expired units", align: "right", cell: (r) => r.expiredUnits },
    { label: "Expired value", align: "right", cell: (r) => formatMoney(r.expiredValuePaise) },
    { label: "Quarantined units", align: "right", cell: (r) => r.quarantinedUnits },
    { label: "Quarantined value", align: "right", cell: (r) => formatMoney(r.quarantinedValuePaise) },
  ];
  const csvRows = rows.map((r) => [
    r.name, r.sellableUnits, r.reorder, r.status, rupeesText(r.sellableValuePaise),
    r.expiredUnits, rupeesText(r.expiredValuePaise), r.quarantinedUnits, rupeesText(r.quarantinedValuePaise),
  ]);

  return (
    <ReportCard
      title="Current stock and inventory valuation"
      description="As of now. Valued at each batch's purchase cost (not selling price), excluding GST. Sellable = active and not expired. Expired and quarantined stock is shown separately and is not part of sellable value."
      actions={
        <>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Low or out of stock only
          </label>
          <ExportButton filename="stock-valuation.csv" headers={["Medicine", "Sellable units", "Reorder level", "Status", "Sellable value (INR)", "Expired units", "Expired value (INR)", "Quarantined units", "Quarantined value (INR)"]} rows={csvRows} disabled={loading} />
        </>
      }
    >
      <ReportTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        empty={lowOnly ? "No medicines are low on stock." : "No medicines yet."}
        footer={
          <tr>
            <td className="px-4 py-3">Total</td>
            <td className="px-4 py-3 text-right">{sum("sellableUnits")}</td>
            <td /><td />
            <td className="px-4 py-3 text-right">{formatMoney(sum("sellableValuePaise"))}</td>
            <td className="px-4 py-3 text-right">{sum("expiredUnits")}</td>
            <td className="px-4 py-3 text-right">{formatMoney(sum("expiredValuePaise"))}</td>
            <td className="px-4 py-3 text-right">{sum("quarantinedUnits")}</td>
            <td className="px-4 py-3 text-right">{formatMoney(sum("quarantinedValuePaise"))}</td>
          </tr>
        }
      />
    </ReportCard>
  );
}
