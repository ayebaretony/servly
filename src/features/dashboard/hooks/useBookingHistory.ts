import { useCallback } from "react";
import { useAsyncData } from "@/lib/useAsyncData";
import { monthEnd, previousMonthStart } from "@/lib/time";
import { fetchBookingsInRange, fetchRecentBookings } from "../dashboard.service";

// Last month + this month in one query, for the revenue card and the "vs last week" figures.
export function useBookingHistory(today: string) {
  const load = useCallback(() => fetchBookingsInRange(previousMonthStart(today), monthEnd(today)), [today]);
  return useAsyncData(load, "We couldn't load the revenue figures.");
}

const loadRecent = () => fetchRecentBookings(5);

export function useRecentBookings() {
  return useAsyncData(loadRecent, "We couldn't load recent bookings.");
}
