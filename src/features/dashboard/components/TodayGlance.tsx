import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useOpenNewBookingOn } from "@/app/useOpenNewBookingOn";
import { Card } from "@/components/ui/Card";
import { EmptyMessage, ErrorMessage } from "@/components/ui/StateMessages";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/features/auth/useAuth";
import { BookingDetailsModal } from "@/features/bookings/components/BookingDetailsModal";
import { BookingFormModal } from "@/features/bookings/components/BookingFormModal";
import { CancelBookingModal } from "@/features/bookings/components/CancelBookingModal";
import { formatBookingTotal } from "@/lib/money";
import { formatMinutes, formatTimeRange, minutesOfDay, parseHHmm, todayInTimezone } from "@/lib/time";
import type { AsyncData } from "@/lib/useAsyncData";
import { useNow } from "@/lib/useNow";
import { blockHatch, courtTint, courtVars } from "@/features/calendar/calendar.style";
import { courtColorCss } from "@/theme/courtColors";
import type { Block } from "@/types/block";
import type { Booking } from "@/types/booking";
import type { Court } from "@/types/court";
import type { CenterSettings } from "@/types/settings";
import { buildCourtRow, firstBookableStart, percentAlong, type ScheduleSegment } from "../schedule.layout";

type TodayGlanceProps = {
  today: string;
  todayBookings: AsyncData<Booking[]>;
  todayBlocks: AsyncData<Block[]>;
  courts: Court[];
  settings: CenterSettings;
};

// Width of the court-name column, and how much room one hour gets before the grid scrolls sideways
// The column is narrower on phones (set on the grid below) so the timeline keeps most of the width
const LABEL_WIDTH = "var(--label)";
const REM_PER_HOUR = 3.25;

type Dialog = { kind: "view" | "edit" | "cancel"; booking: Booking } | null;

// A court-by-time grid of today: bookings and maintenance where they are, free stretches in between (click one to book it).
// Bookings come from a live listener, so the grid updates by itself.
export function TodayGlance({ today, todayBookings, todayBlocks, courts, settings }: TodayGlanceProps) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const closeDialog = () => setDialog(null);

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="type-h2">Today at a glance</h2>
          <p className="mt-1 text-xs text-muted">
            Court availability from {formatMinutes(parseHHmm(settings.openTime))} to {formatMinutes(parseHHmm(settings.closeTime))}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* The bookings really are live (onSnapshot), so the badge is true, not decoration */}
          <span className="inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-[11px] font-medium text-ink">
            <span aria-hidden="true" className="size-1.5 rounded-pill bg-success" />
            Live schedule
          </span>
          <Link to="/calendar" className="focus-ring rounded-chip text-xs font-medium text-primary hover:underline">
            View calendar
          </Link>
        </div>
      </div>

      <div className="mt-5">
        <GlanceBody
          today={today}
          todayBookings={todayBookings}
          todayBlocks={todayBlocks}
          courts={courts}
          settings={settings}
          onOpenBooking={(booking) => setDialog({ kind: "view", booking })}
        />
      </div>

      {dialog?.kind === "view" && (
        <BookingDetailsModal
          booking={dialog.booking}
          settings={settings}
          today={today}
          onClose={closeDialog}
          onChanged={() => {}} // the live listener already refreshes the grid
          onCancel={() => setDialog({ kind: "cancel", booking: dialog.booking })}
          onEdit={() => setDialog({ kind: "edit", booking: dialog.booking })}
        />
      )}
      {dialog?.kind === "edit" && <BookingFormModal booking={dialog.booking} onClose={closeDialog} onSaved={() => {}} />}
      {dialog?.kind === "cancel" && (
        <CancelBookingModal booking={dialog.booking} settings={settings} today={today} onClose={closeDialog} onDone={() => {}} />
      )}
    </Card>
  );
}

type BodyProps = TodayGlanceProps & { onOpenBooking: (booking: Booking) => void };

function GlanceBody({ today, todayBookings, todayBlocks, courts, settings, onOpenBooking }: BodyProps) {
  if (todayBookings.status === "loading" || todayBlocks.status === "loading") {
    return (
      <div role="status" aria-label="Loading today's schedule" className="space-y-3">
        {[0, 1, 2].map((n) => (
          <Skeleton key={n} className="h-16 w-full" />
        ))}
      </div>
    );
  }
  if (todayBookings.status === "error") return <ErrorMessage message={todayBookings.message} onRetry={todayBookings.retry} />;
  if (todayBlocks.status === "error") return <ErrorMessage message={todayBlocks.message} onRetry={todayBlocks.retry} />;

  if (courts.length === 0) {
    return (
      <EmptyMessage
        title="No courts yet"
        hint="Once courts are added, today's schedule for each one shows up here."
        action={
          <Link to="/courts" className="btn btn-secondary">
            Go to courts
          </Link>
        }
      />
    );
  }

  return (
    <ScheduleGrid
      today={today}
      bookings={todayBookings.data}
      blocks={todayBlocks.data}
      courts={courts}
      settings={settings}
      onOpenBooking={onOpenBooking}
    />
  );
}

type GridProps = {
  today: string;
  bookings: Booking[];
  blocks: Block[];
  courts: Court[];
  settings: CenterSettings;
  onOpenBooking: (booking: Booking) => void;
};

function ScheduleGrid({ today, bookings, blocks, courts, settings, onOpenBooking }: GridProps) {
  const auth = useAuth();
  // Admins may book times that already passed (AGENTS.md section 7); staff may not
  const isAdmin = auth.status === "active" && auth.profile.role === "admin";
  const openNewBookingOn = useOpenNewBookingOn();
  const now = useNow();
  const scrollRef = useRef<HTMLDivElement>(null);

  const openMin = parseHHmm(settings.openTime);
  const closeMin = parseHHmm(settings.closeTime);
  const slotMinutes = settings.slotMinutes;
  // null once the day has rolled over while the page stayed open
  const nowMin = todayInTimezone(settings.timezone, now) === today ? minutesOfDay(now, settings.timezone) : null;
  const nowInWindow = nowMin !== null && nowMin >= openMin && nowMin <= closeMin;

  const rows = useMemo(
    () =>
      courts.map((court) => ({
        court,
        segments: buildCourtRow({
          bookings: bookings.filter((b) => b.courtId === court.id),
          blocks: blocks.filter((b) => b.courtId === court.id),
          openMin,
          closeMin,
          nowMin,
          timezone: settings.timezone,
        }),
      })),
    [courts, bookings, blocks, openMin, closeMin, nowMin, settings.timezone],
  );

  const hourMarks: number[] = [];
  for (let minute = Math.ceil(openMin / 60) * 60; minute <= closeMin; minute += 60) hourMarks.push(minute);
  const gridWidth = `calc(${LABEL_WIDTH} + ${((closeMin - openMin) / 60) * REM_PER_HOUR}rem)`;

  // On a narrow screen the grid scrolls sideways; start with the current time in view instead of at opening
  const scrolled = useRef(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || scrolled.current || !nowInWindow || el.scrollWidth <= el.clientWidth) return;
    scrolled.current = true;
    const labelPx = el.querySelector("li > div")?.getBoundingClientRect().width ?? 0;
    const timelinePx = el.scrollWidth - labelPx;
    const nowPx = labelPx + (percentAlong(nowMin, openMin, closeMin) / 100) * timelinePx;
    el.scrollLeft = Math.max(0, nowPx - el.clientWidth * 0.4);
  }, [nowInWindow, nowMin, openMin, closeMin]);

  return (
    <div ref={scrollRef} className="overflow-x-auto">
      <div className="relative [--label:7rem] sm:[--label:11rem]" style={{ minWidth: gridWidth }}>
        {/* Hour labels. Decorative: every booking and free slot says its own time. */}
        <div aria-hidden="true" className="grid h-6" style={{ gridTemplateColumns: `${LABEL_WIDTH} 1fr` }}>
          <div />
          <div className="relative text-[11px] text-muted">
            {hourMarks.map((minute, index) => (
              <span
                key={minute}
                className="absolute whitespace-nowrap"
                style={{
                  left: `${percentAlong(minute, openMin, closeMin)}%`,
                  transform: `translateX(${index === 0 && minute === openMin ? "0" : minute === closeMin ? "-100%" : "-50%"})`,
                }}
              >
                {/* Marks are always on the hour, so "7:00 AM" shortens to "7 AM" and neighbours never touch */}
                {formatMinutes(minute).replace(":00", "")}
              </span>
            ))}
          </div>
        </div>

        <ol>
          {rows.map(({ court, segments }) => (
            <li
              key={court.id}
              className="grid items-center border-t"
              style={{ gridTemplateColumns: `${LABEL_WIDTH} 1fr` }}
            >
              <div className="sticky left-0 z-10 min-w-0 bg-surface py-3 pr-4">
                <span
                  style={{ ...courtVars(courtColorCss(court.color)), backgroundColor: `color-mix(in srgb, ${courtColorCss(court.color)} 14%, white)` }}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-xs font-semibold text-ink"
                >
                  <span aria-hidden="true" className="court-dot" />
                  <span className="truncate">{court.name}</span>
                </span>
                <p className="mt-1 truncate text-xs text-muted">
                  {court.status === "maintenance" ? "In maintenance" : court.surface}
                </p>
              </div>

              <div className="relative h-[4.5rem]">
                {segments.map((segment) => (
                  <Segment
                    key={`${segment.kind}-${segment.startMin}`}
                    segment={segment}
                    court={court}
                    openMin={openMin}
                    closeMin={closeMin}
                    slotMinutes={slotMinutes}
                    isAdmin={isAdmin}
                    settings={settings}
                    onOpenBooking={onOpenBooking}
                    onBookFree={(startMin) => openNewBookingOn({ date: today, startMin, courtId: court.id })}
                  />
                ))}
              </div>
            </li>
          ))}
        </ol>

        {nowInWindow && (
          // The "now" line runs over every row; clicks pass through it
          <div aria-hidden="true" className="pointer-events-none absolute bottom-0 top-0 z-20" style={{ left: LABEL_WIDTH, right: 0 }}>
            <div className="absolute bottom-0 top-5 w-px bg-primary" style={{ left: `${percentAlong(nowMin, openMin, closeMin)}%` }}>
              <span className="absolute -left-[3px] -top-1 size-[7px] rounded-pill bg-primary" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type SegmentProps = {
  segment: ScheduleSegment;
  court: Court;
  openMin: number;
  closeMin: number;
  slotMinutes: number;
  isAdmin: boolean;
  settings: CenterSettings;
  onOpenBooking: (booking: Booking) => void;
  onBookFree: (startMin: number) => void;
};

function Segment({ segment, court, openMin, closeMin, slotMinutes, isAdmin, settings, onOpenBooking, onBookFree }: SegmentProps) {
  const left = percentAlong(segment.startMin, openMin, closeMin);
  const width = percentAlong(segment.endMin, openMin, closeMin) - left;
  // A 2px gap on each side keeps neighbours from touching
  const position = { left: `calc(${left}% + 2px)`, width: `calc(${width}% - 4px)` };
  const base = "absolute inset-y-1.5 flex flex-col justify-center overflow-hidden rounded-xl border px-3 text-left";
  const minutes = segment.endMin - segment.startMin;
  const color = courtColorCss(court.color);

  if (segment.kind === "booking") {
    const { booking } = segment;
    const range = formatTimeRange(booking.startAt.toDate(), booking.endAt.toDate(), settings.timezone);
    const summary = `${range} · ${formatBookingTotal(booking, settings.currency)}${booking.status === "pending" ? " · Pending" : ""}`;
    return (
      <button
        type="button"
        onClick={() => onOpenBooking(booking)}
        title={`${booking.customerName}, ${summary}`}
        aria-label={`${booking.customerName}, ${court.name}, ${summary}. Open details`}
        style={{
          ...position,
          ...courtTint(color),
          backgroundColor: `color-mix(in srgb, ${color} 16%, white)`,
          borderColor: `color-mix(in srgb, ${color} 40%, white)`,
          borderStyle: booking.status === "pending" ? "dashed" : "solid",
        }}
        className={`${base} focus-ring transition-shadow hover:shadow-md`}
      >
        <span className="truncate text-[13px] font-semibold text-ink">{booking.customerName}</span>
        {minutes >= 60 && <span className="line-clamp-2 text-[11px] leading-snug text-muted">{summary}</span>}
      </button>
    );
  }

  if (segment.kind === "block") {
    const { block } = segment;
    return (
      <div
        title={`Maintenance: ${block.reason}`}
        style={{ ...position, ...blockHatch(color), borderColor: `color-mix(in srgb, ${color} 40%, white)` }}
        className={base}
      >
        <span className="truncate text-[13px] font-semibold text-ink">Maintenance</span>
        {minutes >= 60 && <span className="truncate text-[11px] text-muted">{block.reason}</span>}
      </div>
    );
  }

  // Free stretch on a court that is open for bookings. Time that already passed can only be booked by an admin.
  const clickable = court.status !== "maintenance" && (isAdmin || !segment.past);
  const startMin = clickable ? firstBookableStart(segment.startMin, segment.endMin, openMin, slotMinutes) : null;
  const label = minutes >= 90 ? "Free slot" : minutes >= 45 ? "Free" : null;

  if (startMin === null) {
    // Not bookable: dashed and faded, so it can't be mistaken for a free slot
    return (
      <div
        title={segment.past ? "This time has passed" : undefined}
        style={position}
        className={`${base} items-center border-dashed border-border bg-transparent text-[11px] text-muted ${segment.past ? "opacity-50" : ""}`}
      >
        {court.status === "maintenance" && minutes >= 90 ? "Unavailable" : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onBookFree(startMin)}
      aria-label={`Free on ${court.name} from ${formatMinutes(startMin)} to ${formatMinutes(segment.endMin)}. Book it`}
      style={position}
      className={`${base} focus-ring items-center border-border bg-sidebar text-[11px] font-medium text-muted transition-colors hover:border-primary hover:text-primary`}
    >
      {label ?? <Plus aria-hidden="true" className="size-3.5" />}
    </button>
  );
}
