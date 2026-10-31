import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import ReturnRequestForm from "../components/ReturnRequestForm";
import ReturnDetail from "../components/ReturnDetail";
import { useAuth } from "../context/AuthContext";
import { fetchReturns, RETURN_PAGE_SIZE } from "../services/returnsService";
import { friendlyError } from "../services/errors";
import { formatMoney } from "../utils/format";

const REFUND_BADGE = { none: "refund_none", due: "refund_due", refunded: "refunded" };
const selectCls = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function Returns() {
  const { isAdmin } = useAuth();
  const [approval, setApproval] = useState("");
  const [refund, setRefund] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // { type: "new" } | { type: "detail", id }
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchReturns({ page, approval, refund }));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [page, approval, refund]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(data.total / RETURN_PAGE_SIZE));

  return (
    <>
      <PageHeader title="Sales returns" subtitle="Returns are requested against an invoice and approved by an administrator">
        <button onClick={() => { setNotice(""); setModal({ type: "new" }); }} className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
          <Plus className="h-4 w-4" /> New return
        </button>
      </PageHeader>

      {notice && <p role="status" className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={load} className="rounded border border-red-300 px-2 py-1 font-medium hover:bg-red-100">Retry</button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <select value={approval} onChange={(e) => { setApproval(e.target.value); setPage(1); }} aria-label="Filter by approval status" className={selectCls}>
          <option value="">All approval statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={refund} onChange={(e) => { setRefund(e.target.value); setPage(1); }} aria-label="Filter by refund status" className={selectCls}>
          <option value="">All refund statuses</option>
          <option value="due">Refund due</option>
          <option value="refunded">Refunded</option>
          <option value="none">No refund</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Return</th>
              <th className="px-4 py-3 text-left font-medium">Invoice</th>
              <th className="px-4 py-3 text-left font-medium">Requested</th>
              <th className="px-4 py-3 text-left font-medium">Reason</th>
              <th className="px-4 py-3 text-left font-medium">Approval</th>
              <th className="px-4 py-3 text-left font-medium">Refund</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500"><Loader2 className="mx-auto h-5 w-5 animate-spin" aria-label="Loading" /></td></tr>}
            {!loading && !error && data.rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No returns yet. Use “New return” and enter an invoice number.</td></tr>
            )}
            {!loading && data.rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{r.number}</td>
                <td className="px-4 py-3">{r.invoice}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(r.at)}{isAdmin && <span className="block text-xs text-slate-400">{r.by}</span>}</td>
                <td className="max-w-[220px] truncate px-4 py-3 text-slate-600" title={r.reason}>{r.reason}</td>
                <td className="px-4 py-3"><StatusBadge status={r.approval} /></td>
                <td className="px-4 py-3"><StatusBadge status={REFUND_BADGE[r.refund]} /></td>
                <td className="px-4 py-3 text-right font-medium">{formatMoney(r.refundPaise)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { setNotice(""); setModal({ type: "detail", id: r.id }); }} className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Open</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <p>{data.total} return{data.total === 1 ? "" : "s"}</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(page - 1)} disabled={page === 1} aria-label="Previous page" className="rounded-md border border-slate-300 bg-white p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <span>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} aria-label="Next page" className="rounded-md border border-slate-300 bg-white p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {modal?.type === "new" && (
        <Modal wide title="New return" onClose={() => setModal(null)}>
          <ReturnRequestForm onSaved={(message) => { setModal(null); setNotice(message); load(); }} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === "detail" && (
        <Modal wide title="Return" onClose={() => setModal(null)}>
          <ReturnDetail returnId={modal.id} isAdmin={isAdmin} onChanged={load} />
        </Modal>
      )}
    </>
  );
}
