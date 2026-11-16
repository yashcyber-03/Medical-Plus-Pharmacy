import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Ban, Hourglass } from "lucide-react";
import StatusBadge from "./StatusBadge";

const ICONS = { expired: Ban, "near-expiry": Hourglass, "low-stock": AlertTriangle, "out-of-stock": AlertTriangle };
const TONES = {
  expired: "bg-red-100 text-red-700",
  "near-expiry": "bg-orange-100 text-orange-700",
  "low-stock": "bg-amber-100 text-amber-700",
  "out-of-stock": "bg-slate-200 text-slate-700",
};

// rows: [{ id, title, subtitle, status }]
export default function AlertsPanel({ expiry, lowStock }) {
  const [tab, setTab] = useState("expiry");
  const rows = (tab === "expiry" ? expiry : lowStock).slice(0, 6);

  const tabBtn = (id, label, count) => (
    <button
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`rounded-full px-3 py-1 text-xs font-medium ${tab === id ? "bg-emerald-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}
    >
      {label} ({count})
    </button>
  );

  return (
    <section className="glass-card p-5" aria-label="Alerts">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Alerts</h2>
        <Link to="/stock-alerts" className="text-xs font-medium text-emerald-700 hover:underline">View all</Link>
      </div>
      <div role="tablist" aria-label="Alert type" className="mb-3 flex gap-1">
        {tabBtn("expiry", "Expiry", expiry.length)}
        {tabBtn("low", "Low stock", lowStock.length)}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-4 text-sm text-emerald-800">Nothing needs attention here.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const Icon = ICONS[r.status] ?? AlertTriangle;
            return (
              <li key={r.id} className="flex items-center gap-3 rounded-xl bg-white/80 p-3">
                <span className={`rounded-lg p-2 ${TONES[r.status] ?? TONES["low-stock"]}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{r.title}</p>
                  <p className="truncate text-xs text-slate-500">{r.subtitle}</p>
                </div>
                <StatusBadge status={r.status} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
