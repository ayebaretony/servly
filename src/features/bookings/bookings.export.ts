import { minorToMajorInput } from "@/lib/money";
import { formatClock } from "@/lib/time";
import type { Booking } from "@/types/booking";
import type { CenterSettings } from "@/types/settings";

const STATUS_LABEL = { confirmed: "Confirmed", pending: "Pending", cancelled: "Cancelled" } as const;

// A cell starting with = + - or @ is run as a formula when the file is opened in Excel or Sheets. Customer details are
// typed by people, so text cells get a leading apostrophe to keep them as plain text.
function textCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvField(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// Same columns as the table. Amounts are plain numbers (150 or 52.50) so a spreadsheet can add them up.
export function buildBookingsCsv(bookings: Booking[], settings: CenterSettings): string {
  const header = [
    "Date",
    "Start time",
    "End time",
    "Court",
    "Customer",
    "Phone",
    "Email",
    `Rate per hour (${settings.currency})`,
    `Total (${settings.currency})`,
    "Status",
  ];
  const lines = bookings.map((booking) =>
    [
      booking.date,
      formatClock(booking.startAt.toDate(), settings.timezone),
      formatClock(booking.endAt.toDate(), settings.timezone),
      textCell(booking.courtName),
      textCell(booking.customerName),
      textCell(booking.customerPhone),
      textCell(booking.customerEmail ?? ""),
      minorToMajorInput(booking.hourlyRateMinor),
      minorToMajorInput(booking.totalMinor),
      STATUS_LABEL[booking.status],
    ]
      .map(csvField)
      .join(","),
  );
  return [header.map(csvField).join(","), ...lines].join("\r\n");
}

// Hands the file to the browser's download. The byte-order mark makes Excel read names in Arabic and other scripts correctly.
export function downloadCsv(filename: string, content: string): void {
  const url = URL.createObjectURL(new Blob(["﻿", content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
