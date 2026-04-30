import { useState, useEffect, useCallback } from "react";

export function useRemoteQuery<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  ...args: TArgs
): {
  data: TResult | undefined;
  loading: boolean;
  error: unknown;
  refetch: () => void;
} {
  const [data, setData] = useState<TResult | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(undefined);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await fn(...args);
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [fn, ...args]);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch: execute };
}
