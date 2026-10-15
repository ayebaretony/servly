import { minutesOfDay } from "@/lib/time";
import type { Block } from "@/types/block";
import type { Booking } from "@/types/booking";

// Pure helpers for the "Today at a glance" court-by-time grid. Nothing here touches Firestore or React.

export type ScheduleSegment =
  | { kind: "booking"; booking: Booking; startMin: number; endMin: number }
  | { kind: "block"; block: Block; startMin: number; endMin: number }
  // `past` is true when the whole stretch is already behind the current time
  | { kind: "free"; startMin: number; endMin: number; past: boolean };

type Occupied = { startMin: number; endMin: number } & (
  | { kind: "booking"; booking: Booking }
  | { kind: "block"; block: Block }
);

type RowInput = {
  bookings: Booking[]; // this court's bookings for the day
  blocks: Block[]; // this court's maintenance blocks for the day
  openMin: number;
  closeMin: number;
  nowMin: number | null; // null when "now" is outside the day's window
  timezone: string;
};

function occupiedFrom(input: RowInput): Occupied[] {
  const { openMin, closeMin, timezone } = input;
  const items: Occupied[] = [];

  const add = (item: Occupied) => {
    // Anything outside opening hours is clipped to the window
    const startMin = Math.max(item.startMin, openMin);
    const endMin = Math.min(item.endMin, closeMin);
    if (endMin > startMin) items.push({ ...item, startMin, endMin });
  };

  for (const booking of input.bookings) {
    if (booking.status === "cancelled") continue;
    const startMin = minutesOfDay(booking.startAt.toDate(), timezone);
    add({ kind: "booking", booking, startMin, endMin: startMin + booking.durationMinutes });
  }
  for (const block of input.blocks) {
    const startMin = minutesOfDay(block.startAt.toDate(), timezone);
    const minutes = Math.round((block.endAt.toMillis() - block.startAt.toMillis()) / 60_000);
    add({ kind: "block", block, startMin, endMin: startMin + minutes });
  }
  return items.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
}

// One court's row, left to right: bookings and blocks where they are, "free" stretches in every gap.
// Together the segments always cover opening to closing exactly once.
export function buildCourtRow(input: RowInput): ScheduleSegment[] {
  const { openMin, closeMin, nowMin } = input;
  const segments: ScheduleSegment[] = [];

  const pushFree = (startMin: number, endMin: number) => {
    if (endMin <= startMin) return;
    // The current time splits a free stretch into a part that is gone and a part that can still be booked
    if (nowMin !== null && nowMin > startMin && nowMin < endMin) {
      segments.push({ kind: "free", startMin, endMin: nowMin, past: true });
      segments.push({ kind: "free", startMin: nowMin, endMin, past: false });
      return;
    }
    segments.push({ kind: "free", startMin, endMin, past: nowMin !== null && nowMin >= endMin });
  };

  let cursor = openMin;
  for (const item of occupiedFrom(input)) {
    // Slot documents stop two things sharing a slot, so overlaps shouldn't exist; if one does, it is trimmed rather than drawn on top
    if (item.endMin <= cursor) continue;
    const startMin = Math.max(item.startMin, cursor);
    pushFree(cursor, startMin);
    segments.push({ ...item, startMin });
    cursor = item.endMin;
  }
  pushFree(cursor, closeMin);
  return segments;
}

// The earliest start inside a free stretch that sits on the slot grid and leaves room for one slot. null when none does.
export function firstBookableStart(startMin: number, endMin: number, openMin: number, slotMinutes: number): number | null {
  const aligned = openMin + Math.ceil((startMin - openMin) / slotMinutes) * slotMinutes;
  return aligned + slotMinutes <= endMin ? aligned : null;
}

// Where a time sits along the row, as a percentage of opening to closing
export function percentAlong(minute: number, openMin: number, closeMin: number): number {
  return ((minute - openMin) / (closeMin - openMin)) * 100;
}
