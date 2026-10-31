import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { receiveGoods } from "../services/purchasingService";
import { friendlyError } from "../services/errors";
import { formatMoney, paiseToRupees, rupeesToPaise, todayIso } from "../utils/format";

const inputCls = "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm";

// Record what ACTUALLY arrived. Stock increases only here.
export default function ReceiveGoodsForm({ order, onSaved, onCancel }) {
  const outstanding = order.items.filter((i) => i.ordered - i.received > 0);
  let counter = 0;
  const [rows, setRows] = useState(() =>
    outstanding.map((i) => ({
      key: `r${counter++}`,
      poItemId: i.id,
      qty: "",
      batchNo: "",
      mfg: "",
      expiry: "",
      cost: paiseToRupees(i.costPaise),
    }))
  );
  const [invoiceRef, setInvoiceRef] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // One key per form. Submitting twice returns the same receipt; stock is never added twice.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const itemById = new Map(order.items.map((i) => [i.id, i]));

  function setRow(key, patch) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addBatchRow(poItemId) {
    const item = itemById.get(poItemId);
    setRows((rs) => {
      const lastIndex = rs.map((r) => r.poItemId).lastIndexOf(poItemId);
      const extra = { key: `x${Date.now()}${rs.length}`, poItemId, qty: "", batchNo: "", mfg: "", expiry: "", cost: paiseToRupees(item.costPaise) };
      return [...rs.slice(0, lastIndex + 1), extra, ...rs.slice(lastIndex + 1)];
    });
  }

  const used = rows.filter((r) => r.qty.trim() !== "" && r.qty.trim() !== "0");
  const runningTotal = used.reduce((s, r) => {
    const q = /^\d{1,6}$/.test(r.qty) ? parseInt(r.qty, 10) : 0;
    const c = rupeesToPaise(r.cost);
    return c === null ? s : s + q * c;
  }, 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (used.length === 0) return setError("Enter the quantity received for at least one item.");

    const perItem = new Map();
    const lines = [];
    for (const r of used) {
      const item = itemById.get(r.poItemId);
      if (!/^\d{1,6}$/.test(r.qty.trim()) || parseInt(r.qty, 10) < 1) return setError(`${item.name}: enter a whole quantity.`);
      const qty = parseInt(r.qty, 10);
      if (!r.batchNo.trim()) return setError(`${item.name}: enter the batch number.`);
      if (r.batchNo.trim().length > 40) return setError(`${item.name}: the batch number is too long.`);
      if (!r.expiry) return setError(`${item.name}, batch ${r.batchNo}: enter the expiry date.`);
      if (r.expiry <= todayIso()) return setError(`${item.name}, batch ${r.batchNo}: expiry must be a future date. Expired stock cannot be received.`);
      if (r.mfg && r.mfg >= r.expiry) return setError(`${item.name}, batch ${r.batchNo}: manufacturing date must be before expiry.`);
      const cost = rupeesToPaise(r.cost);
      if (cost === null) return setError(`${item.name}: enter a valid unit cost.`);

      perItem.set(r.poItemId, (perItem.get(r.poItemId) ?? 0) + qty);
      lines.push({ poItemId: r.poItemId, quantity: qty, batchNumber: r.batchNo.trim(), manufacturingDate: r.mfg, expiryDate: r.expiry, unitCostPaise: cost });
    }
    for (const [id, total] of perItem) {
      const item = itemById.get(id);
      const open = item.ordered - item.received;
      if (total > open) return setError(`${item.name}: you entered ${total}, but only ${open} are still outstanding.`);
    }

    setBusy(true);
    try {
      await receiveGoods({ idempotencyKey, poId: order.id, lines, supplierInvoice: invoiceRef.trim(), notes: notes.trim() });
      onSaved("Goods received. Stock has been added to the new batches.");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <p className="text-sm text-slate-600">
        Receiving against <strong>{order.number}</strong> from <strong>{order.supplier}</strong>. Leave the quantity empty for items that did not arrive.
      </p>

      <div className="space-y-3">
        {outstanding.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-900">{item.name}</p>
              <p className="text-xs text-slate-500">Outstanding: {item.ordered - item.received} of {item.ordered} {item.unit}s</p>
            </div>
            <div className="space-y-2">
              {rows.filter((r) => r.poItemId === item.id).map((r, idx) => (
                <div key={r.key} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-12">
                  <label className="text-xs text-slate-500 sm:col-span-2">Qty received
                    <input value={r.qty} onChange={(e) => setRow(r.key, { qty: e.target.value })} inputMode="numeric" className={`${inputCls} mt-0.5`} />
                  </label>
                  <label className="text-xs text-slate-500 sm:col-span-3">Batch number
                    <input value={r.batchNo} onChange={(e) => setRow(r.key, { batchNo: e.target.value })} className={`${inputCls} mt-0.5`} />
                  </label>
                  <label className="text-xs text-slate-500 sm:col-span-2">Mfg date
                    <input type="date" value={r.mfg} onChange={(e) => setRow(r.key, { mfg: e.target.value })} className={`${inputCls} mt-0.5`} />
                  </label>
                  <label className="text-xs text-slate-500 sm:col-span-2">Expiry date
                    <input type="date" value={r.expiry} min={todayIso()} onChange={(e) => setRow(r.key, { expiry: e.target.value })} className={`${inputCls} mt-0.5`} />
                  </label>
                  <label className="text-xs text-slate-500 sm:col-span-2">Unit cost ₹
                    <input value={r.cost} onChange={(e) => setRow(r.key, { cost: e.target.value })} inputMode="decimal" className={`${inputCls} mt-0.5`} />
                  </label>
                  <div className="sm:col-span-1">
                    {idx > 0 && (
                      <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} aria-label="Remove this batch line" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => addBatchRow(item.id)} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
              <Plus className="h-3 w-3" /> Another batch of this item
            </button>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">Supplier invoice no. (optional)
          <input value={invoiceRef} maxLength={60} onChange={(e) => setInvoiceRef(e.target.value)} className={`${inputCls} mt-1`} />
        </label>
        <label className="text-sm font-medium text-slate-700">Notes (optional)
          <input value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} className={`${inputCls} mt-1`} />
        </label>
      </div>

      <p className="text-sm text-slate-700">Value received (excluding GST): <strong>{formatMoney(runningTotal)}</strong></p>

      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={busy} className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Record receipt
        </button>
      </div>
    </form>
  );
}
