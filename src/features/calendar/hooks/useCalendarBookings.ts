import { useEffect, useState } from "react";
import { fetchBookingsInRange, subscribeToDay } from "@/features/dashboard/dashboard.service";
import type { AsyncData } from "@/lib/useAsyncData";
import type { Booking } from "@/types/booking";

type Outcome = { ok: true; data: Booking[] } | { ok: false };

// Bookings between two dates (inclusive), earliest first. Cancelled ones are left out: they no longer hold the time.
// A single day is kept live with a listener (AGENTS.md section 8: real-time only for the day view);
// a week or month is read once, and again when `reloadKey` changes or "Try again" is pressed.
export function useCalendarBookings(start: string, end: string, reloadKey: number): AsyncData<Booking[]> {
  const [attempt, setAttempt] = useState(0);
  // Which request a result belongs to, so a stale answer is never shown for the range now on screen
  const requestKey = `${start}|${end}|${reloadKey}|${attempt}`;
  const [result, setResult] = useState<{ key: string; outcome: Outcome } | null>(null);

  useEffect(() => {
    const finish = (outcome: Outcome) => setResult({ key: requestKey, outcome });
    const keepActive = (bookings: Booking[]) =>
      bookings.filter((b) => b.status !== "cancelled").sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis());

    if (start === end) {
      return subscribeToDay(
        start,
        (bookings) => finish({ ok: true, data: keepActive(bookings) }),
        () => finish({ ok: false }),
      );
    }

    let cancelled = false;
    fetchBookingsInRange(start, end).then(
      (bookings) => {
        if (!cancelled) finish({ ok: true, data: keepActive(bookings) });
      },
      // The raw error is not logged: it can carry customer details from a failed query
      () => {
        if (!cancelled) finish({ ok: false });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [start, end, requestKey]);

  if (!result || result.key !== requestKey) return { status: "loading" };
  if (!result.outcome.ok) {
    return {
      status: "error",
      message: "We couldn't load the bookings for this period.",
      retry: () => setAttempt((n) => n + 1),
    };
  }
  return { status: "ready", data: result.outcome.data };
}
