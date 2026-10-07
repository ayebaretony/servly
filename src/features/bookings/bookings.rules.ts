import { formatMinutes, parseHHmm, todayInTimezone, zonedDateTime } from "@/lib/time";
import type { CenterSettings } from "@/types/settings";

export type WindowProblem = { field: "date" | "startMin" | "endMin"; message: string };

type WindowCheck = {
  date: string;
  startMin: number;
  endMin: number;
  settings: CenterSettings;
  isAdmin: boolean;
  now: Date;
};

// The "when" rules from AGENTS.md section 7: inside opening hours, on the slot grid, not in the past (admins may back-date).
// Used by the form for inline errors and again by the save, so the two can never disagree.
export function checkBookingWindow({ date, startMin, endMin, settings, isAdmin, now }: WindowCheck): WindowProblem | null {
  const open = parseHHmm(settings.openTime);
  const close = parseHHmm(settings.closeTime);

  if (endMin <= startMin) return { field: "endMin", message: "End time must be after the start time." };
  if (startMin < open || endMin > close) {
    return {
      field: "startMin",
      message: `Bookings run from ${formatMinutes(open)} to ${formatMinutes(close)}.`,
    };
  }
  if ((endMin - startMin) % settings.slotMinutes !== 0) {
    return { field: "endMin", message: `Bookings are made in ${settings.slotMinutes}-minute steps.` };
  }

  if (!isAdmin) {
    if (date < todayInTimezone(settings.timezone, now)) {
      return { field: "date", message: "Pick today or a later date." };
    }
    if (zonedDateTime(date, startMin, settings.timezone) <= now) {
      return { field: "startMin", message: "That start time has already passed." };
    }
  }
  return null;
}
