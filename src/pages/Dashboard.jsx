import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Pill, Boxes, AlertTriangle, Hourglass, Ban, IndianRupee, Receipt, ShoppingCart, BellRing, Loader2,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import StatCard from "../components/StatCard";
import WeekStrip from "../components/WeekStrip";
import AlertsPanel from "../components/AlertsPanel";
import { useInventoryData } from "../hooks/useInventoryData";
import { useSalesSummary } from "../hooks/useSalesSummary";
import { useMonthlyTrend } from "../hooks/useMonthlyTrend";
import { useAuth } from "../context/AuthContext";
import { getBatchStatus, getEligibleStock, getStockStatus } from "../utils/inventory";
import { formatMoney, formatDate } from "../utils/format";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { isAdmin, profile, session } = useAuth();
  const { medicines, batches, loading, error, reload } = useInventoryData();
  const sales = useSalesSummary();
  const trend = useMonthlyTrend(isAdmin);

  const firstName =
    (profile?.full_name || profile?.email || session?.user?.email || "").split(/[\s@]/)[0] || "there";

  // Everything below is calculated from real database rows.
  const stats = useMemo(() => {
    const active = medicines.filter((m) => m.active);
    const withStock = active.map((m) => {
      const stock = getEligibleStock(batches, m.id);
      return { m, stock, status: getStockStatus(stock, m.reorder) };
    });
    const lowStock = withStock.filter((x) => x.status !== "healthy").sort((a, b) => a.stock - b.stock);
    const nearExpiry = batches.filter((b) => getBatchStatus(b) === "near-expiry");
    const expired = batches.filter((b) => getBatchStatus(b) === "expired");
    const units = batches
      .filter((b) => {
        const s = getBatchStatus(b);
        return s === "healthy" || s === "near-expiry";
      })
      .reduce((s, b) => s + b.qty, 0);
    const out = withStock.filter((x) => x.status === "out-of-stock").length;
    const low = withStock.filter((x) => x.status === "low-stock").length;
    return {
      products: active.length, units, lowStock, nearExpiry, expired,
      health: { healthy: active.length - out - low, low, out },
    };
  }, [medicines, batches]);

  const nameOf = (id) => medicines.find((m) => m.id === id)?.name ?? "Unknown medicine";

  const expiryRows = useMemo(
    () =>
      [...stats.expired.map((b) => ({ ...b, status: "expired" })), ...stats.nearExpiry.map((b) => ({ ...b, status: "near-expiry" }))].map((b) => ({
        id: b.id,
        title: nameOf(b.medicineId),
        subtitle: `Batch ${b.batchNo} · ${b.qty} units · expires ${formatDate(b.expiry)}`,
        status: b.status,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stats, medicines]
  );
  const lowRows = stats.lowStock.map(({ m, stock, status }) => ({
    id: m.id,
    title: m.name,
    subtitle: `${stock} left · reorder at ${m.reorder}`,
    status,
  }));

  const attention = stats.lowStock.length + stats.nearExpiry.length + stats.expired.length;
  const healthTotal = stats.health.healthy + stats.health.low + stats.health.out;
  const pct = (n) => (healthTotal > 0 ? (n / healthTotal) * 100 : 0);

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <div className="space-y-5 xl:col-span-2">
        {/* Hero banner */}
        <section className="rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-950 p-6 text-white shadow-sm sm:p-8">
          <p className="text-sm text-emerald-200">{greeting()}, {firstName}</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
            {isAdmin ? "Today's" : "Your"} sales: {formatMoney(sales.todayTotal)}
          </h1>
          <p className="mt-2 text-sm text-emerald-100/90">
            {sales.todayCount} transaction{sales.todayCount === 1 ? "" : "s"} so far.{" "}
            {attention > 0
              ? `${attention} stock item${attention === 1 ? "" : "s"} need${attention === 1 ? "s" : ""} attention.`
              : "Stock looks healthy."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/billing" className="inline-flex items-center gap-2 rounded-xl bg-orange-400 px-4 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-orange-300">
              <ShoppingCart className="h-4 w-4" aria-hidden="true" /> New sale
            </Link>
            <Link to="/stock-alerts" className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10">
              <BellRing className="h-4 w-4" aria-hidden="true" /> View alerts
            </Link>
          </div>
        </section>

        {error && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            <span>{error}</span>
            <button onClick={reload} className="rounded border border-red-300 px-2 py-1 font-medium hover:bg-red-100">Retry</button>
          </div>
        )}
        {sales.error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">Sales could not be loaded: {sales.error}</p>}
        {loading && (
          <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading inventory…</p>
        )}
        {!loading && !error && medicines.length === 0 && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No medicines in the database yet. Load the seed data, or add medicines on the Medicines page.
          </p>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Active medicines" value={stats.products} icon={Pill} />
          <StatCard label="Sellable units in stock" value={stats.units} hint="Excludes expired and quarantined batches" icon={Boxes} />
          <StatCard label="Low-stock medicines" value={stats.lowStock.length} hint="At or below reorder level" icon={AlertTriangle} tone="warning" />
          <StatCard label="Near-expiry batches" value={stats.nearExpiry.length} hint="Within 90 days" icon={Hourglass} tone="warning" />
          <StatCard label="Expired batches" value={stats.expired.length} hint="Need quarantine or disposal" icon={Ban} tone="danger" />
          <StatCard label={isAdmin ? "Today's sales" : "Your sales today"} value={formatMoney(sales.todayTotal)} hint={`${sales.todayCount} transaction${sales.todayCount === 1 ? "" : "s"}`} icon={IndianRupee} />
        </div>

        {/* Charts */}
        <div className={`grid gap-5 ${isAdmin ? "md:grid-cols-2" : ""}`}>
          <section className="glass-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Daily sales, last 14 days</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sales.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v / 100}`} />
                  <Tooltip formatter={(v) => formatMoney(v)} />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#059669" fill="#a7f3d0" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {isAdmin && (
            <section className="glass-card p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Net sales vs purchases, monthly</h2>
              {trend.error && <p role="alert" className="mb-2 text-xs text-red-600">{trend.error}</p>}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}k`} />
                    <Tooltip formatter={(v) => formatMoney(v)} />
                    <Legend />
                    <Bar dataKey="purchases" name="Purchases" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="sales" name="Net sales" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
        </div>

        {/* Stock health */}
        <section className="glass-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Stock health</h2>
          {healthTotal === 0 ? (
            <p className="text-sm text-slate-500">No active medicines yet.</p>
          ) : (
            <>
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${stats.health.healthy} healthy, ${stats.health.low} low stock, ${stats.health.out} out of stock`}>
                <div className="bg-emerald-500" style={{ width: `${pct(stats.health.healthy)}%` }} />
                <div className="bg-amber-400" style={{ width: `${pct(stats.health.low)}%` }} />
                <div className="bg-slate-400" style={{ width: `${pct(stats.health.out)}%` }} />
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
                <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Healthy {stats.health.healthy}</li>
                <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Low stock {stats.health.low}</li>
                <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Out of stock {stats.health.out}</li>
              </ul>
            </>
          )}
        </section>
      </div>

      {/* Right column */}
      <aside className="space-y-5">
        <WeekStrip daily={sales.daily} />
        <AlertsPanel expiry={expiryRows} lowStock={lowRows} />

        <section className="glass-card">
          <h2 className="border-b border-white/70 px-5 py-4 text-lg font-semibold text-slate-900">Recent transactions</h2>
          {sales.recent.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No sales yet. Completed bills appear here.</p>
          ) : (
            <ul className="divide-y divide-slate-100/80">
              {sales.recent.map((t) => (
                <li key={t.invoice} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-emerald-100 p-2 text-emerald-700"><Receipt className="h-4 w-4" aria-hidden="true" /></span>
                    <div>
                      <p className="font-medium text-slate-900">{t.invoice}</p>
                      <p className="text-xs text-slate-500">{t.customer} · {t.items} items · {t.method} · {t.time}</p>
                    </div>
                  </div>
                  <p className="font-medium text-slate-900">{formatMoney(t.totalPaise)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}
