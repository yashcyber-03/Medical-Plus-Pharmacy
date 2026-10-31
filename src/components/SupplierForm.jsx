import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createSupplier, updateSupplier } from "../services/purchasingService";
import { friendlyError } from "../services/errors";

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

export default function SupplierForm({ supplier, onSaved, onCancel }) {
  const editing = Boolean(supplier);
  const [v, setV] = useState({
    name: supplier?.name ?? "",
    contact: supplier?.contact ?? "",
    phone: supplier?.phone ?? "",
    email: supplier?.email ?? "",
    gstin: supplier?.gstin ?? "",
    address: supplier?.address ?? "",
    notes: supplier?.notes ?? "",
    active: supplier?.active ?? true,
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setV((s) => ({ ...s, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  function validate() {
    const e = {};
    if (!v.name.trim()) e.name = "Supplier name is required.";
    else if (v.name.trim().length > 150) e.name = "Use 150 characters or fewer.";
    if (v.phone.trim() && !/^[0-9+ -]{7,15}$/.test(v.phone.trim())) e.phone = "7 to 15 digits; you may use + - and spaces.";
    if (v.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email.trim())) e.email = "Enter a valid email address.";
    if (v.gstin.trim() && !/^[0-9A-Z]{15}$/.test(v.gstin.trim().toUpperCase())) e.gstin = "GSTIN has 15 letters and digits.";
    if (v.address.length > 300) e.address = "Use 300 characters or fewer.";
    if (v.notes.length > 500) e.notes = "Use 500 characters or fewer.";
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
      if (editing) await updateSupplier(supplier.id, v);
      else await createSupplier(v);
      onSaved(editing ? "Supplier updated." : "Supplier added.");
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="s-name" label="Supplier name *" error={errors.name}>
          <input id="s-name" value={v.name} onChange={set("name")} className={inputCls} />
        </Field>
        <Field id="s-contact" label="Contact person">
          <input id="s-contact" value={v.contact} onChange={set("contact")} className={inputCls} />
        </Field>
        <Field id="s-phone" label="Phone" error={errors.phone}>
          <input id="s-phone" value={v.phone} onChange={set("phone")} className={inputCls} />
        </Field>
        <Field id="s-email" label="Email" error={errors.email}>
          <input id="s-email" value={v.email} onChange={set("email")} className={inputCls} />
        </Field>
        <Field id="s-gstin" label="GSTIN" error={errors.gstin} hint="Optional. 15 characters.">
          <input id="s-gstin" value={v.gstin} onChange={set("gstin")} className={inputCls} />
        </Field>
      </div>
      <Field id="s-address" label="Address" error={errors.address}>
        <textarea id="s-address" rows={2} value={v.address} onChange={set("address")} className={inputCls} />
      </Field>
      <Field id="s-notes" label="Notes" error={errors.notes}>
        <textarea id="s-notes" rows={2} value={v.notes} onChange={set("notes")} className={inputCls} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={v.active} onChange={set("active")} /> Active (inactive suppliers cannot get new orders)
      </label>

      {formError && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={busy} className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {editing ? "Save changes" : "Add supplier"}
        </button>
      </div>
    </form>
  );
}
