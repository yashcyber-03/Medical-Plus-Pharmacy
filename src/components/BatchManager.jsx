import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { fetchMedicineBatches } from "../services/stockService";
import { friendlyError } from "../services/errors";
import { getBatchStatus } from "../utils/inventory";
import { formatDate, formatMoney } from "../utils/format";
import StatusBadge from "./StatusBadge";
import AdjustStockForm from "./AdjustStockForm";
import BatchStatusForm from "./BatchStatusForm";

// Shows every batch of one medicine. Admins can adjust, quarantine,
// release or dispose. The database enforces this too.
export default function BatchManager({ medicine, isAdmin, onChanged }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState(null); // { type: "adjust" | "status", batch }
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setBatches(await fetchMedicineBatches(medicine.id));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [medicine.id]);

  useEffect(() => {
    load();
  }, [load]);

  function done(message) {
    setView(null);
    setNotice(message);
    load();
    onChanged();
  }

  if (view?.type === "adjust") {
    return <AdjustStockForm batch={view.batch} medicineName={medicine.name} onDone={done} onCancel={() => setView(null)} />;
  }
  if (view?.type === "status") {
    return <BatchStatusForm batch={view.batch} medicineName={medicine.name} onDone={done} onCancel={() => setView(null)} />;
  }

  return (
    <div className="space-y-3">
      {notice && <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading batches…</p>
      ) : batches.length === 0 ? (
        <p className="text-sm text-slate-500">No batches yet for this medicine.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Batch</th>
                <th className="px-3 py-2 text-left font-medium">Expiry</th>
                <th className="px-3 py-2 text-right font-medium">Remaining / received</th>
                <th className="px-3 py-2 text-right font-medium">Cost / unit</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                {isAdmin && <th className="px-3 py-2 text-right font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batches.map((b) => (
                <tr key={b.id}>
                  <td className="px-3 py-2 font-medium text-slate-900">{b.batchNo}</td>
                  <td className="px-3 py-2">{formatDate(b.expiry)}</td>
                  <td className="px-3 py-2 text-right">{b.qty} / {b.received}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(b.costPaise)}</td>
                  <td className="px-3 py-2"><StatusBadge status={getBatchStatus(b)} /></td>
                  {isAdmin && (
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setNotice(""); setView({ type: "adjust", batch: b }); }}
                          disabled={b.status === "disposed"}
                          className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                        >
                          Adjust
                        </button>
                        <button
                          onClick={() => { setNotice(""); setView({ type: "status", batch: b }); }}
                          disabled={b.status === "disposed"}
                          className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                        >
                          Manage
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
