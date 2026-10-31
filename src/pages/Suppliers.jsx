import { useCallback, useEffect, useMemo, useState } from "react";
import { History, Loader2, Pencil, Plus, Search } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import SupplierForm from "../components/SupplierForm";
import { fetchPurchaseOrders, fetchSuppliedProducts, fetchSuppliers } from "../services/purchasingService";
import { friendlyError } from "../services/errors";
import { formatDate, formatMoney } from "../utils/format";

function SupplierHistory({ supplier }) {
  const [state, setState] = useState({ orders: [], products: [], loading: true, error: "" });

  useEffect(() => {
    let active = true;
    Promise.all([fetchPurchaseOrders({ supplierId: supplier.id }), fetchSuppliedProducts(supplier.id)])
      .then(([orders, products]) => active && setState({ orders: orders.rows, products, loading: false, error: "" }))
      .catch((err) => active && setState({ orders: [], products: [], loading: false, error: friendlyError(err) }));
    return () => { active = false; };
  }, [supplier.id]);

  if (state.loading) return <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>;
  if (state.error) return <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="mb-1 font-medium text-slate-900">Products ordered from this supplier</p>
        {state.products.length === 0 ? <p className="text-slate-500">None yet.</p> : (
          <p className="text-slate-700">{state.products.join(", ")}</p>
        )}
      </div>
      <div>
        <p className="mb-1 font-medium text-slate-900">Purchase history (latest 12)</p>
        {state.orders.length === 0 ? <p className="text-slate-500">No purchase orders yet.</p> : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {state.orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span><strong>{o.number}</strong> · {o.orderDate ? formatDate(o.orderDate) : "draft"}</span>
                <span className="flex items-center gap-3"><StatusBadge status={o.status} /> {formatMoney(o.totalPaise)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // { type: "form" | "history", supplier }
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSuppliers(await fetchSuppliers());
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) => [s.name, s.contact, s.phone, s.email].some((v) => v.toLowerCase().includes(q)));
  }, [suppliers, search]);

  function handleSaved(message) {
    setModal(null);
    setNotice(message);
    load();
  }

  return (
    <>
      <PageHeader title="Suppliers" subtitle="Companies you buy medicines from">
        <button onClick={() => { setNotice(""); setModal({ type: "form", supplier: null }); }} className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
          <Plus className="h-4 w-4" /> Add supplier
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
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, contact, phone or email" aria-label="Search suppliers" className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm" />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Supplier</th>
              <th className="px-4 py-3 text-left font-medium">Contact</th>
              <th className="px-4 py-3 text-left font-medium">Phone</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500"><Loader2 className="mx-auto h-5 w-5 animate-spin" aria-label="Loading" /></td></tr>}
            {!loading && !error && suppliers.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No suppliers yet. Use “Add supplier” to create the first one.</td></tr>
            )}
            {!loading && suppliers.length > 0 && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No suppliers match your search.</td></tr>
            )}
            {!loading && filtered.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{s.name}{s.gstin && <span className="ml-2 text-xs font-normal text-slate-500">GSTIN {s.gstin}</span>}</td>
                <td className="px-4 py-3">{s.contact || "—"}</td>
                <td className="px-4 py-3">{s.phone || "—"}</td>
                <td className="px-4 py-3">{s.email || "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={s.active ? "healthy" : "inactive"} /></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setModal({ type: "history", supplier: s })} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label={`History of ${s.name}`} title="Products and purchase history"><History className="h-4 w-4" /></button>
                    <button onClick={() => { setNotice(""); setModal({ type: "form", supplier: s }); }} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label={`Edit ${s.name}`} title="Edit"><Pencil className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal?.type === "form" && (
        <Modal title={modal.supplier ? "Edit supplier" : "Add supplier"} onClose={() => setModal(null)}>
          <SupplierForm supplier={modal.supplier} onSaved={handleSaved} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === "history" && (
        <Modal title={`History: ${modal.supplier.name}`} onClose={() => setModal(null)}>
          <SupplierHistory supplier={modal.supplier} />
        </Modal>
      )}
    </>
  );
}
