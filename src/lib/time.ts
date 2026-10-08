import { format } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

// "Today", "this month" and every displayed time use the center timezone, never the browser's (AGENTS.md "Time rules").
// Calendar days travel as "YYYY-MM-DD" strings, which is also what bookings.date stores.

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseDateString(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function toDateString(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function todayInTimezone(timezone: string, now: Date = new Date()): string {
  return formatInTimeZone(now, timezone, "yyyy-MM-dd");
}

// Whole hour (0-23) right now at the center
export function hourInTimezone(timezone: string, now: Date = new Date()): number {
  return Number(formatInTimeZone(now, timezone, "H"));
}

// Minutes since midnight in the center timezone, e.g. 9:30 -> 570
export function minutesOfDay(date: Date, timezone: string): number {
  const [hours, minutes] = formatInTimeZone(date, timezone, "HH:mm").split(":").map(Number);
  return hours * 60 + minutes;
}

// "07:00" -> 420
export function parseHHmm(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

// The real moment (UTC) when a wall-clock time happens at the center: "2024-06-18" + 540 in Asia/Dubai -> 09:00 Dubai time
export function zonedDateTime(date: string, minutes: number, timezone: string): Date {
  return fromZonedTime(`${date}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00`, timezone);
}

// 570 -> "9:30 AM"
export function formatMinutes(minutes: number): string {
  return format(new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60), "h:mm a");
}

// 90 -> "1 hr 30 min", 60 -> "1 hr", 30 -> "30 min"
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours > 0 && `${hours} hr`, rest > 0 && `${rest} min`].filter(Boolean).join(" ");
}

// Adds (or subtracts) days on a date string. Done in UTC so daylight-saving shifts can't move the result.
export function addDays(date: string, days: number): string {
  const { year, month, day } = parseDateString(date);
  const moved = new Date(Date.UTC(year, month - 1, day + days));
  return toDateString(moved.getUTCFullYear(), moved.getUTCMonth() + 1, moved.getUTCDate());
}

export function monthStart(date: string): string {
  const { year, month } = parseDateString(date);
  return toDateString(year, month, 1);
}

export function monthEnd(date: string): string {
  const { year, month } = parseDateString(date);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return toDateString(year, month, lastDay);
}

export function previousMonthStart(date: string): string {
  return monthStart(addDays(monthStart(date), -1));
}

// Day 1-7 is week 1, 8-14 is week 2, and so on. Matches the "week 1, week 2" bars on the dashboard.
export function weekOfMonth(date: string): number {
  return Math.ceil(parseDateString(date).day / 7);
}

// Formatting a date string only needs its calendar parts, so a local Date is safe here (no timezone maths involved).
function localDate(date: string) {
  const { year, month, day } = parseDateString(date);
  return new Date(year, month - 1, day);
}

// "Tuesday, June 18, 2024"
export function formatLongDate(date: string): string {
  return format(localDate(date), "EEEE, MMMM d, yyyy");
}

// "Tue, Jun 18"
export function formatShortDate(date: string): string {
  return format(localDate(date), "EEE, MMM d");
}

// "Jun 18"
export function formatMonthDay(date: string): string {
  return format(localDate(date), "MMM d");
}

// "Jun 18", or "Jun 18, 2024" when the date is not in the same year as `today`
export function formatDayLabel(date: string, today: string): string {
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  return format(localDate(date), sameYear ? "MMM d" : "MMM d, yyyy");
}

// Whole days from `from` to `to`, counting both ends: same day -> 1, Jun 18 to Jun 20 -> 3. Done in UTC like addDays.
export function daysInclusive(from: string, to: string): number {
  const start = parseDateString(from);
  const end = parseDateString(to);
  const millis = Date.UTC(end.year, end.month - 1, end.day) - Date.UTC(start.year, start.month - 1, start.day);
  return Math.round(millis / 86_400_000) + 1;
}

// "June"
export function formatMonthName(date: string): string {
  return format(localDate(date), "MMMM");
}

// "June 2024"
export function formatMonthYear(date: string): string {
  return format(localDate(date), "MMMM yyyy");
}

// "Tuesday, June 18"
export function formatWeekdayDate(date: string): string {
  return format(localDate(date), "EEEE, MMMM d");
}

// "Tue 18" / "TUE": short column heads for the week and day grids
export function formatWeekdayShort(date: string): string {
  return format(localDate(date), "EEE");
}

export function dayOfMonth(date: string): number {
  return parseDateString(date).day;
}

// 0 = Sunday ... 6 = Saturday. The calendar weeks run Sunday to Saturday, as in the design.
export function dayOfWeek(date: string): number {
  const { year, month, day } = parseDateString(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function weekStart(date: string): string {
  return addDays(date, -dayOfWeek(date));
}

export function weekEnd(date: string): string {
  return addDays(weekStart(date), 6);
}

// "Jun 16 – 22, 2024", or "Jun 28 – Jul 4, 2024" when the week spans two months
export function formatWeekRange(date: string): string {
  const start = localDate(weekStart(date));
  const end = localDate(weekEnd(date));
  const startText = format(start, "MMM d");
  const endText = format(end, start.getMonth() === end.getMonth() ? "d, yyyy" : "MMM d, yyyy");
  return `${startText} – ${endText}`;
}

// The same day-of-month one month on, or the last day of that month when it is shorter (Jan 31 + 1 month -> Feb 28/29)
export function addMonths(date: string, months: number): string {
  const { year, month, day } = parseDateString(date);
  const first = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return toDateString(first.getUTCFullYear(), first.getUTCMonth() + 1, Math.min(day, lastDay));
}

// "9:00 AM"
export function formatClock(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "h:mm a");
}

// "9:00–10:00 AM", or "11:30 AM–1:00 PM" when the range crosses noon
export function formatTimeRange(start: Date, end: Date, timezone: string): string {
  const startMeridiem = formatInTimeZone(start, timezone, "a");
  const endMeridiem = formatInTimeZone(end, timezone, "a");
  const startText = formatInTimeZone(start, timezone, startMeridiem === endMeridiem ? "h:mm" : "h:mm a");
  return `${startText}–${formatClock(end, timezone)}`;
}

// "Jun 18, 9:00–10:00 AM"
export function formatDateAndTimeRange(start: Date, end: Date, timezone: string): string {
  return `${formatInTimeZone(start, timezone, "MMM d")}, ${formatTimeRange(start, end, timezone)}`;
}

// Hour labels for the timeline axis, e.g. ["7:00 AM", "8:00 AM", ...] from opening to closing
export function hourLabels(openTime: string, closeTime: string): string[] {
  const labels: string[] = [];
  const firstHour = Math.floor(parseHHmm(openTime) / 60);
  const lastHour = Math.floor(parseHHmm(closeTime) / 60);
  for (let hour = firstHour; hour <= lastHour; hour += 1) {
    labels.push(format(new Date(2000, 0, 1, hour), "h:mm a"));
  }
  return labels;
}
