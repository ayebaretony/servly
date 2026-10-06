import { useEffect, useState } from "react";
import type { AsyncData } from "@/lib/useAsyncData";
import type { Booking } from "@/types/booking";
import { subscribeToDay } from "../dashboard.service";

type Outcome = { ok: true; data: Booking[] } | { ok: false };

// Live list of one day's bookings, earliest first. Unsubscribes when the page closes or the date changes.
export function useTodayBookings(date: string): AsyncData<Booking[]> {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ date: string; attempt: number; outcome: Outcome } | null>(null);

  useEffect(() => {
    return subscribeToDay(
      date,
      (bookings) => {
        const sorted = [...bookings].sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis());
        setResult({ date, attempt, outcome: { ok: true, data: sorted } });
      },
      () => setResult({ date, attempt, outcome: { ok: false } }),
    );
  }, [date, attempt]);

  const current = result && result.date === date && result.attempt === attempt ? result.outcome : null;
  if (!current) return { status: "loading" };
  if (!current.ok) {
    return {
      status: "error",
      message: "We couldn't load today's bookings.",
      retry: () => setAttempt((n) => n + 1),
    };
  }
  return { status: "ready", data: current.data };
}
