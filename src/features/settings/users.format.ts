import { formatDayLabel, todayInTimezone } from "@/lib/time";

// "Oct 7" (or "Oct 7, 2025" from another year), in the center's timezone like every other date in the app
export function formatAdded(date: Date, timezone: string): string {
  return formatDayLabel(todayInTimezone(timezone, date), todayInTimezone(timezone));
}
