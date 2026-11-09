import { useEffect, useState } from "react";
import { fetchMonthlyTrend } from "../services/reportsService";
import { friendlyError } from "../services/errors";

// Net sales vs purchases for the last N months. Administrators only,
// so it does nothing for other roles.
export function useMonthlyTrend(enabled, months = 6) {
  const [state, setState] = useState({ data: [], loading: Boolean(enabled), error: "" });

  useEffect(() => {
    if (!enabled) {
      setState({ data: [], loading: false, error: "" });
      return;
    }
    let active = true;
    fetchMonthlyTrend(months)
      .then((data) => active && setState({ data, loading: false, error: "" }))
      .catch((err) => active && setState({ data: [], loading: false, error: friendlyError(err) }));
    return () => {
      active = false;
    };
  }, [enabled, months]);

  return state;
}
