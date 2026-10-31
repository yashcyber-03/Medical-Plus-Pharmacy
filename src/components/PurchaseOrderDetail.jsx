import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { fetchPurchaseOrder, setPurchaseOrderStatus } from "../services/purchasingService";
import { friendlyError } from "../services/errors";
import { formatDate, formatMoney } from "../utils/format";
import StatusBadge from "./StatusBadge";
import PurchaseOrderForm from "./PurchaseOrderForm";
import ReceiveGoodsForm from "./ReceiveGoodsForm";

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// One purchase order: items, receipts and the actions that are allowed
// for its current status. `startView` can open the receive form directly.
export default function PurchaseOrderDetail({ orderId, suppliers, medicines, onChanged, startView = "detail" }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState(startView); // detail | edit | receive
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setOrder(await fetchPurchaseOrder(orderId));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  function done(message) {
    setView("detail");
    setConfirmCancel(false);
    setNotice(message);
    load();
    onChanged();
  }

  async function changeStatus(status, message) {
    setBusy(true);
    setError("");
    try {
      await setPurchaseOrderStatus(orderId, status);
      done(message);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !order) {
    return <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading order…</p>;
  }
  if (!order) {
    return <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error || "Order not found."}</p>;
  }

  if (view === "edit") {
    return <PurchaseOrderForm order={order} suppliers={suppliers} medicines={medicines} onSaved={done} onCancel={() => setView("detail")} />;
  }
  if (view === "receive") {
    return <ReceiveGoodsForm order={order} onSaved={done} onCancel={() => setView("detail")} />;
  }

  const canReceive = order.status === "ordered" || order.status === "partially_received";
  const btn = "rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

  return (
    <div className="space-y-4">
      {notice && <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-slate-900">{order.number}</p>
          <p className="text-sm text-slate-600">{order.supplier}{order.supplierPhone && ` · ${order.supplierPhone}`}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        <div><dt className="text-xs text-slate-500">Order date</dt><dd>{order.orderDate ? formatDate(order.orderDate) : "Not ordered yet"}</dd></div>
        <div><dt className="text-xs text-slate-500">Expected</dt><dd>{order.expectedDate ? formatDate(order.expectedDate) : "—"}</dd></div>
        <div><dt className="text-xs text-slate-500">Expected total (excl. GST)</dt><dd className="font-medium">{formatMoney(order.totalPaise)}</dd></div>
      </dl>
      {order.notes && <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">{order.notes}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Medicine</th>
              <th className="px-3 py-2 text-right font-medium">Ordered</th>
              <th className="px-3 py-2 text-right font-medium">Received</th>
              <th className="px-3 py-2 text-right font-medium">Outstanding</th>
              <th className="px-3 py-2 text-right font-medium">Unit cost</th>
              <th className="px-3 py-2 text-right font-medium">Line total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {order.items.map((i) => (
              <tr key={i.id}>
                <td className="px-3 py-2 font-medium text-slate-900">{i.name}</td>
                <td className="px-3 py-2 text-right">{i.ordered}</td>
                <td className="px-3 py-2 text-right">{i.received}</td>
                <td className="px-3 py-2 text-right">{i.ordered - i.received}</td>
                <td className="px-3 py-2 text-right">{formatMoney(i.costPaise)}</td>
                <td className="px-3 py-2 text-right">{formatMoney(i.ordered * i.costPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {order.receipts.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-medium text-slate-900">Goods receipts</p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
            {order.receipts.map((g) => (
              <li key={g.id} className="flex items-center justify-between px-3 py-2">
                <span><strong>{g.number}</strong> · {formatDateTime(g.at)}{g.invoiceRef && ` · invoice ${g.invoiceRef}`}</span>
                <span>{formatMoney(g.totalPaise)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {confirmCancel ? (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          <p>Cancel {order.number}? A cancelled order cannot be reopened.</p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => changeStatus("cancelled", "Order cancelled.")} disabled={busy} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">Yes, cancel order</button>
            <button onClick={() => setConfirmCancel(false)} className={btn}>Keep order</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap justify-end gap-2">
          {order.status === "draft" && (
            <>
              <button onClick={() => { setNotice(""); setView("edit"); }} className={btn}>Edit draft</button>
              <button onClick={() => changeStatus("ordered", "Order marked as ordered.")} disabled={busy} className={btn}>Mark as ordered</button>
            </>
          )}
          {(order.status === "draft" || order.status === "ordered") && (
            <button onClick={() => setConfirmCancel(true)} className={`${btn} text-red-700`}>Cancel order</button>
          )}
          {canReceive && (
            <button onClick={() => { setNotice(""); setView("receive"); }} className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">Receive goods</button>
          )}
        </div>
      )}
    </div>
  );
}
