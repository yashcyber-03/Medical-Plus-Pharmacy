import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { createPurchaseOrder, updateDraftPurchaseOrder } from "../services/purchasingService";
import { friendlyError } from "../services/errors";
import { formatMoney, paiseToRupees, rupeesToPaise, todayIso } from "../utils/format";

const inputCls = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";

// Create a new order, or edit a draft one. Creating an order does NOT add stock.
export default function PurchaseOrderForm({ order, suppliers, medicines, onSaved, onCancel }) {
  const editing = Boolean(order);
  const activeSuppliers = suppliers.filter((s) => s.active || s.id === order?.supplierId);

  const [supplierId, setSupplierId] = useState(order?.supplierId ?? "");
  const [expected, setExpected] = useState(order?.expectedDate ?? "");
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [rows, setRows] = useState(
    order
      ? order.items.map((i) => ({ medicineId: i.medicineId, qty: String(i.ordered), cost: paiseToRupees(i.costPaise) }))
      : [{ medicineId: "", qty: "", cost: "" }]
  );
  const [markOrdered, setMarkOrdered] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const medById = new Map(medicines.map((m) => [m.id, m]));
  const chosen = new Set(rows.map((r) => r.medicineId).filter(Boolean));

  function setRow(index, patch) {
    setRows((rs) => rs.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function pickMedicine(index, medicineId) {
    const med = medById.get(medicineId);
    setRow(index, { medicineId, cost: med && rows[index].cost === "" ? paiseToRupees(med.purchasePaise) : rows[index].cost });
  }

  const parsed = rows.map((r) => {
    const qty = /^\d{1,6}$/.test(r.qty) ? parseInt(r.qty, 10) : null;
    const cost = rupeesToPaise(r.cost);
    return { ...r, qtyNum: qty, costPaise: cost };
  });
  const total = parsed.reduce((s, r) => (r.qtyNum && r.costPaise !== null ? s + r.qtyNum * r.costPaise : s), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!supplierId) return setError("Choose a supplier.");
    if (expected && expected < todayIso()) return setError("The expected date cannot be in the past.");
    for (const [i, r] of parsed.entries()) {
      if (!r.medicineId) return setError(`Line ${i + 1}: choose a medicine.`);
      if (!r.qtyNum || r.qtyNum < 1) return setError(`Line ${i + 1}: enter a whole quantity of 1 or more.`);
      if (r.costPaise === null) return setError(`Line ${i + 1}: enter a valid unit cost, e.g. 18.50.`);
    }

    const payload = {
      supplierId,
      items: parsed.map((r) => ({ medicineId: r.medicineId, quantity: r.qtyNum, unitCostPaise: r.costPaise })),
      expectedDate: expected,
      notes: notes.trim(),
      markOrdered,
    };
    setBusy(true);
    try {
      if (editing) await updateDraftPurchaseOrder({ id: order.id, ...payload });
      else await createPurchaseOrder(payload);
      onSaved(
        editing
          ? markOrdered ? "Order updated and marked as ordered." : "Draft updated."
          : markOrdered ? "Purchase order created and marked as ordered." : "Draft purchase order saved."
      );
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="po-supplier" className="text-sm font-medium text-slate-700">Supplier *</label>
          <select id="po-supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={`${inputCls} mt-1 w-full`}>
            <option value="">Select…</option>
            {activeSuppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="po-expected" className="text-sm font-medium text-slate-700">Expected delivery</label>
          <input id="po-expected" type="date" min={todayIso()} value={expected} onChange={(e) => setExpected(e.target.value)} className={`${inputCls} mt-1 w-full`} />
        </div>
      </div>

      <div>
        <p className="mb-1 text-sm font-medium text-slate-700">Items *</p>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-12 items-center gap-2">
              <select value={r.medicineId} onChange={(e) => pickMedicine(i, e.target.value)} aria-label={`Medicine, line ${i + 1}`} className={`${inputCls} col-span-12 sm:col-span-6`}>
                <option value="">Select medicine…</option>
                {medicines.map((m) => (
                  <option key={m.id} value={m.id} disabled={chosen.has(m.id) && m.id !== r.medicineId}>{m.name}</option>
                ))}
              </select>
              <input value={r.qty} onChange={(e) => setRow(i, { qty: e.target.value })} inputMode="numeric" placeholder="Qty" aria-label={`Quantity, line ${i + 1}`} className={`${inputCls} col-span-4 sm:col-span-2`} />
              <input value={r.cost} onChange={(e) => setRow(i, { cost: e.target.value })} inputMode="decimal" placeholder="Unit cost ₹" aria-label={`Unit cost, line ${i + 1}`} className={`${inputCls} col-span-6 sm:col-span-3`} />
              <button type="button" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))} disabled={rows.length === 1} aria-label={`Remove line ${i + 1}`} className="col-span-2 justify-self-center rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-30 sm:col-span-1">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setRows((rs) => [...rs, { medicineId: "", qty: "", cost: "" }])} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
          <Plus className="h-4 w-4" /> Add another medicine
        </button>
      </div>

      <div>
        <label htmlFor="po-notes" className="text-sm font-medium text-slate-700">Notes</label>
        <textarea id="po-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputCls} mt-1 w-full`} />
      </div>

      <p className="text-sm text-slate-700">Expected total (excluding GST): <strong>{formatMoney(total)}</strong></p>
      <p className="rounded-md bg-sky-50 px-3 py-2 text-xs text-sky-800">
        Saving an order does not change stock. Stock is added only when you record a goods receipt for what actually arrived.
      </p>

      <fieldset className="flex flex-wrap gap-6 text-sm text-slate-700">
        <legend className="sr-only">Order status after saving</legend>
        <label className="flex items-center gap-2"><input type="radio" checked={!markOrdered} onChange={() => setMarkOrdered(false)} /> Save as draft</label>
        <label className="flex items-center gap-2"><input type="radio" checked={markOrdered} onChange={() => setMarkOrdered(true)} /> Save and mark as ordered</label>
      </fieldset>

      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={busy} className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {editing ? "Save order" : "Create order"}
        </button>
      </div>
    </form>
  );
}
