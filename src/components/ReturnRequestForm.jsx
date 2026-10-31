import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { fetchSaleForReturn, requestReturn } from "../services/returnsService";
import { friendlyError } from "../services/errors";
import { pctOf } from "../utils/billing";
import { formatDate, formatMoney } from "../utils/format";

const inputCls = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";

function refundFor(line, qty) {
  const portion = line.unitPaise * qty;
  const disc = pctOf(portion, Math.round(line.discountPercent * 100));
  const taxable = portion - disc;
  return taxable + pctOf(taxable, Math.round(line.gstPercent * 100));
}

// Step 1: find the invoice. Step 2: choose what comes back and why.
export default function ReturnRequestForm({ onSaved, onCancel }) {
  const [invoiceInput, setInvoiceInput] = useState("");
  const [sale, setSale] = useState(null);
  const [finding, setFinding] = useState(false);
  const [findError, setFindError] = useState("");
  const [qty, setQty] = useState({});
  const [cond, setCond] = useState({});
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // One key per form: submitting twice cannot create two return requests.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  async function handleFind(e) {
    e.preventDefault();
    setFindError("");
    setSale(null);
    setQty({});
    setCond({});
    if (!invoiceInput.trim()) return setFindError("Enter an invoice number, e.g. INV-0000001.");
    setFinding(true);
    try {
      const found = await fetchSaleForReturn(invoiceInput);
      if (!found) setFindError("Invoice not found. Check the number. Staff can only return their own sales.");
      else setSale(found);
    } catch (err) {
      setFindError(friendlyError(err));
    } finally {
      setFinding(false);
    }
  }

  const parsed = (sale?.lines ?? []).map((l) => {
    const raw = (qty[l.allocationId] ?? "").trim();
    const n = /^\d{1,6}$/.test(raw) ? parseInt(raw, 10) : raw === "" ? 0 : null;
    return { line: l, n };
  });
  const refundEstimate = parsed.reduce((s, p) => (p.n ? s + refundFor(p.line, p.n) : s), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const chosen = parsed.filter((p) => p.n !== 0);
    if (chosen.length === 0) return setError("Enter how many units are being returned.");
    for (const p of chosen) {
      if (p.n === null || p.n < 1) return setError(`${p.line.medicine}: enter a whole number of 1 or more.`);
      if (p.n > p.line.returnable) return setError(`${p.line.medicine} (batch ${p.line.batchNo}): only ${p.line.returnable} can still be returned.`);
    }
    if (reason.trim().length < 3) return setError("Give a reason for the return.");

    setBusy(true);
    try {
      await requestReturn({
        idempotencyKey,
        saleId: sale.id,
        lines: chosen.map((p) => ({
          allocationId: p.line.allocationId,
          quantity: p.n,
          condition: cond[p.line.allocationId] ?? "resaleable",
        })),
        reason: reason.trim(),
      });
      onSaved("Return requested. An administrator must approve it before anything changes.");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleFind} className="flex flex-wrap items-end gap-2">
        <label className="flex-1 text-sm font-medium text-slate-700">Invoice number
          <input value={invoiceInput} onChange={(e) => setInvoiceInput(e.target.value)} placeholder="INV-0000001" className={`${inputCls} mt-1 w-full`} />
        </label>
        <button type="submit" disabled={finding} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
          {finding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Find invoice
        </button>
      </form>
      {findError && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{findError}</p>}

      {sale && (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <p className="text-sm text-slate-600">
            <strong>{sale.invoice}</strong> · {formatDate(sale.at.slice(0, 10))} · {sale.customerName || "Walk-in customer"}
          </p>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Medicine / batch</th>
                  <th className="px-3 py-2 text-right font-medium">Sold</th>
                  <th className="px-3 py-2 text-right font-medium">Can return</th>
                  <th className="px-3 py-2 text-left font-medium">Return qty</th>
                  <th className="px-3 py-2 text-left font-medium">Condition</th>
                  <th className="px-3 py-2 text-right font-medium">Refund</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsed.map(({ line, n }) => (
                  <tr key={line.allocationId}>
                    <td className="px-3 py-2"><p className="font-medium text-slate-900">{line.medicine}</p><p className="text-xs text-slate-500">Batch {line.batchNo}</p></td>
                    <td className="px-3 py-2 text-right">{line.sold}</td>
                    <td className="px-3 py-2 text-right">{line.returnable}</td>
                    <td className="px-3 py-2">
                      <input
                        value={qty[line.allocationId] ?? ""}
                        onChange={(e) => setQty((q) => ({ ...q, [line.allocationId]: e.target.value }))}
                        disabled={line.returnable === 0}
                        inputMode="numeric"
                        aria-label={`Return quantity, ${line.medicine} batch ${line.batchNo}`}
                        className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={cond[line.allocationId] ?? "resaleable"}
                        onChange={(e) => setCond((c) => ({ ...c, [line.allocationId]: e.target.value }))}
                        disabled={line.returnable === 0}
                        aria-label={`Condition, ${line.medicine} batch ${line.batchNo}`}
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
                      >
                        <option value="resaleable">Resaleable</option>
                        <option value="damaged">Damaged</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-right">{n ? formatMoney(refundFor(line, n)) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <label className="block text-sm font-medium text-slate-700">Reason for the return *
            <input value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Wrong medicine dispensed" className={`${inputCls} mt-1 w-full`} />
          </label>

          <p className="text-sm text-slate-700">Estimated refund (including GST): <strong>{formatMoney(refundEstimate)}</strong></p>
          <p className="rounded-md bg-sky-50 px-3 py-2 text-xs text-sky-800">
            Nothing changes until an administrator approves. Only units marked resaleable from a batch that is still active and unexpired go back into stock. The database works out the final refund.
          </p>

          {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={busy} className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Request return
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
