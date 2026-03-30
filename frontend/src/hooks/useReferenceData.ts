import { useCallback, useEffect, useState } from "react";
import type { ReferenceData } from "@/types/reference";

export function useReferenceData() {
  const [data, setData] = useState<ReferenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/config/reference", { signal });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json: ReferenceData = await res.json();
      setData(json);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Ukjend feil");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const refetch = useCallback(() => fetchData(), [fetchData]);

  return { data, loading, error, refetch };
}
