import { useCallback } from "react";
import { useAsyncData } from "@/lib/useAsyncData";
import { fetchBlocksInRange } from "../blocks.service";

// Maintenance blocks between two dates, read once (no live listener, AGENTS.md section 8). Bump `reloadKey` to read again.
export function useCalendarBlocks(start: string, end: string, timezone: string, reloadKey: number) {
  // reloadKey is not read inside the callback; it changes the callback's identity so useAsyncData loads again
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(() => fetchBlocksInRange(start, end, timezone), [start, end, timezone, reloadKey]);
  return useAsyncData(load, "We couldn't load the maintenance blocks.");
}
