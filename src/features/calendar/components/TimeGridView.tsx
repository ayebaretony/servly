import { Wrench } from "lucide-react";
import { useMemo, type MouseEvent } from "react";
import { dayOfMonth, formatMinutes, formatTimeRange, formatWeekdayShort, parseHHmm } from "@/lib/time";
import type { Block } from "@/types/block";
import type { Booking } from "@/types/booking";
import type { CenterSettings } from "@/types/settings";
import { eventId, placeEvents, type CalendarEvent } from "../calendar.layout";
import { blockHatch, courtTint } from "../calendar.style";

// Height of one hour on screen. A 30-minute booking is half of this, enough for one line of text.
const HOUR_PX = 56;
const MIN_BLOCK_PX = 22;

type TimeGridViewProps = {
  days: string[]; // 7 dates for the week view, 1 for the day view
  today: string;
  selectedDate: string;
  bookingsByDate: Map<string, Booking[]>;
  blocksByDate: Map<string, Block[]>;
  colorOf: (courtId: string) => string;
  courtNameOf: (courtId: string) => string;
  settings: CenterSettings;
  onSelectDay: (date: string) => void;
  onNewBookingAt: (date: string, startMin: number) => void;
  onOpenBooking: (booking: Booking) => void;
  onOpenBlock: (block: Block) => void;
};

// Shared by the Week and Day views: hours down the side, one column per day, bookings as blocks sized by their length
export function TimeGridView({
  days,
  today,
  selectedDate,
  bookingsByDate,
  blocksByDate,
  colorOf,
  courtNameOf,
  settings,
  onSelectDay,
  onNewBookingAt,
  onOpenBooking,
  onOpenBlock,
}: TimeGridViewProps) {
  const { timezone, slotMinutes } = settings;

  const placedByDay = useMemo(
    () =>
      new Map(
        days.map((date) => {
          const events: CalendarEvent[] = [
            ...(blocksByDate.get(date) ?? []).map((block) => ({ kind: "block" as const, block })),
            ...(bookingsByDate.get(date) ?? []).map((booking) => ({ kind: "booking" as const, booking })),
          ];
          return [date, placeEvents(events, timezone)];
        }),
      ),
    [days, bookingsByDate, blocksByDate, timezone],
  );

  // Opening hours, widened if a booking sits outside them (e.g. the hours were shortened after it was made)
  const { gridStart, gridEnd } = useMemo(() => {
    let start = parseHHmm(settings.openTime);
    let end = parseHHmm(settings.closeTime);
    for (const placed of placedByDay.values()) {
      for (const item of placed) {
        start = Math.min(start, item.startMin);
        end = Math.max(end, item.endMin);
      }
    }
    return { gridStart: Math.floor(start / 60) * 60, gridEnd: Math.ceil(end / 60) * 60 };
  }, [settings.openTime, settings.closeTime, placedByDay]);

  const hours: number[] = [];
  for (let minute = gridStart; minute < gridEnd; minute += 60) hours.push(minute);
  const bodyHeight = ((gridEnd - gridStart) / 60) * HOUR_PX;
  const isWeek = days.length > 1;

  // Clicking empty space starts a booking at the slot under the pointer
  function handleColumnClick(event: MouseEvent<HTMLDivElement>, date: string) {
    const top = event.currentTarget.getBoundingClientRect().top;
    const minutesFromTop = ((event.clientY - top) / HOUR_PX) * 60;
    onNewBookingAt(date, gridStart + Math.floor(minutesFromTop / slotMinutes) * slotMinutes);
  }

  const columns = { gridTemplateColumns: `4rem repeat(${days.length}, minmax(0, 1fr))` };

  return (
    // Sideways scroll on a phone, where seven columns would be too narrow to read
    <div className="overflow-x-auto">
      <div className={isWeek ? "min-w-[760px]" : "min-w-[320px]"}>
        <div className="grid border-b bg-sidebar" style={columns}>
          <div aria-hidden="true" />
          {days.map((date) => {
            const isToday = date === today;
            const isSelected = date === selectedDate;
            return (
              <button
                key={date}
                type="button"
                onClick={() => onSelectDay(date)}
                aria-pressed={isSelected}
                aria-current={isToday ? "date" : undefined}
                className="focus-ring flex flex-col items-center gap-1 py-2.5 transition-colors hover:bg-border/50"
              >
                <span className="type-overline text-muted">{formatWeekdayShort(date)}</span>
                <span
                  className={`grid size-7 place-items-center rounded-pill text-sm font-semibold ${
                    isToday ? "bg-primary text-white" : isSelected ? "border border-primary text-primary" : "text-ink"
                  }`}
                >
                  {dayOfMonth(date)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid" style={columns}>
          {/* Hour labels: decorative, each booking already states its own time */}
          <div aria-hidden="true" className="relative" style={{ height: bodyHeight }}>
            {hours.map((minute, index) => (
              <span
                key={minute}
                className="absolute right-2 text-[11px] text-muted"
                style={{ top: index * HOUR_PX + 2 }}
              >
                {formatMinutes(minute)}
              </span>
            ))}
          </div>

          {days.map((date) => (
            <div
              key={date}
              onClick={(event) => handleColumnClick(event, date)}
              className={`relative cursor-pointer border-l transition-colors hover:bg-sidebar/60 ${
                isWeek && date === selectedDate ? "bg-sidebar/40" : ""
              }`}
              // Hour lines, drawn from the border colour token
              style={{
                height: bodyHeight,
                backgroundImage: `repeating-linear-gradient(to bottom, var(--color-border) 0, var(--color-border) 1px, transparent 1px, transparent ${HOUR_PX}px)`,
              }}
            >
              {(placedByDay.get(date) ?? []).map(({ event, startMin, endMin, lane, lanes }) => {
                const height = Math.max(((endMin - startMin) / 60) * HOUR_PX - 2, MIN_BLOCK_PX);
                const position = {
                  top: ((startMin - gridStart) / 60) * HOUR_PX + 1,
                  height,
                  left: `calc(${(lane / lanes) * 100}% + 2px)`,
                  width: `calc(${100 / lanes}% - 4px)`,
                };

                if (event.kind === "block") {
                  const { block } = event;
                  return (
                    <button
                      key={eventId(event)}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenBlock(block);
                      }}
                      style={{ ...blockHatch(colorOf(block.courtId)), ...position }}
                      title={`Maintenance · ${courtNameOf(block.courtId)} · ${block.reason}`}
                      className="court-chip focus-ring absolute text-left"
                    >
                      <span className="flex items-center gap-1 font-semibold">
                        <Wrench aria-hidden="true" className="size-3 shrink-0" />
                        <span className="truncate">{block.reason}</span>
                      </span>
                      {height >= 40 && (
                        <span className="block truncate text-[11px] font-normal text-muted">
                          {courtNameOf(block.courtId)} · {formatTimeRange(block.startAt.toDate(), block.endAt.toDate(), timezone)}
                        </span>
                      )}
                    </button>
                  );
                }

                const { booking } = event;
                return (
                  <button
                    key={eventId(event)}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenBooking(booking);
                    }}
                    style={{ ...courtTint(colorOf(booking.courtId)), ...position }}
                    title={`${booking.customerName} · ${booking.courtName}${booking.status === "pending" ? " · Pending" : ""}`}
                    className="court-chip focus-ring absolute text-left"
                  >
                    <span className="block truncate font-semibold">{booking.customerName}</span>
                    {height >= 40 && (
                      <span className="block truncate text-[11px] font-normal text-muted">
                        {booking.courtName} · {formatTimeRange(booking.startAt.toDate(), booking.endAt.toDate(), timezone)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
