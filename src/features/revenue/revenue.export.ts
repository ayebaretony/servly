import { csvField, textCell } from "@/features/bookings/bookings.export";
import { COMPLIMENTARY_LABEL, minorToMajorInput } from "@/lib/money";
import { formatClock, formatMonthYear } from "@/lib/time";
import type { Booking } from "@/types/booking";
import type { CenterSettings } from "@/types/settings";
import type { RevenueReport } from "./revenue.metrics";

const REPEAT_MIN_BOOKINGS = 2;

type CustomerGroup = { name: string; bookings: Booking[]; totalMinor: number };

// Same person however it was typed: "Lamia", " lamia " and "LAMIA" are one customer
const customerKey = (booking: Booking) => booking.customerName.trim().replace(/\s+/g, " ").toLowerCase();

// Confirmed bookings of the month, split into customers who came back (own group each, biggest first) and everyone
// else (one combined group). Pending and cancelled bookings are not revenue, so they are left out.
export function groupByCustomer(bookings: Booking[], month: string): { repeat: CustomerGroup[]; oneTime: CustomerGroup } {
  const prefix = month.slice(0, 7);
  const confirmed = bookings
    .filter((b) => b.status === "confirmed" && b.date.startsWith(prefix))
    .sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis());

  const byCustomer = new Map<string, Booking[]>();
  for (const booking of confirmed) {
    const group = byCustomer.get(customerKey(booking));
    if (group) group.push(booking);
    else byCustomer.set(customerKey(booking), [booking]);
  }

  const total = (list: Booking[]) => list.reduce((sum, b) => sum + b.totalMinor, 0);
  const repeat: CustomerGroup[] = [];
  const oneTimeBookings: Booking[] = [];
  for (const list of byCustomer.values()) {
    if (list.length >= REPEAT_MIN_BOOKINGS) {
      repeat.push({ name: list[0].customerName.trim(), bookings: list, totalMinor: total(list) });
    } else {
      oneTimeBookings.push(...list);
    }
  }
  repeat.sort((a, b) => b.totalMinor - a.totalMinor || a.name.localeCompare(b.name));
  oneTimeBookings.sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis());
  return { repeat, oneTime: { name: "One-time customers", bookings: oneTimeBookings, totalMinor: total(oneTimeBookings) } };
}

// One file: a short summary and the by-court totals, then every confirmed booking grouped by customer with a total
// for each group and a grand total at the end. Amounts are plain numbers so a spreadsheet can add them up.
export function buildRevenueCsv(report: RevenueReport, bookings: Booking[], settings: CenterSettings): string {
  const money = (minor: number) => minorToMajorInput(minor);
  const amountHeader = `Amount (${settings.currency})`;
  const { repeat, oneTime } = groupByCustomer(bookings, report.month);

  const bookingRow = (booking: Booking) => [
    booking.date,
    formatClock(booking.startAt.toDate(), settings.timezone),
    formatClock(booking.endAt.toDate(), settings.timezone),
    textCell(booking.courtName),
    textCell(booking.customerName),
    textCell(booking.customerPhone),
    money(booking.totalMinor),
    booking.complimentary ? COMPLIMENTARY_LABEL : "",
  ];
  const columns = ["Date", "Start time", "End time", "Court", "Customer", "Phone", amountHeader, "Note"];
  const groupRows = (group: CustomerGroup, title: string): string[][] => [
    [title],
    columns,
    ...group.bookings.map(bookingRow),
    [`Total for ${textCell(group.name)}`, "", "", "", "", "", money(group.totalMinor)],
    [],
  ];

  const rows: string[][] = [
    ["Revenue report", formatMonthYear(report.month)],
    ["Revenue counts confirmed bookings only"],
    [],
    ["Summary"],
    [`Total revenue (${settings.currency})`, money(report.totalMinor)],
    ["Confirmed bookings", String(report.confirmedCount)],
    [`Average booking value (${settings.currency})`, report.averageMinor === null ? "" : money(report.averageMinor)],
    [`Pending, not counted (${settings.currency})`, money(report.pending.totalMinor)],
    [`Cancelled, not counted (${settings.currency})`, money(report.cancelled.totalMinor)],
    [],
    ["By court"],
    ["Court", `Revenue (${settings.currency})`, "Share (%)"],
    ...report.byCourt.map((court) => [textCell(court.name), money(court.revenueMinor), String(Math.round(court.share * 1000) / 10)]),
    [],
    ["Bookings by customer"],
    [],
    ...repeat.flatMap((group) => groupRows(group, `${textCell(group.name)} (${group.bookings.length} bookings)`)),
    ...(oneTime.bookings.length > 0 ? groupRows(oneTime, `One-time customers (${oneTime.bookings.length} bookings)`) : []),
    [`TOTAL REVENUE (${settings.currency})`, "", "", "", "", "", money(report.totalMinor)],
  ];

  return rows.map((row) => row.map(csvField).join(",")).join("\r\n");
}
