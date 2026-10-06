import { useCallback, useEffect, useState } from "react";

export type AsyncData<T> =
  | { status: "loading" }
  | { status: "error"; message: string; retry: () => void }
  | { status: "ready"; data: T };

type Outcome<T> = { ok: true; data: T } | { ok: false; message: string };

// Runs `load` once and again whenever it changes or `retry` is called.
// `load` must be stable (a module function, or wrapped in useCallback) or it will refetch on every render.
// Loading is worked out from which request a result belongs to, so nothing needs resetting inside the effect.
export function useAsyncData<T>(load: () => Promise<T>, errorMessage: string): AsyncData<T> {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ load: () => Promise<T>; attempt: number; outcome: Outcome<T> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    load().then(
      (data) => {
        if (!cancelled) setResult({ load, attempt, outcome: { ok: true, data } });
      },
      () => {
        // The raw error is not logged: it can carry customer details from a failed query
        if (!cancelled) setResult({ load, attempt, outcome: { ok: false, message: errorMessage } });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [load, attempt, errorMessage]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const current = result && result.load === load && result.attempt === attempt ? result.outcome : null;
  if (!current) return { status: "loading" };
  if (!current.ok) return { status: "error", message: current.message, retry };
  return { status: "ready", data: current.data };
}
