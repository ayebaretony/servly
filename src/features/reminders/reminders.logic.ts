import type { Booking } from "@/types/booking";

// How long before a booking starts the admin is reminded, so there is time to set up the equipment
export const REMINDER_LEAD_MINUTES = 30;

// A reminder is tied to the start time too, so a booking that is moved to a new time reminds again
export function reminderKey(booking: Booking): string {
  return `${booking.id}@${booking.startAt.toMillis()}`;
}

// Bookings that start within the lead time and have not started yet. Cancelled bookings need no setup.
export function dueBookings(bookings: Booking[], nowMs: number, reminded: ReadonlySet<string>): Booking[] {
  const limit = nowMs + REMINDER_LEAD_MINUTES * 60_000;
  return bookings.filter((booking) => {
    if (booking.status === "cancelled") return false;
    const start = booking.startAt.toMillis();
    return start > nowMs && start <= limit && !reminded.has(reminderKey(booking));
  });
}

// "in 12 min", or "starting now" in the last minute
export function minutesUntilLabel(startMs: number, nowMs: number): string {
  const minutes = Math.ceil((startMs - nowMs) / 60_000);
  return minutes <= 1 ? "starting now" : `in ${minutes} min`;
}
