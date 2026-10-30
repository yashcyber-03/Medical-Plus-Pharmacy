import { useState } from "react";
import { Loader2 } from "lucide-react";
import { addStockBatch } from "../services/medicineService";
import { friendlyError } from "../services/errors";
import { rupeesToPaise, paiseToRupees, todayIso } from "../utils/format";

const inputCls = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

function Field({ id, label, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function AddBatchForm({ medicine, onSaved, onCancel }) {
  const [v, setV] = useState({
    batchNumber: "",
    mfg: "",
    expiry: "",
    quantity: "",
    purchase: paiseToRupees(medicine.purchasePaise),
    selling: "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setV((s) => ({ ...s, [key]: e.target.value }));

  function validate() {
    const e = {};
    const today = todayIso();
    if (!v.batchNumber.trim()) e.batchNumber = "Batch number is required.";
    if (!v.expiry) e.expiry = "Expiry date is required.";
    else if (v.expiry <= today) e.expiry = "Expiry must be a future date.";
    if (v.mfg && v.expiry && v.mfg >= v.expiry) e.mfg = "Must be before the expiry date.";
    if (!/^\d{1,6}$/.test(v.quantity) || parseInt(v.quantity, 10) < 1) e.quantity = "Enter a whole number of 1 or more.";
    if (rupeesToPaise(v.purchase) === null) e.purchase = "Enter a valid amount.";
    if (v.selling !== "" && rupeesToPaise(v.selling) === null) e.selling = "Enter a valid amount, or leave empty.";
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setFormError("");
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      await addStockBatch({
        medicineId: medicine.id,
        batchNumber: v.batchNumber.trim(),
        manufacturingDate: v.mfg,
        expiryDate: v.expiry,
        quantity: parseInt(v.quantity, 10),
        purchasePaise: rupeesToPaise(v.purchase),
        sellingPaise: v.selling === "" ? null : rupeesToPaise(v.selling),
      });
      onSaved(`Stock added for ${medicine.name}.`);
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <p className="text-sm text-slate-600">
        Adding a new batch of <strong>{medicine.name}</strong>. Stock is tracked per batch, and every addition is recorded in the inventory ledger.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="b-no" label="Batch number *" error={errors.batchNumber}>
          <input id="b-no" value={v.batchNumber} onChange={set("batchNumber")} className={inputCls} />
        </Field>
        <Field id="b-qty" label={`Quantity received (${medicine.unit}s) *`} error={errors.quantity}>
          <input id="b-qty" inputMode="numeric" value={v.quantity} onChange={set("quantity")} className={inputCls} />
        </Field>
        <Field id="b-mfg" label="Manufacturing date" error={errors.mfg}>
          <input id="b-mfg" type="date" value={v.mfg} onChange={set("mfg")} className={inputCls} />
        </Field>
        <Field id="b-exp" label="Expiry date *" error={errors.expiry}>
          <input id="b-exp" type="date" value={v.expiry} onChange={set("expiry")} className={inputCls} />
        </Field>
        <Field id="b-cost" label="Purchase cost per unit (₹) *" error={errors.purchase}>
          <input id="b-cost" inputMode="decimal" value={v.purchase} onChange={set("purchase")} className={inputCls} />
        </Field>
        <Field id="b-sell" label="Selling price for this batch (₹)" error={errors.selling} hint="Optional. Leave empty to use the medicine's price.">
          <input id="b-sell" inputMode="decimal" value={v.selling} onChange={set("selling")} className={inputCls} />
        </Field>
      </div>

      {formError && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" disabled={busy} className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Add stock
        </button>
      </div>
    </form>
  );
}
