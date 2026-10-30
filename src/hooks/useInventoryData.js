import { useCallback, useEffect, useState } from "react";
import { fetchBatches, fetchCategories, fetchMedicines } from "../services/medicineService";
import { friendlyError } from "../services/errors";

export function useInventoryData() {
  const [state, setState] = useState({
    medicines: [],
    categories: [],
    batches: [],
    loading: true,
    error: "",
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const [categories, medicines, batches] = await Promise.all([
        fetchCategories(),
        fetchMedicines(),
        fetchBatches(),
      ]);
      setState({ categories, medicines, batches, loading: false, error: "" });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: friendlyError(err) }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
