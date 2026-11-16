import { formatMoney } from "../utils/format";

function localKey(d) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// This week (Monday to Sunday). A dot means there were sales that day.
// `daily` comes from the real sales data: [{ key: "YYYY-MM-DD", sales: paise }]
export default function WeekStrip({ daily }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const totals = new Map(daily.map((d) => [d.key, d.sales]));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = localKey(d);
    return {
      key,
      weekday: d.toLocaleDateString("en-IN", { weekday: "short" }),
      date: d.getDate(),
      isToday: d.getTime() === today.getTime(),
      sales: totals.get(key) ?? 0,
    };
  });

  return (
    <section className="glass-card p-5" aria-label="This week">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">
        {today.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
      </h2>
      <ol className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <li
            key={d.key}
            title={d.sales > 0 ? `${formatMoney(d.sales)} in sales` : "No sales"}
            aria-label={`${d.weekday} ${d.date}${d.isToday ? " (today)" : ""}: ${d.sales > 0 ? formatMoney(d.sales) : "no sales"}`}
            className={`flex flex-col items-center gap-1 rounded-xl py-2 text-center ${
              d.isToday ? "bg-emerald-950 text-white" : "text-slate-600"
            }`}
          >
            <span className="text-[11px]">{d.weekday}</span>
            <span className="text-base font-semibold">{d.date}</span>
            <span className={`h-1.5 w-1.5 rounded-full ${d.sales > 0 ? (d.isToday ? "bg-emerald-300" : "bg-emerald-500") : "bg-transparent"}`} />
          </li>
        ))}
      </ol>
    </section>
  );
}
