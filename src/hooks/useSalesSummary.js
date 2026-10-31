import { useCallback, useEffect, useState } from "react";
import { fetchRecentSales } from "../services/salesService";
import { friendlyError } from "../services/errors";
import { paymentLabel } from "../utils/billing";

function localDateKey(d) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function useSalesSummary(days = 14) {
  const [state, setState] = useState({
    daily: [],
    todayTotal: 0,
    todayCount: 0,
    recent: [],
    loading: true,
    error: "",
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const sales = await fetchRecentSales(days);

      const totals = new Map();
      for (const s of sales) {
        const key = localDateKey(new Date(s.at));
        totals.set(key, (totals.get(key) ?? 0) + s.totalPaise);
      }

      const daily = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        daily.push({
          day: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
          sales: totals.get(localDateKey(d)) ?? 0,
        });
      }

      const todayKey = localDateKey(new Date());
      const today = sales.filter((s) => localDateKey(new Date(s.at)) === todayKey);

      setState({
        daily,
        todayTotal: today.reduce((sum, s) => sum + s.totalPaise, 0),
        todayCount: today.length,
        recent: sales.slice(0, 4).map((s) => ({
          invoice: s.invoice,
          customer: s.customer,
          items: s.items,
          totalPaise: s.totalPaise,
          method: paymentLabel(s.method),
          time: new Date(s.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        })),
        loading: false,
        error: "",
      });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: friendlyError(err) }));
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
