import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import PurchaseOrderDetail from "../components/PurchaseOrderDetail";
import { fetchPurchaseOrders, fetchReceiptDetail, fetchReceipts, fetchSuppliers, PO_PAGE_SIZE } from "../services/purchasingService";
import { fetchMedicines } from "../services/medicineService";
import { friendlyError } from "../services/errors";
import { formatDate, formatMoney } from "../utils/format";

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ReceiptView({ id }) {
  const [r, setR] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReceiptDetail(id).then(setR).catch((err) => setError(friendlyError(err)));
  }, [id]);

  if (error) return <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (!r) return <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>;

  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="text-lg font-semibold text-slate-900">{r.number}</p>
        <p className="text-slate-600">{r.supplier} · against {r.poNumber} · {formatDateTime(r.at)}</p>
        {r.invoiceRef && <p className="text-slate-600">Supplier invoice: {r.invoiceRef}</p>}
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Medicine</th>
              <th className="px-3 py-2 text-left font-medium">Batch</th>
              <th className="px-3 py-2 text-left font-medium">Expiry</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-right font-medium">Unit cost</th>
              <th className="px-3 py-2 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {r.items.map((i) => (
              <tr key={i.id}>
                <td className="px-3 py-2 font-medium text-slate-900">{i.name}</td>
                <td className="px-3 py-2">{i.batchNo}</td>
                <td className="px-3 py-2">{i.expiry ? formatDate(i.expiry) : "—"}</td>
                <td className="px-3 py-2 text-right">{i.qty}</td>
                <td className="px-3 py-2 text-right">{formatMoney(i.costPaise)}</td>
                <td className="px-3 py-2 text-right">{formatMoney(i.qty * i.costPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-right font-medium">Total (excl. GST): {formatMoney(r.totalPaise)}</p>
      {r.notes && <p className="rounded-md bg-slate-50 px-3 py-2 text-slate-600">{r.notes}</p>}
    </div>
  );
}

export default function GoodsReceipts() {
  const [awaiting, setAwaiting] = useState([]);
  const [receipts, setReceipts] = useState({ rows: [], total: 0 });
  const [page, setPage] = useState(1);
  const [suppliers, setSuppliers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // { type: "order", id } | { type: "receipt", id }

  useEffect(() => {
    fetchSuppliers().then(setSuppliers).catch(() => {});
    fetchMedicines().then((all) => setMedicines(all.filter((m) => m.active))).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [orders, recent] = await Promise.all([
        fetchPurchaseOrders({ statuses: ["ordered", "partially_received"] }),
        fetchReceipts({ page }),
      ]);
      setAwaiting(orders.rows);
      setReceipts(recent);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(receipts.total / PO_PAGE_SIZE));

  return (
    <>
      <PageHeader title="Goods receipt" subtitle="Record what actually arrived. This is the only way purchased stock enters inventory." />

      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={load} className="rounded border border-red-300 px-2 py-1 font-medium hover:bg-red-100">Retry</button>
        </div>
      )}

      <section className="mb-6 rounded-lg border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">Awaiting delivery</h2>
        {loading ? (
          <p className="flex items-center gap-2 p-4 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
        ) : awaiting.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No orders are waiting for goods. Orders marked “Ordered” appear here.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {awaiting.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{o.number} · {o.supplier}</p>
                  <p className="text-xs text-slate-500">
                    {o.receivedUnits} of {o.units} units received{o.expectedDate && ` · expected ${formatDate(o.expectedDate)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={o.status} />
                  <button onClick={() => setModal({ type: "order", id: o.id })} className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700">Receive goods</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">Receipts</h2>
        {!loading && receipts.rows.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No goods have been received yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {receipts.rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{r.number} · {r.supplier}</p>
                  <p className="text-xs text-slate-500">{r.poNumber} · {formatDateTime(r.at)} · by {r.by}{r.invoiceRef && ` · invoice ${r.invoiceRef}`}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{formatMoney(r.totalPaise)}</span>
                  <button onClick={() => setModal({ type: "receipt", id: r.id })} className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">View</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <p>{receipts.total} receipt{receipts.total === 1 ? "" : "s"}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(page - 1)} disabled={page === 1} aria-label="Previous page" className="rounded-md border border-slate-300 bg-white p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <span>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} aria-label="Next page" className="rounded-md border border-slate-300 bg-white p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </section>

      {modal?.type === "order" && (
        <Modal wide title="Receive goods" onClose={() => setModal(null)}>
          <PurchaseOrderDetail orderId={modal.id} suppliers={suppliers} medicines={medicines} onChanged={load} startView="receive" />
        </Modal>
      )}
      {modal?.type === "receipt" && (
        <Modal wide title="Goods receipt" onClose={() => setModal(null)}>
          <ReceiptView id={modal.id} />
        </Modal>
      )}
    </>
  );
}
