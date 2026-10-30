import { useMemo, useState } from "react";
import {
  Search, ChevronLeft, ChevronRight, ArrowUpDown, Plus, Pencil, PackagePlus, Loader2,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import MedicineForm from "../components/MedicineForm";
import AddBatchForm from "../components/AddBatchForm";
import { useInventoryData } from "../hooks/useInventoryData";
import { useAuth } from "../context/AuthContext";
import { getEligibleStock, getStockStatus } from "../utils/inventory";
import { formatMoney } from "../utils/format";

const PAGE_SIZE = 8;

export default function Medicines() {
  const { isAdmin } = useAuth();
  const { medicines, categories, batches, loading, error, reload } = useInventoryData();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // { type: "medicine" | "batch", medicine }
  const [notice, setNotice] = useState("");

  const rows = useMemo(
    () =>
      medicines.map((m) => {
        const stock = getEligibleStock(batches, m.id);
        const stockStatus = m.active ? getStockStatus(stock, m.reorder) : "inactive";
        return { ...m, stock, stockStatus };
      }),
    [medicines, batches]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((m) => {
      const matchesText =
        !q ||
        [m.name, m.brand, m.generic, m.code, m.barcode].some((v) => (v ?? "").toLowerCase().includes(q));
      const matchesCategory = category === "all" || m.category === category;
      const matchesStatus = status === "all" || m.stockStatus === status;
      return matchesText && matchesCategory && matchesStatus;
    });
    list.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [rows, query, category, status, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }
  function onFilterChange(setter) {
    return (e) => {
      setter(e.target.value);
      setPage(1);
    };
  }
  function openModal(next) {
    setNotice("");
    setModal(next);
  }
  function handleSaved(message) {
    setModal(null);
    setNotice(message);
    reload();
  }

  const SortHeader = ({ k, children, className = "" }) => (
    <th className={`px-4 py-3 text-left font-medium ${className}`}>
      <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-slate-900">
        {children} <ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  );

  const inputCls = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";
  const colCount = isAdmin ? 7 : 6;

  return (
    <>
      <PageHeader title="Medicines" subtitle="Search, filter and manage the medicine catalogue">
        {isAdmin && (
          <button
            onClick={() => openModal({ type: "medicine", medicine: null })}
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> Add medicine
          </button>
        )}
      </PageHeader>

      {notice && (
        <p role="status" className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>
      )}

      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={reload} className="rounded border border-red-300 px-2 py-1 font-medium hover:bg-red-100">Retry</button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={onFilterChange(setQuery)}
            placeholder="Search by name, brand, generic, code or barcode"
            aria-label="Search medicines"
            className={`${inputCls} w-full pl-9`}
          />
        </div>
        <select value={category} onChange={onFilterChange(setCategory)} aria-label="Filter by category" className={inputCls}>
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
        <select value={status} onChange={onFilterChange(setStatus)} aria-label="Filter by stock status" className={inputCls}>
          <option value="all">All stock statuses</option>
          <option value="healthy">Healthy</option>
          <option value="low-stock">Low stock</option>
          <option value="out-of-stock">Out of stock</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <SortHeader k="name">Medicine</SortHeader>
              <SortHeader k="category">Category</SortHeader>
              <th className="px-4 py-3 text-left font-medium">Form</th>
              <SortHeader k="sellingPaise" className="text-right">Price</SortHeader>
              <SortHeader k="stock" className="text-right">Eligible stock</SortHeader>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              {isAdmin && <th className="px-4 py-3 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && medicines.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-4 py-10 text-center text-slate-500">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" aria-label="Loading" />
                </td>
              </tr>
            )}
            {!loading && !error && medicines.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-4 py-10 text-center text-slate-500">
                  No medicines yet.{isAdmin ? " Use “Add medicine” to create the first one." : " Ask an administrator to add medicines."}
                </td>
              </tr>
            )}
            {!loading && medicines.length > 0 && pageRows.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-4 py-10 text-center text-slate-500">
                  No medicines match these filters. Try clearing the search.
                </td>
              </tr>
            )}
            {pageRows.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">
                    {m.name}
                    {m.rx && <span className="ml-2 rounded bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-800">Rx</span>}
                  </p>
                  <p className="text-xs text-slate-500">
                    {[m.brand, m.generic, m.code].filter(Boolean).join(" · ")}
                  </p>
                </td>
                <td className="px-4 py-3">{m.category}</td>
                <td className="px-4 py-3">{m.form}{m.strength !== "-" && ` · ${m.strength}`}</td>
                <td className="px-4 py-3 text-right">{formatMoney(m.sellingPaise)}</td>
                <td className="px-4 py-3 text-right">
                  {m.stock} <span className="text-xs text-slate-400">/ min {m.reorder}</span>
                </td>
                <td className="px-4 py-3"><StatusBadge status={m.stockStatus} /></td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openModal({ type: "medicine", medicine: m })}
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        aria-label={`Edit ${m.name}`}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openModal({ type: "batch", medicine: m })}
                        disabled={!m.active}
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
                        aria-label={`Add stock for ${m.name}`}
                        title={m.active ? "Add stock" : "Inactive medicines cannot receive stock"}
                      >
                        <PackagePlus className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <p>{filtered.length} medicine{filtered.length === 1 ? "" : "s"}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
            className="rounded-md border border-slate-300 bg-white p-1.5 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
            className="rounded-md border border-slate-300 bg-white p-1.5 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {modal?.type === "medicine" && (
        <Modal title={modal.medicine ? "Edit medicine" : "Add medicine"} onClose={() => setModal(null)}>
          <MedicineForm
            medicine={modal.medicine}
            categories={categories}
            onSaved={handleSaved}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.type === "batch" && (
        <Modal title="Add stock batch" onClose={() => setModal(null)}>
          <AddBatchForm medicine={modal.medicine} onSaved={handleSaved} onCancel={() => setModal(null)} />
        </Modal>
      )}
    </>
  );
}
