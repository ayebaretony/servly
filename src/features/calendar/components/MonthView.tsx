import { Plus, Wrench } from "lucide-react";
import type { MouseEvent } from "react";
import { addDays, dayOfMonth, dayOfWeek, formatClock, formatWeekdayDate, monthEnd, monthStart } from "@/lib/time";
import type { Block } from "@/types/block";
import type { Booking } from "@/types/booking";
import type { CalendarEvent } from "../calendar.layout";
import { blockHatch, courtTint } from "../calendar.style";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// More than this many bookings in a day shows "+N more"
const MAX_CHIPS = 3;

type MonthViewProps = {
  month: string; // any date inside the month on show
  today: string;
  selectedDate: string;
  bookingsByDate: Map<string, Booking[]>;
  blocksByDate: Map<string, Block[]>;
  colorOf: (courtId: string) => string; // CSS colour of a court
  courtNameOf: (courtId: string) => string;
  timezone: string;
  onSelectDay: (date: string) => void;
  onNewBooking: (date: string) => void;
  onOpenBooking: (booking: Booking) => void;
  onOpenBlock: (block: Block) => void;
  onShowDay: (date: string) => void; // "+N more"
};

export function MonthView({
  month,
  today,
  selectedDate,
  bookingsByDate,
  blocksByDate,
  colorOf,
  courtNameOf,
  timezone,
  onSelectDay,
  onNewBooking,
  onOpenBooking,
  onOpenBlock,
  onShowDay,
}: MonthViewProps) {
  const first = monthStart(month);
  const dayCount = Number(monthEnd(month).slice(-2));
  // The design leaves the days of the neighbouring months empty, so only blanks fill the first and last weeks
  const leading = dayOfWeek(first);
  const trailing = (7 - ((leading + dayCount) % 7)) % 7;

  return (
    // Sideways scroll on a phone, where seven columns would be too narrow to read
    <div className="overflow-x-auto">
      {/* The 1px gaps over a border-coloured background draw the grid lines */}
      <div className="grid min-w-[680px] grid-cols-7 gap-px bg-border">
        {WEEKDAYS.map((name) => (
          <div key={name} className="type-overline bg-sidebar px-3 py-2.5 text-muted">
            {name}
          </div>
        ))}

        {Array.from({ length: leading }, (_, n) => (
          <div key={`lead-${n}`} aria-hidden="true" className="min-h-28 bg-page" />
        ))}

        {Array.from({ length: dayCount }, (_, n) => {
          const date = addDays(first, n);
          return (
            <DayCell
              key={date}
              date={date}
              isToday={date === today}
              isSelected={date === selectedDate}
              bookings={bookingsByDate.get(date) ?? []}
              blocks={blocksByDate.get(date) ?? []}
              colorOf={colorOf}
              courtNameOf={courtNameOf}
              timezone={timezone}
              onSelectDay={onSelectDay}
              onNewBooking={onNewBooking}
              onOpenBooking={onOpenBooking}
              onOpenBlock={onOpenBlock}
              onShowDay={onShowDay}
            />
          );
        })}

        {Array.from({ length: trailing }, (_, n) => (
          <div key={`trail-${n}`} aria-hidden="true" className="min-h-28 bg-page" />
        ))}
      </div>
    </div>
  );
}

type DayCellProps = Pick<
  MonthViewProps,
  "colorOf" | "courtNameOf" | "timezone" | "onSelectDay" | "onNewBooking" | "onOpenBooking" | "onOpenBlock" | "onShowDay"
> & {
  date: string;
  isToday: boolean;
  isSelected: boolean;
  bookings: Booking[];
  blocks: Block[];
};

function DayCell({
  date,
  isToday,
  isSelected,
  bookings,
  blocks,
  colorOf,
  courtNameOf,
  timezone,
  onSelectDay,
  onNewBooking,
  onOpenBooking,
  onOpenBlock,
  onShowDay,
}: DayCellProps) {
  // Maintenance blocks first: they close a court for the day, so they matter most at a glance
  const events: CalendarEvent[] = [
    ...blocks.map((block) => ({ kind: "block" as const, block })),
    ...bookings.map((booking) => ({ kind: "booking" as const, booking })),
  ];
  const shown = events.slice(0, MAX_CHIPS);
  const extra = events.length - shown.length;
  const stop = (event: MouseEvent) => event.stopPropagation();

  return (
    // Clicking the empty part of a day starts a booking on it. The "+" button inside is the keyboard way to do the same.
    <div
      onClick={() => onNewBooking(date)}
      className={`group relative min-h-28 cursor-pointer p-2 transition-colors hover:bg-sidebar ${
        isSelected ? "bg-sidebar" : "bg-surface"
      }`}
    >
      <div className="flex items-start justify-between">
        <button
          type="button"
          onClick={(event) => {
            stop(event);
            onSelectDay(date);
          }}
          aria-pressed={isSelected}
          aria-current={isToday ? "date" : undefined}
          aria-label={`${formatWeekdayDate(date)}, ${bookings.length} ${bookings.length === 1 ? "booking" : "bookings"}`}
          className={`focus-ring grid size-6 place-items-center rounded-pill text-xs font-semibold transition-colors ${
            isToday
              ? "bg-primary text-white"
              : isSelected
                ? "border border-primary text-primary"
                : "text-ink hover:bg-border"
          }`}
        >
          {dayOfMonth(date)}
        </button>

        <button
          type="button"
          onClick={(event) => {
            stop(event);
            onNewBooking(date);
          }}
          aria-label={`New booking on ${formatWeekdayDate(date)}`}
          className="focus-ring grid size-6 place-items-center rounded-button text-muted opacity-0 transition-opacity hover:bg-border hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Plus aria-hidden="true" className="size-3.5" />
        </button>
      </div>

      <ul className="mt-1.5 space-y-1">
        {shown.map((event) =>
          event.kind === "block" ? (
            <li key={event.block.id}>
              <button
                type="button"
                onClick={(e) => {
                  stop(e);
                  onOpenBlock(event.block);
                }}
                style={blockHatch(colorOf(event.block.courtId))}
                title={`Maintenance · ${courtNameOf(event.block.courtId)} · ${event.block.reason}`}
                className="court-chip focus-ring w-full text-left text-[11px]"
              >
                <span className="flex items-center gap-1">
                  <Wrench aria-hidden="true" className="size-3 shrink-0" />
                  <span className="truncate">
                    {courtNameOf(event.block.courtId)} · {formatClock(event.block.startAt.toDate(), timezone)}
                  </span>
                </span>
              </button>
            </li>
          ) : (
            <li key={event.booking.id}>
              <button
                type="button"
                onClick={(e) => {
                  stop(e);
                  onOpenBooking(event.booking);
                }}
                style={courtTint(colorOf(event.booking.courtId))}
                title={`${event.booking.customerName} · ${event.booking.courtName}${event.booking.status === "pending" ? " · Pending" : ""}`}
                className="court-chip focus-ring w-full text-left text-[11px]"
              >
                {event.booking.customerName} · {formatClock(event.booking.startAt.toDate(), timezone)}
              </button>
            </li>
          ),
        )}
      </ul>

      {extra > 0 && (
        <button
          type="button"
          onClick={(event) => {
            stop(event);
            onShowDay(date);
          }}
          className="focus-ring mt-1 rounded-chip px-1 text-[11px] font-semibold text-primary hover:underline"
        >
          +{extra} more
        </button>
      )}
    </div>
  );
}
