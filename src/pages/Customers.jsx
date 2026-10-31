import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, History, Loader2, Pencil, Plus, Search } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import {
  createCustomer, CUSTOMER_PAGE_SIZE, fetchCustomerSales, fetchCustomers, updateCustomer,
} from "../services/customerService";
import { friendlyError } from "../services/errors";
import { formatMoney } from "../utils/format";

const inputCls = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function CustomerForm({ customer, onSaved, onCancel }) {
  const editing = Boolean(customer);
  const [v, setV] = useState({ name: customer?.name ?? "", phone: customer?.phone ?? "", email: customer?.email ?? "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!v.name.trim()) return setError("Enter the customer's name.");
    if (v.name.trim().length > 120) return setError("The name is too long.");
    if (v.phone.trim() && !/^[0-9+ -]{7,15}$/.test(v.phone.trim())) return setError("Phone must be 7 to 15 digits (you may use + - and spaces).");
    if (v.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email.trim())) return setError("Enter a valid email address, or leave it empty.");
    setBusy(true);
    try {
      if (editing) await updateCustomer(customer.id, v);
      else await createCustomer(v);
      onSaved(editing ? "Customer updated." : "Customer added.");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <label className="block text-sm font-medium text-slate-700">Name *
        <input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={inputCls} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">Phone
          <input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} className={inputCls} />
        </label>
        <label className="block text-sm font-medium text-slate-700">Email
          <input value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} className={inputCls} />
        </label>
      </div>
      <p className="text-xs text-slate-500">Only contact details are stored. Do not record medical conditions here.</p>
      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={busy} className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? "Save changes" : "Add customer"}
        </button>
      </div>
    </form>
  );
}

function CustomerHistory({ customer }) {
  const [state, setState] = useState({ rows: [], loading: true, error: "" });

  useEffect(() => {
    let active = true;
    fetchCustomerSales(customer.id)
      .then((rows) => active && setState({ rows, loading: false, error: "" }))
      .catch((err) => active && setState({ rows: [], loading: false, error: friendlyError(err) }));
    return () => { active = false; };
  }, [customer.id]);

  if (state.loading) return <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>;
  if (state.error) return <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  if (state.rows.length === 0) return <p className="text-sm text-slate-500">No invoices you can see for this customer yet.</p>;
  return (
    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
      {state.rows.map((s) => (
        <li key={s.id} className="flex items-center justify-between px-3 py-2">
          <span><strong>{s.invoice}</strong> · {formatDateTime(s.at)}</span>
          <span className="font-medium">{formatMoney(s.totalPaise)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Customers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // { type: "form" | "history", customer }
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchCustomers({ page, search }));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(data.total / CUSTOMER_PAGE_SIZE));

  return (
    <>
      <PageHeader title="Customers" subtitle="Contact details of customers who asked to be recorded">
        <button onClick={() => { setNotice(""); setModal({ type: "form", customer: null }); }} className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
          <Plus className="h-4 w-4" /> Add customer
        </button>
      </PageHeader>

      {notice && <p role="status" className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={load} className="rounded border border-red-300 px-2 py-1 font-medium hover:bg-red-100">Retry</button>
        </div>
      )}

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name or phone" aria-label="Search customers" className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm" />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Phone</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500"><Loader2 className="mx-auto h-5 w-5 animate-spin" aria-label="Loading" /></td></tr>}
            {!loading && !error && data.rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">{search ? "No customers match your search." : "No customers yet. Add one here or while billing."}</td></tr>
            )}
            {!loading && data.rows.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                <td className="px-4 py-3">{c.phone || "—"}</td>
                <td className="px-4 py-3">{c.email || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setModal({ type: "history", customer: c })} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label={`Purchases of ${c.name}`} title="Purchase history"><History className="h-4 w-4" /></button>
                    <button onClick={() => { setNotice(""); setModal({ type: "form", customer: c }); }} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label={`Edit ${c.name}`} title="Edit"><Pencil className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <p>{data.total} customer{data.total === 1 ? "" : "s"}</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(page - 1)} disabled={page === 1} aria-label="Previous page" className="rounded-md border border-slate-300 bg-white p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <span>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} aria-label="Next page" className="rounded-md border border-slate-300 bg-white p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {modal?.type === "form" && (
        <Modal title={modal.customer ? "Edit customer" : "Add customer"} onClose={() => setModal(null)}>
          <CustomerForm customer={modal.customer} onSaved={(m) => { setModal(null); setNotice(m); load(); }} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === "history" && (
        <Modal title={`Purchases: ${modal.customer.name}`} onClose={() => setModal(null)}>
          <CustomerHistory customer={modal.customer} />
        </Modal>
      )}
    </>
  );
}
