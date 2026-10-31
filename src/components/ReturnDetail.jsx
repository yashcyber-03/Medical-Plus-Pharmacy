import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { approveReturn, fetchReturnDetail, recordRefund, rejectReturn } from "../services/returnsService";
import { friendlyError } from "../services/errors";
import { paymentLabel, PAYMENT_METHODS } from "../utils/billing";
import { formatMoney } from "../utils/format";
import StatusBadge from "./StatusBadge";

const REFUND_BADGE = { none: "refund_none", due: "refund_due", refunded: "refunded" };

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function restockText(restocked) {
  if (restocked === null) return "Decided on approval";
  return restocked ? "Back in stock" : "Not restocked";
}

export default function ReturnDetail({ returnId, isAdmin, onChanged }) {
  const [ret, setRet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [panel, setPanel] = useState(null); // approve | reject | refund
  const [note, setNote] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRet(await fetchReturnDetail(returnId));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [returnId]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action, message) {
    setBusy(true);
    setError("");
    try {
      await action();
      setPanel(null);
      setNote("");
      setReference("");
      setNotice(message);
      await load();
      onChanged();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !ret) return <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>;
  if (!ret) return <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error || "Return not found."}</p>;

  const btn = "rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

  return (
    <div className="space-y-4 text-sm">
      {notice && <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-red-700">{error}</p>}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-slate-900">{ret.number}</p>
          <p className="text-slate-600">Invoice {ret.invoice}{ret.customerName && ` · ${ret.customerName}`}</p>
          <p className="text-xs text-slate-500">Requested {formatDateTime(ret.requestedAt)}{ret.requestedBy && ` by ${ret.requestedBy}`}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2"><span className="text-xs text-slate-500">Approval</span><StatusBadge status={ret.approval} /></div>
          <div className="flex items-center gap-2"><span className="text-xs text-slate-500">Refund</span><StatusBadge status={REFUND_BADGE[ret.refund]} /></div>
        </div>
      </div>

      <p className="rounded-md bg-slate-50 px-3 py-2 text-slate-700"><strong>Reason:</strong> {ret.reason}</p>
      {ret.decisionNote && <p className="rounded-md bg-slate-50 px-3 py-2 text-slate-700"><strong>Decision note:</strong> {ret.decisionNote}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Medicine / batch</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-left font-medium">Condition</th>
              <th className="px-3 py-2 text-left font-medium">Stock</th>
              <th className="px-3 py-2 text-right font-medium">Refund</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ret.items.map((i) => (
              <tr key={i.id}>
                <td className="px-3 py-2"><p className="font-medium text-slate-900">{i.medicine}</p><p className="text-xs text-slate-500">Batch {i.batchNo}</p></td>
                <td className="px-3 py-2 text-right">{i.qty}</td>
                <td className="px-3 py-2 capitalize">{i.condition}</td>
                <td className="px-3 py-2">{restockText(i.restocked)}</td>
                <td className="px-3 py-2 text-right">{formatMoney(i.refundPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-right font-medium text-slate-900">Refund total (incl. GST): {formatMoney(ret.refundPaise)}</p>

      {ret.refund === "refunded" && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-800">
          Refund recorded as <strong>{paymentLabel(ret.refundMethod)}</strong>{ret.refundReference && ` (ref: ${ret.refundReference})`} on {formatDateTime(ret.refundedAt)}
          {ret.refundedBy && ` by ${ret.refundedBy}`}. This is a record only; no payment was verified.
        </p>
      )}

      {isAdmin && ret.approval === "pending" && panel === null && (
        <div className="flex justify-end gap-2">
          <button onClick={() => setPanel("reject")} className={`${btn} text-red-700`}>Reject</button>
          <button onClick={() => setPanel("approve")} className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">Approve</button>
        </div>
      )}
      {isAdmin && ret.approval === "approved" && ret.refund === "due" && panel === null && (
        <div className="flex justify-end">
          <button onClick={() => setPanel("refund")} className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">Record refund</button>
        </div>
      )}

      {panel === "approve" && (
        <div className="rounded-md bg-amber-50 p-3 text-amber-900">
          <p>Approve {ret.number}? Resaleable units from active, unexpired batches go back into stock. Damaged units and units from expired, quarantined or disposed batches do not. This cannot be undone.</p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => run(() => approveReturn(returnId), "Return approved. Eligible units are back in stock.")} disabled={busy} className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">Confirm approval</button>
            <button onClick={() => setPanel(null)} className={btn}>Back</button>
          </div>
        </div>
      )}
      {panel === "reject" && (
        <div className="space-y-2 rounded-md bg-red-50 p-3">
          <label className="block font-medium text-red-900">Reason for rejecting
            <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-slate-900" />
          </label>
          <div className="flex gap-2">
            <button onClick={() => run(() => rejectReturn(returnId, note.trim()), "Return rejected.")} disabled={busy || note.trim().length < 3} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">Confirm rejection</button>
            <button onClick={() => setPanel(null)} className={btn}>Back</button>
          </div>
        </div>
      )}
      {panel === "refund" && (
        <div className="space-y-2 rounded-md bg-slate-50 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Refund method
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                {PAYMENT_METHODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Reference (optional)
              <input value={reference} maxLength={60} onChange={(e) => setReference(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
          </div>
          <p className="text-xs text-slate-500">This only records that {formatMoney(ret.refundPaise)} was handed back. It does not send or verify any payment.</p>
          <div className="flex gap-2">
            <button onClick={() => run(() => recordRefund(returnId, method, reference.trim()), "Refund recorded.")} disabled={busy} className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">Record refund</button>
            <button onClick={() => setPanel(null)} className={btn}>Back</button>
          </div>
        </div>
      )}
    </div>
  );
}
