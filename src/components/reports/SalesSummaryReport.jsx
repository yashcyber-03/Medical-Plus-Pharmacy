import { fetchSalesSummary } from "../../services/reportsService";
import { useAsyncData } from "../../hooks/useAsyncData";
import { formatMoney } from "../../utils/format";
import { rupeesText } from "../../utils/csv";
import ReportCard from "./ReportCard";
import ExportButton from "./ExportButton";

function buildLines(d) {
  const netBefore = d.grossPaise - d.discountPaise;
  const net = netBefore - d.returnsNetPaise;
  const profit = net - d.cogsPaise;
  const margin = net > 0 ? `${(Math.round((profit * 10000) / net) / 100).toFixed(2)}%` : "n/a";
  return [
    { label: "Invoices", text: String(d.invoices) },
    { label: "Gross sales", paise: d.grossPaise, note: "Before discounts, excluding GST." },
    { label: "Discounts given", paise: -d.discountPaise },
    { label: "Approved returns", paise: -d.returnsNetPaise, note: "Excluding GST. Counted on the date a return was approved." },
    { label: "Net sales", paise: net, strong: true, note: "Gross sales − discounts − approved returns. This is revenue, excluding GST." },
    { label: "Cost of goods sold", paise: -d.cogsPaise, note: "Purchase cost of the batches sold, minus the cost of returned units that went back into stock." },
    { label: "Gross profit", paise: profit, strong: true, note: `Net sales − cost of goods sold. Margin: ${margin}.` },
    { label: "GST collected on sales", paise: d.gstPaise, note: "Owed to the tax authority. Not revenue." },
    { label: "GST refunded on returns", paise: -d.returnsTaxPaise },
    { label: "Refunds due or paid (incl. GST)", paise: d.returnsRefundPaise, note: "Money value of approved returns." },
    { label: "Purchases received", paise: d.purchasesPaise, note: "Goods receipts excluding GST. This is spending on stock, not cost of goods sold, and not a cash balance." },
  ];
}

export default function SalesSummaryReport({ from, to }) {
  const { data, loading, error } = useAsyncData(() => fetchSalesSummary(from, to), [from, to]);
  const lines = data ? buildLines(data) : [];
  const csvRows = lines.map((l) => [l.label, l.text ?? rupeesText(l.paise), l.note ?? ""]);

  return (
    <ReportCard
      title="Sales and profit summary"
      description="Revenue, cost and profit are kept separate. Cash balance is not tracked by this system."
      actions={<ExportButton filename={`sales-summary-${from}-to-${to}.csv`} headers={["Item", "Value (INR)", "Note"]} rows={csvRows} disabled={loading} />}
    >
      {loading && <p className="p-4 text-sm text-slate-500">Loading…</p>}
      {error && <p role="alert" className="m-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {data && (
        <dl className="divide-y divide-slate-100">
          {lines.map((l) => (
            <div key={l.label} className={`flex items-start justify-between gap-4 px-4 py-3 text-sm ${l.strong ? "bg-slate-50" : ""}`}>
              <div>
                <dt className={l.strong ? "font-semibold text-slate-900" : "text-slate-700"}>{l.label}</dt>
                {l.note && <p className="mt-0.5 max-w-xl text-xs text-slate-500">{l.note}</p>}
              </div>
              <dd className={`whitespace-nowrap ${l.strong ? "font-semibold text-slate-900" : "text-slate-800"}`}>
                {l.text ?? formatMoney(l.paise)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </ReportCard>
  );
}
