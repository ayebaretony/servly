import { csvField, textCell } from "@/features/bookings/bookings.export";
import { minorToMajorInput } from "@/lib/money";
import { formatMonthYear } from "@/lib/time";
import type { CenterSettings } from "@/types/settings";
import type { RevenueReport } from "./revenue.metrics";

// One file with three small tables (summary, by court, by day). Amounts are plain numbers so a spreadsheet can add them up.
export function buildRevenueCsv(report: RevenueReport, settings: CenterSettings): string {
  const money = (minor: number) => minorToMajorInput(minor);
  const amountHeader = `Revenue (${settings.currency})`;

  const rows: string[][] = [
    ["Revenue report", formatMonthYear(report.month)],
    ["Revenue counts confirmed bookings only"],
    [],
    ["Summary"],
    [`Total revenue (${settings.currency})`, money(report.totalMinor)],
    ["Confirmed bookings", String(report.confirmedCount)],
    [`Average booking value (${settings.currency})`, report.averageMinor === null ? "" : money(report.averageMinor)],
    [`Pending (${settings.currency})`, money(report.pending.totalMinor)],
    ["Pending bookings", String(report.pending.count)],
    [`Cancelled (${settings.currency})`, money(report.cancelled.totalMinor)],
    ["Cancelled bookings", String(report.cancelled.count)],
    [],
    ["By court"],
    ["Court", amountHeader, "Share (%)"],
    ...report.byCourt.map((court) => [textCell(court.name), money(court.revenueMinor), String(Math.round(court.share * 1000) / 10)]),
    [],
    ["By day"],
    ["Date", "Confirmed bookings", amountHeader],
    ...report.daily.map((day) => [day.date, String(day.bookingCount), day.revenueMinor === null ? "" : money(day.revenueMinor)]),
  ];

  return rows.map((row) => row.map(csvField).join(",")).join("\r\n");
}
