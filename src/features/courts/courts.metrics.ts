import { minutesOfDay, parseHHmm } from "@/lib/time";
import type { Booking } from "@/types/booking";
import type { Court } from "@/types/court";
import type { CenterSettings } from "@/types/settings";

// Pure calculations behind the Courts page numbers. Same rules as the dashboard (AGENTS.md section 12):
// cancelled bookings count for nothing; pending ones still hold the court, so they count.

export type CourtStats = {
  total: number;
  available: number;
  maintenance: number;
};

export function computeCourtStats(courts: Court[]): CourtStats {
  return {
    total: courts.length,
    available: courts.filter((court) => court.status === "available").length,
    maintenance: courts.filter((court) => court.status === "maintenance").length,
  };
}

// How many of today's bookings each court has, by court id
export function countBookingsByCourt(todayBookings: Booking[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const booking of todayBookings) {
    if (booking.status === "cancelled") continue;
    counts.set(booking.courtId, (counts.get(booking.courtId) ?? 0) + 1);
  }
  return counts;
}

export type AvailabilitySegment = { courtId: string; courtName: string; color: string; bookedMinutes: number };

export type Availability = {
  segments: AvailabilitySegment[]; // only courts with booked time today, in court order
  bookedMinutes: number;
  openMinutes: number;
  capacityMinutes: number; // every bookable court, opening to closing
};

// Booked vs open court-hours today. Only courts that can take bookings add capacity, and booked time is cut off at
// opening and closing time, so the two halves always add up to the capacity.
export function computeAvailability(courts: Court[], todayBookings: Booking[], settings: CenterSettings): Availability {
  const open = parseHHmm(settings.openTime);
  const close = parseHHmm(settings.closeTime);
  const bookable = courts.filter((court) => court.status === "available");

  const segments = bookable
    .map((court) => {
      const bookedMinutes = todayBookings
        .filter((b) => b.courtId === court.id && b.status !== "cancelled")
        .reduce((sum, b) => {
          const start = Math.max(minutesOfDay(b.startAt.toDate(), settings.timezone), open);
          const end = Math.min(minutesOfDay(b.endAt.toDate(), settings.timezone), close);
          return sum + Math.max(end - start, 0);
        }, 0);
      return { courtId: court.id, courtName: court.name, color: court.color, bookedMinutes };
    })
    .filter((segment) => segment.bookedMinutes > 0);

  const capacityMinutes = bookable.length * Math.max(close - open, 0);
  const bookedMinutes = Math.min(
    segments.reduce((sum, segment) => sum + segment.bookedMinutes, 0),
    capacityMinutes,
  );
  return { segments, bookedMinutes, openMinutes: capacityMinutes - bookedMinutes, capacityMinutes };
}

// 1080 -> "18 hours", 330 -> "5.5 hours", 60 -> "1 hour"
export function formatHours(minutes: number): string {
  const hours = Math.round(minutes / 6) / 10;
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}
