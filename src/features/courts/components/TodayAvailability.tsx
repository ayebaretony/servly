import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorMessage } from "@/components/ui/StateMessages";
import { formatLongDate } from "@/lib/time";
import type { AsyncData } from "@/lib/useAsyncData";
import { courtColorCss } from "@/theme/courtColors";
import type { Booking } from "@/types/booking";
import type { Court } from "@/types/court";
import type { CenterSettings } from "@/types/settings";
import { computeAvailability, formatHours } from "../courts.metrics";

type TodayAvailabilityProps = {
  today: string;
  courts: Court[];
  todayBookings: AsyncData<Booking[]>;
  settings: CenterSettings;
};

// Booked vs open court-hours for today. Each court's booked time is shown in that court's colour.
export function TodayAvailability({ today, courts, todayBookings, settings }: TodayAvailabilityProps) {
  return (
    <Card className="p-6">
      <h2 className="type-h2">Today's availability</h2>
      <p className="mt-1 text-xs text-muted">{formatLongDate(today)}</p>

      <div className="mt-5">
        {todayBookings.status === "error" ? (
          <ErrorMessage message={todayBookings.message} onRetry={todayBookings.retry} />
        ) : todayBookings.status === "loading" ? (
          <div role="status" aria-label="Loading today's availability" className="space-y-3">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : (
          <AvailabilityBar courts={courts} todayBookings={todayBookings.data} settings={settings} />
        )}
      </div>
    </Card>
  );
}

function AvailabilityBar({ courts, todayBookings, settings }: Omit<TodayAvailabilityProps, "today" | "todayBookings"> & { todayBookings: Booking[] }) {
  const availability = computeAvailability(courts, todayBookings, settings);
  const { segments, capacityMinutes } = availability;
  const summary = `${formatHours(availability.bookedMinutes)} booked, ${formatHours(availability.openMinutes)} open`;

  return (
    <>
      {/* The bar is a picture of the two numbers underneath, so screen readers get the numbers instead */}
      <div role="img" aria-label={summary} className="flex h-7 overflow-hidden rounded-button bg-border">
        {segments.map((segment) => (
          <div
            key={segment.courtId}
            title={`${segment.courtName}: ${formatHours(segment.bookedMinutes)} booked`}
            style={{ width: `${(segment.bookedMinutes / capacityMinutes) * 100}%`, backgroundColor: courtColorCss(segment.color) }}
          />
        ))}
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 rounded-pill bg-primary" />
          <dt className="sr-only">Booked</dt>
          <dd>{formatHours(availability.bookedMinutes)} booked</dd>
        </div>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 rounded-pill bg-border" />
          <dt className="sr-only">Open</dt>
          <dd>{formatHours(availability.openMinutes)} open</dd>
        </div>
      </dl>
    </>
  );
}
