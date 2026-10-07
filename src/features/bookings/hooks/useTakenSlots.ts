import { useCallback, useMemo } from "react";
import { useAsyncData } from "@/lib/useAsyncData";
import { fetchTakenSlotStarts } from "../bookings.service";

const NONE: number[] = [];

// Which times are already taken on one court and day. One read per choice (no live listener, AGENTS.md section 8).
// Bump `refreshKey` to read again, e.g. after the save found the time had just been taken.
// This only guides the form; the transaction in createBooking is what actually prevents double-booking.
export function useTakenSlots(courtId: string, date: string, refreshKey: number) {
  // refreshKey is not read inside the callback; it changes the callback's identity so useAsyncData loads again
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(() => (courtId && date ? fetchTakenSlotStarts(courtId, date) : Promise.resolve(NONE)), [courtId, date, refreshKey]);
  const result = useAsyncData(load, "We couldn't check what's already booked.");

  const starts = result.status === "ready" ? result.data : NONE;
  const taken = useMemo(() => new Set(starts), [starts]);

  return { status: result.status, taken };
}
