import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Pill, Boxes, AlertTriangle, Hourglass, Ban, IndianRupee, Receipt, ShoppingCart, BellRing, Loader2,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import SampleDataNote from "../components/SampleDataNote";
import { dailySales, monthlyPurchaseVsSales, recentTransactions } from "../data/sampleData";
import { useInventoryData } from "../hooks/useInventoryData";
import { getBatchStatus, getEligibleStock, getStockStatus } from "../utils/inventory";
import { formatMoney, formatDate } from "../utils/format";

export default function Dashboard() {
  const { medicines, batches, loading, error, reload } = useInventoryData();

  // Calculated from real database rows.
  const stats = useMemo(() => {
    const active = medicines.filter((m) => m.active);
    const lowStock = active.filter(
      (m) => getStockStatus(getEligibleStock(batches, m.id), m.reorder) !== "healthy"
    );
    const nearExpiry = batches.filter((b) => getBatchStatus(b) === "near-expiry");
    const expired = batches.filter((b) => getBatchStatus(b) === "expired");
    const units = batches
      .filter((b) => {
        const s = getBatchStatus(b);
        return s === "healthy" || s === "near-expiry";
      })
      .reduce((s, b) => s + b.qty, 0);
    return { products: active.length, units, lowStock, nearExpiry, expired };
  }, [medicines, batches]);

  const alertRows = useMemo(
    () =>
      [
        ...stats.expired.map((b) => ({ ...b, status: "expired" })),
        ...stats.nearExpiry.map((b) => ({ ...b, status: "near-expiry" })),
      ].slice(0, 5),
    [stats]
  );

  const nameOf = (id) => medicines.find((m) => m.id === id)?.name ?? "Unknown medicine";
  const todaySalesPaise = recentTransactions.reduce((s, t) => s + t.totalPaise, 0);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Overview of stock, expiry and sales">
        <Link to="/billing" className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
          <ShoppingCart className="h-4 w-4" /> New sale
        </Link>
        <Link to="/stock-alerts" className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <BellRing className="h-4 w-4" /> View alerts
        </Link>
      </PageHeader>

      <SampleDataNote>
        Medicine and stock figures come from the database. Sales charts and transactions are sample data until billing is built (Phase 5).
      </SampleDataNote>

      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={reload} className="rounded border border-red-300 px-2 py-1 font-medium hover:bg-red-100">Retry</button>
        </div>
      )}
      {loading && (
        <p className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading inventory…
        </p>
      )}
      {!loading && !error && medicines.length === 0 && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No medicines in the database yet. Load the seed data, or add medicines on the Medicines page.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Active medicines" value={stats.products} icon={Pill} />
        <StatCard label="Sellable units in stock" value={stats.units} hint="Excludes expired and quarantined batches" icon={Boxes} />
        <StatCard label="Low-stock medicines" value={stats.lowStock.length} hint="At or below reorder level" icon={AlertTriangle} tone="warning" />
        <StatCard label="Near-expiry batches" value={stats.nearExpiry.length} hint="Within 90 days" icon={Hourglass} tone="warning" />
        <StatCard label="Expired batches" value={stats.expired.length} hint="Need quarantine or disposal" icon={Ban} tone="danger" />
        <StatCard label="Today's sales (sample)" value={formatMoney(todaySalesPaise)} hint={`${recentTransactions.length} transactions`} icon={IndianRupee} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Daily sales, last 14 days (sample)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v / 100}`} />
                <Tooltip formatter={(v) => formatMoney(v)} />
                <Area type="monotone" dataKey="sales" name="Sales" stroke="#059669" fill="#d1fae5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Purchases vs sales, monthly (sample)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyPurchaseVsSales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}k`} />
                <Tooltip formatter={(v) => formatMoney(v)} />
                <Legend />
                <Bar dataKey="purchases" name="Purchases" fill="#94a3b8" />
                <Bar dataKey="sales" name="Sales" fill="#059669" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white">
          <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">Expiry alerts</h2>
          {alertRows.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No batches need attention.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {alertRows.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{nameOf(b.medicineId)}</p>
                    <p className="text-xs text-slate-500">
                      Batch {b.batchNo} · {b.qty} units · expires {formatDate(b.expiry)}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white">
          <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">Recent transactions (sample)</h2>
          <ul className="divide-y divide-slate-100">
            {recentTransactions.map((t) => (
              <li key={t.invoice} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <Receipt className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900">{t.invoice}</p>
                    <p className="text-xs text-slate-500">
                      {t.customer} · {t.items} items · {t.method} · {t.time}
                    </p>
                  </div>
                </div>
                <p className="font-medium text-slate-900">{formatMoney(t.totalPaise)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
