import { useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import SampleDataNote from "../components/SampleDataNote";
import { medicines, batches, categories } from "../data/sampleData";
import { getEligibleStock, getStockStatus } from "../utils/inventory";
import { formatMoney } from "../utils/format";

const PAGE_SIZE = 8;

export default function Medicines() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [page, setPage] = useState(1);

  // Add stock + status to each medicine
  const rows = useMemo(
    () =>
      medicines.map((m) => {
        const stock = getEligibleStock(batches, m.id);
        const stockStatus = m.active ? getStockStatus(stock, m.reorder) : "inactive";
        return { ...m, stock, stockStatus };
      }),
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((m) => {
      const matchesText =
        !q ||
        [m.name, m.brand, m.generic, m.id].some((v) => v.toLowerCase().includes(q));
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

  const SortHeader = ({ k, children, className = "" }) => (
    <th className={`px-4 py-3 text-left font-medium ${className}`}>
      <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-slate-900">
        {children} <ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  );

  const inputCls = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";

  return (
    <>
      <PageHeader title="Medicines" subtitle="Search, filter and sort the medicine catalogue" />
      <SampleDataNote>
        Sample catalogue. Add, edit and real stock come in Phases 3 and 4.
      </SampleDataNote>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={onFilterChange(setQuery)}
            placeholder="Search by name, brand, generic or ID"
            aria-label="Search medicines"
            className={`${inputCls} w-full pl-9`}
          />
        </div>
        <select value={category} onChange={onFilterChange(setCategory)} aria-label="Filter by category" className={inputCls}>
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
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
                  <p className="text-xs text-slate-500">{m.brand} · {m.generic} · {m.id}</p>
                </td>
                <td className="px-4 py-3">{m.category}</td>
                <td className="px-4 py-3">{m.form} {m.strength !== "-" && `· ${m.strength}`}</td>
                <td className="px-4 py-3 text-right">{formatMoney(m.sellingPaise)}</td>
                <td className="px-4 py-3 text-right">
                  {m.stock} <span className="text-xs text-slate-400">/ min {m.reorder}</span>
                </td>
                <td className="px-4 py-3"><StatusBadge status={m.stockStatus} /></td>
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
    </>
  );
}
