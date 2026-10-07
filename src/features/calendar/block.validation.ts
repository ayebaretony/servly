import { overlapsTaken } from "@/lib/conflicts";
import { checkBookingWindow } from "@/features/bookings/bookings.rules";
import { parseMinutes } from "@/features/bookings/booking.validation";
import type { Court } from "@/types/court";
import type { CenterSettings } from "@/types/settings";

// `start` and `end` are minutes since midnight as text ("" = not chosen), like the booking form
export type BlockFormValues = {
  courtId: string;
  date: string;
  start: string;
  end: string;
  reason: string;
};

export type BlockFormErrors = Partial<Record<keyof BlockFormValues, string>>;

export const REASON_MAX = 200;

type ValidationContext = {
  courts: Court[];
  settings: CenterSettings;
  now: Date;
  // Start minutes of slots already taken on the chosen court and day
  taken: ReadonlySet<number>;
};

export function validateBlock(values: BlockFormValues, { courts, settings, now, taken }: ValidationContext): BlockFormErrors {
  const errors: BlockFormErrors = {};

  if (!courts.some((court) => court.id === values.courtId)) errors.courtId = "Choose a court.";
  if (!values.date) errors.date = "Pick a date.";

  const startMin = parseMinutes(values.start);
  const endMin = parseMinutes(values.end);
  if (startMin === null) errors.start = "Choose a start time.";
  if (endMin === null) errors.end = "Choose an end time.";

  if (values.date && startMin !== null && endMin !== null) {
    // Only admins can block time, and they may block past days too
    const problem = checkBookingWindow({ date: values.date, startMin, endMin, settings, isAdmin: true, now });
    if (problem) {
      const field = problem.field === "startMin" ? "start" : problem.field === "endMin" ? "end" : "date";
      errors[field] = problem.message;
    } else if (overlapsTaken(startMin, endMin, settings.slotMinutes, taken)) {
      errors.end = "Part of that time is already booked or blocked on this court.";
    }
  }

  const reason = values.reason.trim();
  if (!reason) errors.reason = "Say why the court is closed, e.g. Resurfacing.";
  else if (reason.length > REASON_MAX) errors.reason = `Keep the reason under ${REASON_MAX} characters.`;

  return errors;
}
