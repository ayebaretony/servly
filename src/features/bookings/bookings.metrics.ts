import { daysInclusive, parseHHmm } from "@/lib/time";
import type { Booking } from "@/types/booking";
import type { Court } from "@/types/court";
import type { CenterSettings } from "@/types/settings";
import type { BookingFilters } from "./bookings.service";

// Pure calculations behind the Bookings screen. Same rules as the dashboard and Courts page (AGENTS.md section 12):
// revenue is confirmed bookings only; cancelled bookings use no court time; pending ones still hold the court.

export type BookingsSummary = {
  revenueMinor: number;
  occupancyPercent: number | null; // null when there is no court time to measure against
};

type SummaryContext = {
  courts: Court[];
  filters: BookingFilters;
  settings: CenterSettings;
};

export function computeBookingsSummary(bookings: Booking[], { courts, filters, settings }: SummaryContext): BookingsSummary {
  const revenueMinor = bookings.filter((b) => b.status === "confirmed").reduce((sum, b) => sum + b.totalMinor, 0);
  const bookedMinutes = bookings.filter((b) => b.status !== "cancelled").reduce((sum, b) => sum + b.durationMinutes, 0);

  // Occupancy = booked time / court time on offer, over the days the list covers
  const dayCount = filters.date ? 1 : coveredDays(bookings);
  const courtsInScope = filters.courtId
    ? courts.filter((court) => court.id === filters.courtId)
    : courts.filter((court) => court.status === "available");
  const openMinutesPerDay = Math.max(parseHHmm(settings.closeTime) - parseHHmm(settings.openTime), 0);
  const capacityMinutes = courtsInScope.length * openMinutesPerDay * dayCount;

  if (bookings.length === 0) return { revenueMinor, occupancyPercent: 0 };
  if (capacityMinutes === 0) return { revenueMinor, occupancyPercent: null };
  return { revenueMinor, occupancyPercent: Math.min(100, Math.round((bookedMinutes / capacityMinutes) * 100)) };
}

// From the earliest to the latest booking day, so a quiet gap in between still counts as time on offer
function coveredDays(bookings: Booking[]): number {
  if (bookings.length === 0) return 0;
  let first = bookings[0].date;
  let last = bookings[0].date;
  for (const booking of bookings) {
    if (booking.date < first) first = booking.date;
    if (booking.date > last) last = booking.date;
  }
  return daysInclusive(first, last);
}

// Phone numbers are typed in many styles ("+971 50 123 4567", "0501234567"), so a search made only of phone characters is compared by digits
const PHONE_CHARACTERS = /^[+()\-\s\d]+$/;

// Search box: name, email or phone, ignoring case
export function matchesSearch(booking: Booking, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  if (booking.customerName.toLowerCase().includes(needle)) return true;
  if (booking.customerEmail?.toLowerCase().includes(needle)) return true;
  if (PHONE_CHARACTERS.test(needle)) {
    const digits = needle.replace(/\D/g, "");
    return digits.length > 0 && booking.customerPhone.replace(/\D/g, "").includes(digits);
  }
  return false;
}
