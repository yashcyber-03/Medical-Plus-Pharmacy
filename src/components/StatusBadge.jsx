const STYLES = {
  healthy: { label: "Healthy", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  "low-stock": { label: "Low stock", cls: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  "out-of-stock": { label: "Out of stock", cls: "bg-slate-100 text-slate-700 ring-slate-500/20" },
  "near-expiry": { label: "Near expiry", cls: "bg-orange-50 text-orange-800 ring-orange-600/20" },
  expired: { label: "Expired", cls: "bg-red-50 text-red-700 ring-red-600/20" },
  quarantined: { label: "Quarantined", cls: "bg-purple-50 text-purple-700 ring-purple-600/20" },
  disposed: { label: "Disposed", cls: "bg-slate-100 text-slate-500 ring-slate-400/20" },
  inactive: { label: "Inactive", cls: "bg-slate-100 text-slate-500 ring-slate-400/20" },
  pending: { label: "Pending", cls: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-700 ring-red-600/20" },
  refund_none: { label: "No refund", cls: "bg-slate-100 text-slate-600 ring-slate-500/20" },
  refund_due: { label: "Refund due", cls: "bg-orange-50 text-orange-800 ring-orange-600/20" },
  refunded: { label: "Refunded", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-700 ring-slate-500/20" },
  ordered: { label: "Ordered", cls: "bg-sky-50 text-sky-700 ring-sky-600/20" },
  partially_received: { label: "Partly received", cls: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  received: { label: "Received", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  cancelled: { label: "Cancelled", cls: "bg-red-50 text-red-700 ring-red-600/20" },
};

export default function StatusBadge({ status }) {
  const s = STYLES[status] ?? STYLES.healthy;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.cls}`}>
      {s.label}
    </span>
  );
}
