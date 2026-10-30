import { useState } from "react";
import { Loader2 } from "lucide-react";
import { setBatchStatus } from "../services/stockService";
import { friendlyError } from "../services/errors";

const inputCls = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

function optionsFor(status) {
  if (status === "active") {
    return [
      ["quarantined", "Quarantine: stop selling, keep the stock"],
      ["disposed", "Dispose: remove the remaining units permanently"],
    ];
  }
  if (status === "quarantined") {
    return [
      ["active", "Release: make it sellable again"],
      ["disposed", "Dispose: remove the remaining units permanently"],
    ];
  }
  return [];
}

const DONE_TEXT = { quarantined: "quarantined", active: "released", disposed: "disposed" };

export default function BatchStatusForm({ batch, medicineName, onDone, onCancel }) {
  const options = optionsFor(batch.status);
  const [action, setAction] = useState(options[0]?.[0] ?? "");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (options.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">This batch has been disposed and can no longer be changed.</p>
        <div className="flex justify-end">
          <button onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Close</button>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (reason.trim().length < 3) return setError("A reason is required.");
    if (action === "disposed" && !confirmed) return setError("Tick the box to confirm the disposal.");
    setBusy(true);
    try {
      await setBatchStatus({ batchId: batch.id, status: action, reason: reason.trim() });
      onDone(`Batch ${batch.batchNo} ${DONE_TEXT[action]}.`);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <p className="text-sm text-slate-600">
        <strong>{medicineName}</strong>, batch <strong>{batch.batchNo}</strong> ({batch.qty} units, currently {batch.status}).
      </p>
      <div>
        <label htmlFor="bs-action" className="text-sm font-medium text-slate-700">Action *</label>
        <select id="bs-action" value={action} onChange={(e) => { setAction(e.target.value); setConfirmed(false); }} className={inputCls}>
          {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="bs-reason" className="text-sm font-medium text-slate-700">Reason *</label>
        <input id="bs-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Expired on shelf, recalled by supplier" className={inputCls} />
      </div>

      {action === "disposed" && (
        <label className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
          I understand this removes the remaining {batch.qty} units and cannot be undone. The disposal is kept in the inventory ledger.
        </label>
      )}

      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
        <button
          type="submit"
          disabled={busy}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
            action === "disposed" ? "bg-red-600 hover:bg-red-700" : "bg-brand-600 hover:bg-brand-700"
          }`}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Confirm
        </button>
      </div>
    </form>
  );
}
