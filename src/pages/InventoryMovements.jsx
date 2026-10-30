import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { fetchMedicines } from "../services/medicineService";
import { fetchMovements, MOVEMENT_PAGE_SIZE } from "../services/stockService";
import { friendlyError } from "../services/errors";

const TYPE_LABELS = {
  opening_stock: "Stock added",
  purchase_receipt: "Purchase receipt",
  sale: "Sale",
  sale_return: "Sale return",
  adjustment: "Adjustment",
  disposal: "Disposal",
};

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function InventoryMovements() {
  const [medicines, setMedicines] = useState([]);
  const [type, setType] = useState("");
  const [medicineId, setMedicineId] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMedicines().then(setMedicines).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchMovements({ page, type, medicineId }));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [page, type, medicineId]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(data.total / MOVEMENT_PAGE_SIZE));
  const inputCls = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";

  return (
    <>
      <PageHeader title="Inventory movements" subtitle="A permanent ledger of every stock change" />

      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={load} className="rounded border border-red-300 px-2 py-1 font-medium hover:bg-red-100">Retry</button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <select value={medicineId} onChange={(e) => { setMedicineId(e.target.value); setPage(1); }} aria-label="Filter by medicine" className={inputCls}>
          <option value="">All medicines</option>
          {medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label="Filter by type" className={inputCls}>
          <option value="">All types</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">When</th>
              <th className="px-4 py-3 text-left font-medium">Medicine</th>
              <th className="px-4 py-3 text-left font-medium">Batch</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-right font-medium">Change</th>
              <th className="px-4 py-3 text-right font-medium">Batch balance</th>
              <th className="px-4 py-3 text-left font-medium">Reason</th>
              <th className="px-4 py-3 text-left font-medium">By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500"><Loader2 className="mx-auto h-5 w-5 animate-spin" aria-label="Loading" /></td></tr>
            )}
            {!loading && !error && data.rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No movements match these filters.</td></tr>
            )}
            {!loading && data.rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(r.at)}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{r.medicine}</td>
                <td className="px-4 py-3">{r.batchNo}</td>
                <td className="px-4 py-3">{TYPE_LABELS[r.type] ?? r.type}</td>
                <td className={`px-4 py-3 text-right font-medium ${r.change > 0 ? "text-emerald-700" : "text-red-700"}`}>
                  {r.change > 0 ? `+${r.change}` : r.change}
                </td>
                <td className="px-4 py-3 text-right">{r.balanceAfter}</td>
                <td className="px-4 py-3 text-slate-600">{r.reason || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{r.by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <p>{data.total} movement{data.total === 1 ? "" : "s"}</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(page - 1)} disabled={page === 1} aria-label="Previous page" className="rounded-md border border-slate-300 bg-white p-1.5 disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} aria-label="Next page" className="rounded-md border border-slate-300 bg-white p-1.5 disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
