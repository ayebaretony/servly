import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

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

// "June"
export function formatMonthName(date: string): string {
  return format(localDate(date), "MMMM");
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
