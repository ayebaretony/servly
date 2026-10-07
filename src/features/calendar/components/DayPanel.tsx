import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyMessage } from "@/components/ui/StateMessages";
import { formatMoney } from "@/lib/money";
import { formatTimeRange, formatWeekdayDate } from "@/lib/time";
import type { AsyncData } from "@/lib/useAsyncData";
import type { Block } from "@/types/block";
import type { Booking } from "@/types/booking";
import type { CenterSettings } from "@/types/settings";
import { summarizeDay } from "../calendar.layout";
import { courtVars } from "../calendar.style";

type DayPanelProps = {
  date: string;
  bookings: AsyncData<Booking[]>; // that day's bookings, earliest first
  blocks: Block[]; // that day's maintenance blocks
  colorOf: (courtId: string) => string;
  courtNameOf: (courtId: string) => string;
  settings: CenterSettings;
  onNewBooking: () => void;
  onOpenBooking: (booking: Booking) => void;
  onOpenBlock: (block: Block) => void;
};

// Right-hand panel: the selected day, how many bookings and how much revenue it has, and each booking in order
export function DayPanel({
  date,
  bookings,
  blocks,
  colorOf,
  courtNameOf,
  settings,
  onNewBooking,
  onOpenBooking,
  onOpenBlock,
}: DayPanelProps) {
  const summary = bookings.status === "ready" ? summarizeDay(bookings.data) : null;

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-ink">{formatWeekdayDate(date)}</h2>
      <p aria-live="polite" className="mt-1 text-xs text-muted">
        {summary
          ? `${summary.count} ${summary.count === 1 ? "booking" : "bookings"} · ${formatMoney(summary.revenueMinor, settings.currency)} revenue`
          : bookings.status === "loading"
            ? "Loading…"
            : "Bookings unavailable"}
      </p>

      <div className="mt-4">
        {bookings.status === "loading" && (
          <div role="status" aria-label="Loading this day's bookings" className="space-y-3">
            {[0, 1, 2].map((n) => (
              <Skeleton key={n} className="h-12 w-full" />
            ))}
          </div>
        )}

        {bookings.status === "error" && (
          // The calendar itself shows the error and the retry button
          <p className="text-xs text-muted">Try again from the calendar to see this day.</p>
        )}

        {bookings.status === "ready" && bookings.data.length === 0 && blocks.length === 0 && (
          <EmptyMessage
            title="No bookings on this day"
            hint="The courts are free."
            action={<Button onClick={onNewBooking}>New booking</Button>}
          />
        )}

        {bookings.status === "ready" && bookings.data.length > 0 && (
          <ul className="divide-y border-t">
            {bookings.data.map((booking) => (
              <li key={booking.id}>
                <button
                  type="button"
                  onClick={() => onOpenBooking(booking)}
                  className="focus-ring flex w-full items-start justify-between gap-3 py-3 text-left transition-colors hover:bg-sidebar"
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-ink">
                      {formatTimeRange(booking.startAt.toDate(), booking.endAt.toDate(), settings.timezone)}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      <span aria-hidden="true" className="court-dot" style={courtVars(colorOf(booking.courtId))} />
                      <span className="truncate">
                        {booking.customerName} · {booking.courtName}
                        {booking.status === "pending" && " · Pending"}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-ink">
                    {formatMoney(booking.totalMinor, settings.currency)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {bookings.status === "ready" && blocks.length > 0 && (
          <section aria-label="Blocked time" className={bookings.data.length > 0 ? "mt-4" : ""}>
            <h3 className="type-overline text-muted">Blocked time</h3>
            <ul className="mt-2 divide-y border-t">
              {blocks.map((block) => (
                <li key={block.id}>
                  <button
                    type="button"
                    onClick={() => onOpenBlock(block)}
                    className="focus-ring flex w-full items-start gap-2 py-3 text-left transition-colors hover:bg-sidebar"
                  >
                    <Wrench aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-muted" />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-ink">
                        {formatTimeRange(block.startAt.toDate(), block.endAt.toDate(), settings.timezone)}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                        <span aria-hidden="true" className="court-dot" style={courtVars(colorOf(block.courtId))} />
                        <span className="truncate">
                          {courtNameOf(block.courtId)} · {block.reason}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Card>
  );
}
