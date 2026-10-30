import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createMedicine, updateMedicine } from "../services/medicineService";
import { friendlyError } from "../services/errors";
import { rupeesToPaise, paiseToRupees } from "../utils/format";

const FORMS = ["Tablet", "Capsule", "Syrup", "Ointment", "Injection", "Drops", "Lozenge", "Other"];
const UNITS = ["strip", "bottle", "tube", "vial", "box", "pack", "piece"];

const inputCls = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

function initialValues(m) {
  return {
    name: m?.name ?? "",
    brand: m?.brand ?? "",
    generic: m?.generic ?? "",
    categoryId: m?.categoryId ?? "",
    manufacturer: m?.manufacturer ?? "",
    form: m?.form ?? "Tablet",
    strength: m && m.strength !== "-" ? m.strength : "",
    unit: m?.unit ?? "strip",
    barcode: m?.barcode ?? "",
    description: m?.description ?? "",
    purchase: m ? paiseToRupees(m.purchasePaise) : "",
    selling: m ? paiseToRupees(m.sellingPaise) : "",
    gst: m ? String(m.gstPercent) : "0",
    reorder: m ? String(m.reorder) : "10",
    rx: m?.rx ?? false,
    active: m?.active ?? true,
  };
}

function validate(v) {
  const e = {};
  if (!v.name.trim()) e.name = "Medicine name is required.";
  else if (v.name.trim().length > 150) e.name = "Use 150 characters or fewer.";
  if (!v.categoryId) e.categoryId = "Choose a category.";
  if (rupeesToPaise(v.purchase) === null) e.purchase = "Enter a valid amount, e.g. 18.50";
  if (rupeesToPaise(v.selling) === null) e.selling = "Enter a valid amount, e.g. 25.00";
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(v.gst) || Number(v.gst) > 100) e.gst = "Enter a percentage from 0 to 100.";
  if (!/^\d{1,6}$/.test(v.reorder)) e.reorder = "Enter a whole number, 0 or more.";
  return e;
}

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

export default function MedicineForm({ medicine, categories, onSaved, onCancel }) {
  const editing = Boolean(medicine);
  const [values, setValues] = useState(() => initialValues(medicine));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setValues((v) => ({ ...v, [key]: value }));
  };

  const sellingBelowCost =
    rupeesToPaise(values.selling) !== null &&
    rupeesToPaise(values.purchase) !== null &&
    rupeesToPaise(values.selling) < rupeesToPaise(values.purchase);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const payload = {
      ...values,
      purchasePaise: rupeesToPaise(values.purchase),
      sellingPaise: rupeesToPaise(values.selling),
      gstPercent: Number(values.gst),
      reorder: parseInt(values.reorder, 10),
    };

    setBusy(true);
    try {
      if (editing) await updateMedicine(medicine.id, payload);
      else await createMedicine(payload);
      onSaved(editing ? "Medicine updated." : "Medicine added.");
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="m-name" label="Medicine name *" error={errors.name}>
          <input id="m-name" value={values.name} onChange={set("name")} className={inputCls} />
        </Field>
        <Field id="m-category" label="Category *" error={errors.categoryId}>
          <select id="m-category" value={values.categoryId} onChange={set("categoryId")} className={inputCls}>
            <option value="">Select…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field id="m-brand" label="Brand name">
          <input id="m-brand" value={values.brand} onChange={set("brand")} className={inputCls} />
        </Field>
        <Field id="m-generic" label="Generic name">
          <input id="m-generic" value={values.generic} onChange={set("generic")} className={inputCls} />
        </Field>
        <Field id="m-maker" label="Manufacturer">
          <input id="m-maker" value={values.manufacturer} onChange={set("manufacturer")} className={inputCls} />
        </Field>
        <Field id="m-barcode" label="Barcode / SKU" hint="Optional. Must be unique.">
          <input id="m-barcode" value={values.barcode} onChange={set("barcode")} className={inputCls} />
        </Field>
        <Field id="m-form" label="Dosage form">
          <select id="m-form" value={values.form} onChange={set("form")} className={inputCls}>
            {FORMS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </Field>
        <Field id="m-strength" label="Strength" hint="e.g. 500 mg">
          <input id="m-strength" value={values.strength} onChange={set("strength")} className={inputCls} />
        </Field>
        <Field id="m-unit" label="Unit">
          <select id="m-unit" value={values.unit} onChange={set("unit")} className={inputCls}>
            {UNITS.map((u) => <option key={u}>{u}</option>)}
          </select>
        </Field>
        <Field id="m-reorder" label="Reorder level *" error={errors.reorder} hint="Low-stock alert at or below this quantity.">
          <input id="m-reorder" inputMode="numeric" value={values.reorder} onChange={set("reorder")} className={inputCls} />
        </Field>
        <Field id="m-purchase" label="Purchase price (₹) *" error={errors.purchase}>
          <input id="m-purchase" inputMode="decimal" value={values.purchase} onChange={set("purchase")} className={inputCls} />
        </Field>
        <Field id="m-selling" label="Selling price (₹) *" error={errors.selling}>
          <input id="m-selling" inputMode="decimal" value={values.selling} onChange={set("selling")} className={inputCls} />
        </Field>
        <Field id="m-gst" label="GST (%)" error={errors.gst} hint="Use the rate that applies to this product.">
          <input id="m-gst" inputMode="decimal" value={values.gst} onChange={set("gst")} className={inputCls} />
        </Field>
      </div>

      {sellingBelowCost && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          The selling price is lower than the purchase price. Check for a typing mistake.
        </p>
      )}

      <Field id="m-desc" label="Description">
        <textarea id="m-desc" rows={2} value={values.description} onChange={set("description")} className={inputCls} />
      </Field>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={values.rx} onChange={set("rx")} /> Prescription required
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={values.active} onChange={set("active")} /> Active
        </label>
      </div>

      {formError && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" disabled={busy} className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {editing ? "Save changes" : "Add medicine"}
        </button>
      </div>
    </form>
  );
}
