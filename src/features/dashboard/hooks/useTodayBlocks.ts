import { useCallback } from "react";
import { fetchBlocksInRange } from "@/features/calendar/blocks.service";
import { useAsyncData } from "@/lib/useAsyncData";

// Today's maintenance blocks, read once when the dashboard opens (blocks are only changed from the Calendar page)
export function useTodayBlocks(today: string, timezone: string) {
  const load = useCallback(() => fetchBlocksInRange(today, today, timezone), [today, timezone]);
  return useAsyncData(load, "We couldn't load today's maintenance blocks.");
}
