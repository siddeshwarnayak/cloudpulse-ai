import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Polls an async fetcher on an interval and exposes loading/error/data
 * state. Used throughout the dashboard so all data stays API-driven and
 * refreshes automatically as the simulator ticks new metrics/incidents.
 */
export function usePolling(fetcher, { intervalMs = 4000, deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const run = useCallback(async () => {
    try {
      const result = await fetcher();
      if (!mounted.current) return;
      setData(result);
      setError(null);
    } catch (err) {
      if (!mounted.current) return;
      setError(err);
    } finally {
      if (mounted.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    run();
    const id = setInterval(run, intervalMs);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, intervalMs]);

  return { data, error, loading, refetch: run };
}
