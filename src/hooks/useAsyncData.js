import { useEffect, useState } from "react";
import { friendlyError } from "../services/errors";

// Run an async loader whenever `deps` change. Ignores results that arrive late.
export function useAsyncData(loader, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });

  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true, error: "" }));
    loader()
      .then((data) => active && setState({ data, loading: false, error: "" }))
      .catch((err) => active && setState({ data: null, loading: false, error: friendlyError(err) }));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
