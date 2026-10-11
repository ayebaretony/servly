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
  // Editing a booking that keeps its start: the start may already be behind us, but the new end still has to be ahead
  keepsStart?: boolean;
};

// Where and when a booking is, as the edit form and the save both compare it
export type Schedule = { courtId: string; date: string; startMin: number; endMin: number };

export function sameSchedule(a: Schedule, b: Schedule): boolean {
  return a.courtId === b.courtId && a.date === b.date && a.startMin === b.startMin && a.endMin === b.endMin;
}

export function keepsStart(original: Schedule, edited: Schedule): boolean {
  return original.date === edited.date && original.startMin === edited.startMin;
}

// The "when" rules from AGENTS.md section 7: inside opening hours, on the slot grid, not in the past (admins may back-date).
// Used by the form for inline errors and again by the save, so the two can never disagree.
export function checkBookingWindow({ date, startMin, endMin, settings, isAdmin, now, keepsStart = false }: WindowCheck): WindowProblem | null {
  const open = parseHHmm(settings.openTime);
  const close = parseHHmm(settings.closeTime);

  if (endMin <= startMin) return { field: "endMin", message: "End time must be after the start time." };
  if (startMin < open || endMin > close) {
    return {
      field: "startMin",
      message: `Bookings run from ${formatMinutes(open)} to ${formatMinutes(close)}.`,
    };
  }
  if ((startMin - open) % settings.slotMinutes !== 0) {
    return { field: "startMin", message: `Start times are made in ${settings.slotMinutes}-minute steps from opening time.` };
  }
  if ((endMin - startMin) % settings.slotMinutes !== 0) {
    return { field: "endMin", message: `Bookings are made in ${settings.slotMinutes}-minute steps.` };
  }

  if (!isAdmin && keepsStart) {
    if (zonedDateTime(date, endMin, settings.timezone) <= now) {
      return { field: "endMin", message: "That end time has already passed." };
    }
  } else if (!isAdmin) {
    if (date < todayInTimezone(settings.timezone, now)) {
      return { field: "date", message: "Pick today or a later date." };
    }
    if (zonedDateTime(date, startMin, settings.timezone) <= now) {
      return { field: "startMin", message: "That start time has already passed." };
    }
  }
  return null;
}
