import { useCallback } from "react";
import { useAsyncData } from "@/lib/useAsyncData";
import { fetchRevenueBookings } from "../revenue.service";

// Re-reads whenever the chosen month changes
export function useRevenueBookings(month: string) {
  const load = useCallback(() => fetchRevenueBookings(month), [month]);
  return useAsyncData(load, "We couldn't load the revenue figures.");
}
