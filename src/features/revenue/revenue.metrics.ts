import { changeRatio } from "@/lib/money";
import { addDays, daysInclusive, monthEnd, weekOfMonth } from "@/lib/time";
import type { Booking } from "@/types/booking";
import type { Court } from "@/types/court";

// Pure calculations behind the Revenue screen, kept out of the components so they are easy to read and check.
// Rules (AGENTS.md section 12): revenue = confirmed bookings only; pending is shown separately; cancelled is never revenue.
// The design's "Paid / Pending / Refunded" map to Confirmed / Pending / Cancelled because bookings carry no payment state.

const RECENT_COUNT = 5;

export type DailyRevenue = {
  date: string;
  revenueMinor: number | null; // null for days that have not happened yet, so the line stops at today
  bookingCount: number;
};

export type CourtRevenue = {
  courtId: string;
  name: string;
  color: string; // palette key; "" when the court no longer exists
  revenueMinor: number;
  share: number; // 0 to 1 of the month's revenue
};

export type WeekRevenue = { week: number; revenueMinor: number; bookingCount: number };

export type StatusTotals = { count: number; totalMinor: number };

export type RevenueReport = {
  month: string;
  hasBookings: boolean;
  totalMinor: number;
  totalChange: number | null;
  confirmedCount: number;
  countChange: number | null;
  averageMinor: number | null;
  courtCount: number;
  confirmed: StatusTotals;
  pending: StatusTotals;
  cancelled: StatusTotals;
  daily: DailyRevenue[];
  byCourt: CourtRevenue[];
  weeks: WeekRevenue[];
  bestWeek: WeekRevenue | null;
  recent: Booking[];
};

const sumMinor = (bookings: Booking[]) => bookings.reduce((sum, b) => sum + b.totalMinor, 0);

function statusTotals(bookings: Booking[], status: Booking["status"]): StatusTotals {
  const matching = bookings.filter((b) => b.status === status);
  return { count: matching.length, totalMinor: sumMinor(matching) };
}

function groupBy<T>(items: T[], key: (item: T) => string | number): Map<string | number, T[]> {
  const groups = new Map<string | number, T[]>();
  for (const item of items) {
    const group = groups.get(key(item));
    if (group) group.push(item);
    else groups.set(key(item), [item]);
  }
  return groups;
}

// `bookings` holds the chosen month and the one before it (see fetchRevenueBookings).
// `month` is the first day of the chosen month; `today` decides which days are still in the future.
export function computeRevenueReport(bookings: Booking[], courts: Court[], month: string, today: string): RevenueReport {
  const prefix = month.slice(0, 7);
  const inMonth = bookings.filter((b) => b.date.startsWith(prefix));
  const previous = bookings.filter((b) => !b.date.startsWith(prefix));

  const confirmedBookings = inMonth.filter((b) => b.status === "confirmed");
  const previousConfirmed = previous.filter((b) => b.status === "confirmed");
  const totalMinor = sumMinor(confirmedBookings);

  const byDate = groupBy(confirmedBookings, (b) => b.date);
  const dayCount = daysInclusive(month, monthEnd(month));
  const daily: DailyRevenue[] = Array.from({ length: dayCount }, (_, index) => {
    const date = addDays(month, index);
    const dayBookings = byDate.get(date) ?? [];
    return { date, revenueMinor: date > today ? null : sumMinor(dayBookings), bookingCount: dayBookings.length };
  });

  const weekGroups = groupBy(confirmedBookings, (b) => weekOfMonth(b.date));
  const weeks: WeekRevenue[] = Array.from({ length: weekOfMonth(monthEnd(month)) }, (_, index) => {
    const weekBookings = weekGroups.get(index + 1) ?? [];
    return { week: index + 1, revenueMinor: sumMinor(weekBookings), bookingCount: weekBookings.length };
  });
  const bestWeek = weeks.reduce<WeekRevenue | null>(
    (best, week) => (week.revenueMinor > 0 && (!best || week.revenueMinor > best.revenueMinor) ? week : best),
    null,
  );

  // Every court that is still in use, plus any removed court that earned something this month
  const courtGroups = groupBy(confirmedBookings, (b) => b.courtId);
  const byCourt: CourtRevenue[] = [...courts]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((court) => !court.archived || courtGroups.has(court.id))
    .map((court) => ({ courtId: court.id, name: court.name, color: court.color, revenueMinor: sumMinor(courtGroups.get(court.id) ?? []), share: 0 }));
  const knownIds = new Set(courts.map((c) => c.id));
  for (const [courtId, group] of courtGroups) {
    if (!knownIds.has(String(courtId))) {
      byCourt.push({ courtId: String(courtId), name: group[0].courtName, color: "", revenueMinor: sumMinor(group), share: 0 });
    }
  }
  for (const entry of byCourt) entry.share = totalMinor > 0 ? entry.revenueMinor / totalMinor : 0;

  const recent = inMonth
    .filter((b) => b.date <= today)
    .sort((a, b) => b.startAt.toMillis() - a.startAt.toMillis())
    .slice(0, RECENT_COUNT);

  return {
    month,
    hasBookings: inMonth.length > 0,
    totalMinor,
    totalChange: changeRatio(totalMinor, sumMinor(previousConfirmed)),
    confirmedCount: confirmedBookings.length,
    countChange: changeRatio(confirmedBookings.length, previousConfirmed.length),
    averageMinor: confirmedBookings.length > 0 ? Math.round(totalMinor / confirmedBookings.length) : null,
    courtCount: courts.filter((c) => !c.archived).length,
    confirmed: statusTotals(inMonth, "confirmed"),
    pending: statusTotals(inMonth, "pending"),
    cancelled: statusTotals(inMonth, "cancelled"),
    daily,
    byCourt,
    weeks,
    bestWeek,
    recent,
  };
}
