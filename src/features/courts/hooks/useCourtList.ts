import { useCallback, useEffect, useState } from "react";
import type { AsyncData } from "@/lib/useAsyncData";
import type { Court } from "@/types/court";
import { fetchCourts } from "../courts.service";

const ERROR_MESSAGE = "We couldn't load the courts.";

// The courts for the Courts page. Unlike useCourts it can be refreshed after a save, and it keeps showing the old list
// while the new one loads, so adding or editing a court doesn't flash the whole page back to a skeleton.
export function useCourtList(): { courts: AsyncData<Court[]>; reload: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ status: "loading" } | { status: "error" } | { status: "ready"; data: Court[] }>({
    status: "loading",
  });

  useEffect(() => {
    let cancelled = false;
    fetchCourts().then(
      (data) => {
        if (!cancelled) setState({ status: "ready", data });
      },
      () => {
        // The raw error is not logged: nothing in it is worth more than the friendly message
        if (!cancelled) setState({ status: "error" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  const courts: AsyncData<Court[]> =
    state.status === "error"
      ? { status: "error", message: ERROR_MESSAGE, retry }
      : state.status === "ready"
        ? { status: "ready", data: state.data }
        : { status: "loading" };

  return { courts, reload };
}
