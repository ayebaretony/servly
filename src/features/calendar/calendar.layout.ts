import { minutesOfDay, todayInTimezone } from "@/lib/time";
import type { Block } from "@/types/block";
import type { Booking } from "@/types/booking";

// Pure helpers for the Month, Week and Day views. Nothing here touches Firestore or React.

export function groupByDate(bookings: Booking[]): Map<string, Booking[]> {
  const byDate = new Map<string, Booking[]>();
  for (const booking of bookings) {
    const list = byDate.get(booking.date);
    if (list) list.push(booking);
    else byDate.set(booking.date, [booking]);
  }
  return byDate;
}

// Revenue counts confirmed bookings only; pending ones are shown but not counted (AGENTS.md section 12, decision 2)
export function summarizeDay(bookings: Booking[]): { count: number; revenueMinor: number } {
  return {
    count: bookings.length,
    revenueMinor: bookings.filter((b) => b.status === "confirmed").reduce((sum, b) => sum + b.totalMinor, 0),
  };
}

// Something drawn on the calendar: a booking, or a maintenance block closing a court
export type CalendarEvent = { kind: "booking"; booking: Booking } | { kind: "block"; block: Block };

export function eventId(event: CalendarEvent): string {
  return event.kind === "booking" ? event.booking.id : event.block.id;
}

function eventTimes(event: CalendarEvent) {
  const { startAt, endAt } = event.kind === "booking" ? event.booking : event.block;
  return { start: startAt.toDate(), minutes: Math.round((endAt.toMillis() - startAt.toMillis()) / 60_000) };
}

export type PlacedEvent = {
  event: CalendarEvent;
  startMin: number; // minutes since midnight at the center
  endMin: number;
  lane: number; // 0-based column inside its group of overlapping events
  lanes: number; // how many columns that group needs
};

// Places one day's events on a time grid. Events that overlap in time (different courts at the same hour)
// sit side by side, each in its own lane, instead of covering one another.
export function placeEvents(events: CalendarEvent[], timezone: string): PlacedEvent[] {
  const items = events
    .map((event) => {
      const { start, minutes } = eventTimes(event);
      // Nothing crosses midnight (it stays inside opening hours), so the length gives the end
      const startMin = minutesOfDay(start, timezone);
      return { event, startMin, endMin: startMin + minutes };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const placed: PlacedEvent[] = [];
  let group: { item: (typeof items)[number]; lane: number }[] = [];
  let groupEnd = -1;
  let laneEnds: number[] = []; // when each lane in the current group becomes free

  const closeGroup = () => {
    for (const member of group) placed.push({ ...member.item, lane: member.lane, lanes: laneEnds.length });
    group = [];
    laneEnds = [];
  };

  for (const item of items) {
    // Starting after everything in the group has ended begins a new group
    if (group.length > 0 && item.startMin >= groupEnd) closeGroup();

    let lane = laneEnds.findIndex((end) => end <= item.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.endMin);
    } else {
      laneEnds[lane] = item.endMin;
    }
    group.push({ item, lane });
    groupEnd = Math.max(groupEnd, item.endMin);
  }
  closeGroup();

  return placed;
}

// The day a block falls on, at the center. Blocks stay inside one day.
export function groupBlocksByDate(blocks: Block[], timezone: string): Map<string, Block[]> {
  const byDate = new Map<string, Block[]>();
  for (const block of blocks) {
    const date = todayInTimezone(timezone, block.startAt.toDate());
    const list = byDate.get(date);
    if (list) list.push(block);
    else byDate.set(date, [block]);
  }
  return byDate;
}
