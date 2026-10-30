import { useState } from "react";
import { Loader2 } from "lucide-react";
import { adjustStock } from "../services/stockService";
import { friendlyError } from "../services/errors";

const REASONS = ["Damaged", "Lost or stolen", "Stock count correction", "Returned to supplier", "Other"];
const inputCls = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

export default function AdjustStockForm({ batch, medicineName, onDone, onCancel }) {
  const [change, setChange] = useState("");
  const [reasonType, setReasonType] = useState(REASONS[0]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const parsed = /^[+-]?\d{1,6}$/.test(change.trim()) ? parseInt(change.trim(), 10) : null;
  const preview = parsed !== null ? batch.qty + parsed : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (parsed === null || parsed === 0) return setError("Enter a whole number that is not zero, e.g. -5 or 3.");
    if (preview < 0) return setError(`This would make stock negative (current stock: ${batch.qty}).`);
    if (preview > batch.received) return setError(`Stock cannot exceed the quantity originally received (${batch.received}).`);
    if (reasonType === "Other" && note.trim().length < 3) return setError("Describe the reason in the note.");

    const reason = note.trim() ? `${reasonType}: ${note.trim()}` : reasonType;
    setBusy(true);
    try {
      await adjustStock({ batchId: batch.id, change: parsed, reason });
      onDone(`Stock adjusted for batch ${batch.batchNo}.`);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <p className="text-sm text-slate-600">
        <strong>{medicineName}</strong>, batch <strong>{batch.batchNo}</strong>. Current stock: <strong>{batch.qty}</strong> of {batch.received} received.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="adj-change" className="text-sm font-medium text-slate-700">Change in units *</label>
          <input id="adj-change" inputMode="numeric" value={change} onChange={(e) => setChange(e.target.value)} placeholder="-5 removes, 3 adds" className={inputCls} />
          {preview !== null && parsed !== 0 && (
            <p className="mt-1 text-xs text-slate-500">New stock would be {preview}.</p>
          )}
        </div>
        <div>
          <label htmlFor="adj-reason" className="text-sm font-medium text-slate-700">Reason *</label>
          <select id="adj-reason" value={reasonType} onChange={(e) => setReasonType(e.target.value)} className={inputCls}>
            {REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="adj-note" className="text-sm font-medium text-slate-700">Note {reasonType === "Other" ? "*" : "(optional)"}</label>
        <input id="adj-note" value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
      </div>

      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={busy} className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Save adjustment
        </button>
      </div>
    </form>
  );
}
