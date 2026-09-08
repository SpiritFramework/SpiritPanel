import { useCallback, useEffect, useRef, useState } from 'react';

const inflight = new Map<string, Promise<unknown>>();

export interface UseAsyncDataResult<T> {
  data: T | null;
  /** True only while waiting for the first successful load. */
  loading: boolean;
  /** True during any in-flight request (including background refresh). */
  validating: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches data with in-flight deduplication (same key shares one request).
 * Aborts stale updates when the component unmounts or key changes.
 */
export function useAsyncData<T>(
  key: string,
  fetcher: () => Promise<T>,
  deps: readonly unknown[] = [],
): UseAsyncDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const dataRef = useRef<T | null>(null);
  dataRef.current = data;
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    const gen = ++generation.current;
    const hasData = dataRef.current !== null;
    if (!hasData) setLoading(true);
    setValidating(true);
    setError(null);

    let promise = inflight.get(key) as Promise<T> | undefined;
    if (!promise) {
      promise = fetcherRef.current().finally(() => {
        inflight.delete(key);
      });
      inflight.set(key, promise);
    }

    try {
      const result = await promise;
      if (gen === generation.current) {
        setData(result);
      }
    } catch (err) {
      if (gen === generation.current) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        if (!hasData) setData(null);
      }
    } finally {
      if (gen === generation.current) {
        setLoading(false);
        setValidating(false);
      }
    }
  }, [key]);

  const prevKey = useRef(key);
  useEffect(() => {
    if (prevKey.current !== key) {
      prevKey.current = key;
      setData(null);
      setLoading(true);
    }
    void run();
    return () => {
      generation.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key + explicit deps
  }, [key, run, ...deps]);

  return { data, loading, validating, error, refetch: run };
}
