export default function StatCard({ label, value, hint, icon: Icon, tone = "default" }) {
  const tones = {
    default: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
  };
  return (
    <div className="glass-card lift p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">{label}</p>
        {Icon && (
          <span className={`rounded-xl p-2 ${tones[tone]}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
