import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Printer, Search } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import Receipt from "../components/Receipt";
import { fetchSaleDetail, fetchSales, fetchSettings, SALES_PAGE_SIZE } from "../services/salesService";
import { friendlyError } from "../services/errors";
import { paymentLabel } from "../utils/billing";
import { formatMoney, todayIso } from "../utils/format";

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function Invoices() {
  const [search, setSearch] = useState("");
  const [dateIso, setDateIso] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState(null);
  const [detail, setDetail] = useState(null);
  const [opening, setOpening] = useState("");

  useEffect(() => {
    fetchSettings().then(setSettings).catch(() => setSettings(null));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchSales({ page, search, dateIso }));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, dateIso]);

  // Wait briefly after typing so we don't query on every key press
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  async function openInvoice(id) {
    setOpening(id);
    setError("");
    try {
      setDetail(await fetchSaleDetail(id));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setOpening("");
    }
  }

  const totalPages = Math.max(1, Math.ceil(data.total / SALES_PAGE_SIZE));
  const inputCls = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";

  return (
    <>
      <PageHeader title="Invoices" subtitle="Search past bills and reprint receipts" />

      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={load} className="rounded border border-red-300 px-2 py-1 font-medium hover:bg-red-100">Retry</button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by invoice number or customer name"
            aria-label="Search invoices"
            className={`${inputCls} w-full pl-9`}
          />
        </div>
        <input type="date" value={dateIso} max={todayIso()} onChange={(e) => { setDateIso(e.target.value); setPage(1); }} aria-label="Filter by date" className={inputCls} />
        <button onClick={() => { setDateIso(todayIso()); setPage(1); }} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Today</button>
        {dateIso && (
          <button onClick={() => { setDateIso(""); setPage(1); }} className="text-sm font-medium text-brand-700 hover:underline">All dates</button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Invoice</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Customer</th>
              <th className="px-4 py-3 text-right font-medium">Units</th>
              <th className="px-4 py-3 text-left font-medium">Payment</th>
              <th className="px-4 py-3 text-left font-medium">Cashier</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500"><Loader2 className="mx-auto h-5 w-5 animate-spin" aria-label="Loading" /></td></tr>
            )}
            {!loading && !error && data.rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No invoices found. Completed sales appear here.</td></tr>
            )}
            {!loading && data.rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{r.invoice}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(r.at)}</td>
                <td className="px-4 py-3">{r.customerName}</td>
                <td className="px-4 py-3 text-right">{r.units}</td>
                <td className="px-4 py-3">{paymentLabel(r.method)}</td>
                <td className="px-4 py-3 text-slate-600">{r.cashier}</td>
                <td className="px-4 py-3 text-right font-medium">{formatMoney(r.totalPaise)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openInvoice(r.id)} disabled={opening === r.id} className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    {opening === r.id ? "Opening…" : "View"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <p>{data.total} invoice{data.total === 1 ? "" : "s"}</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(page - 1)} disabled={page === 1} aria-label="Previous page" className="rounded-md border border-slate-300 bg-white p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <span>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} aria-label="Next page" className="rounded-md border border-slate-300 bg-white p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {detail && (
        <Modal title={`Invoice ${detail.invoice}`} onClose={() => setDetail(null)}>
          <Receipt sale={detail} settings={settings} />
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Printer className="h-4 w-4" /> Print
            </button>
            <button onClick={() => setDetail(null)} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Close</button>
          </div>
        </Modal>
      )}
    </>
  );
}
