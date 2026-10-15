import { minutesOfDay, parseHHmm } from "@/lib/time";
import type { Booking } from "@/types/booking";
import type { Court } from "@/types/court";
import type { CenterSettings } from "@/types/settings";

// Pure calculations behind the dashboard numbers, kept out of the components so they are easy to read and check.
// Rules (AGENTS.md section 12): revenue = confirmed bookings only; cancelled bookings count for nothing;
// pending bookings still occupy the court, so they count toward bookings and utilization but not revenue.

const isActive = (b: Booking) => b.status !== "cancelled";
const isRevenue = (b: Booking) => b.status === "confirmed";

export type DayStats = {
  bookingCount: number;
  revenueMinor: number;
  occupiedSlots: number;
  totalSlots: number;
  openSlots: number;
  utilization: number; // 0 to 1
  courtCount: number; // courts that can take bookings
};

// How many slots of the day a booking occupies, cut off at opening and closing time
function occupiedSlotCount(booking: Booking, settings: CenterSettings): number {
  const open = parseHHmm(settings.openTime);
  const close = parseHHmm(settings.closeTime);
  const start = Math.max(minutesOfDay(booking.startAt.toDate(), settings.timezone), open);
  const end = Math.min(minutesOfDay(booking.endAt.toDate(), settings.timezone), close);
  if (end <= start) return 0;
  return Math.ceil((end - start) / settings.slotMinutes);
}

export function computeDayStats(dayBookings: Booking[], courts: Court[], settings: CenterSettings): DayStats {
  const bookableCourtIds = new Set(courts.filter((c) => c.status === "available").map((c) => c.id));
  const slotsPerCourt = Math.floor((parseHHmm(settings.closeTime) - parseHHmm(settings.openTime)) / settings.slotMinutes);
  const totalSlots = bookableCourtIds.size * slotsPerCourt;

  const active = dayBookings.filter(isActive);
  const occupiedSlots = active
    .filter((b) => bookableCourtIds.has(b.courtId))
    .reduce((sum, b) => sum + occupiedSlotCount(b, settings), 0);

  return {
    bookingCount: active.length,
    revenueMinor: dayBookings.filter(isRevenue).reduce((sum, b) => sum + b.totalMinor, 0),
    occupiedSlots,
    totalSlots,
    openSlots: Math.max(totalSlots - occupiedSlots, 0),
    utilization: totalSlots > 0 ? Math.min(occupiedSlots / totalSlots, 1) : 0,
    courtCount: bookableCourtIds.size,
  };
}
