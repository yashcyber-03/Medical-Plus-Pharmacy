import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import PurchaseOrderForm from "../components/PurchaseOrderForm";
import PurchaseOrderDetail from "../components/PurchaseOrderDetail";
import { fetchPurchaseOrders, fetchSuppliers, PO_PAGE_SIZE } from "../services/purchasingService";
import { fetchMedicines } from "../services/medicineService";
import { friendlyError } from "../services/errors";
import { formatDate, formatMoney } from "../utils/format";

const STATUSES = [
  ["", "All statuses"], ["draft", "Draft"], ["ordered", "Ordered"],
  ["partially_received", "Partly received"], ["received", "Received"], ["cancelled", "Cancelled"],
];

export default function PurchaseOrders() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [modal, setModal] = useState(null); // { type: "new" } | { type: "detail", id }
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetchSuppliers().then(setSuppliers).catch(() => {});
    fetchMedicines().then((all) => setMedicines(all.filter((m) => m.active))).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchPurchaseOrders({ page, status }));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(data.total / PO_PAGE_SIZE));

  return (
    <>
      <PageHeader title="Purchase orders" subtitle="Order medicines from suppliers. Stock changes only when goods are received.">
        <button onClick={() => { setNotice(""); setModal({ type: "new" }); }} className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
          <Plus className="h-4 w-4" /> New order
        </button>
      </PageHeader>

      {notice && <p role="status" className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={load} className="rounded border border-red-300 px-2 py-1 font-medium hover:bg-red-100">Retry</button>
        </div>
      )}

      <div className="mb-4">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
          {STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Order</th>
              <th className="px-4 py-3 text-left font-medium">Supplier</th>
              <th className="px-4 py-3 text-left font-medium">Ordered on</th>
              <th className="px-4 py-3 text-left font-medium">Expected</th>
              <th className="px-4 py-3 text-right font-medium">Received / ordered</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500"><Loader2 className="mx-auto h-5 w-5 animate-spin" aria-label="Loading" /></td></tr>}
            {!loading && !error && data.rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No purchase orders yet. Add a supplier first, then create an order.</td></tr>
            )}
            {!loading && data.rows.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{o.number}</td>
                <td className="px-4 py-3">{o.supplier}</td>
                <td className="px-4 py-3">{o.orderDate ? formatDate(o.orderDate) : "—"}</td>
                <td className="px-4 py-3">{o.expectedDate ? formatDate(o.expectedDate) : "—"}</td>
                <td className="px-4 py-3 text-right">{o.receivedUnits} / {o.units}</td>
                <td className="px-4 py-3 text-right">{formatMoney(o.totalPaise)}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { setNotice(""); setModal({ type: "detail", id: o.id }); }} className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Open</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <p>{data.total} order{data.total === 1 ? "" : "s"}</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(page - 1)} disabled={page === 1} aria-label="Previous page" className="rounded-md border border-slate-300 bg-white p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <span>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} aria-label="Next page" className="rounded-md border border-slate-300 bg-white p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {modal?.type === "new" && (
        <Modal wide title="New purchase order" onClose={() => setModal(null)}>
          {suppliers.filter((s) => s.active).length === 0 ? (
            <p className="text-sm text-slate-600">You need at least one active supplier first. Add one on the Suppliers page.</p>
          ) : (
            <PurchaseOrderForm
              suppliers={suppliers}
              medicines={medicines}
              onSaved={(message) => { setModal(null); setNotice(message); load(); }}
              onCancel={() => setModal(null)}
            />
          )}
        </Modal>
      )}
      {modal?.type === "detail" && (
        <Modal wide title="Purchase order" onClose={() => setModal(null)}>
          <PurchaseOrderDetail orderId={modal.id} suppliers={suppliers} medicines={medicines} onChanged={load} />
        </Modal>
      )}
    </>
  );
}
