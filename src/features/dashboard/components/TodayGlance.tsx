import { Link } from "react-router-dom";
import { useOpenNewBooking } from "@/app/useOpenNewBooking";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyMessage, ErrorMessage } from "@/components/ui/StateMessages";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatShortDate, formatTimeRange, hourLabels } from "@/lib/time";
import type { AsyncData } from "@/lib/useAsyncData";
import { courtColorCss } from "@/theme/courtColors";
import type { Booking } from "@/types/booking";
import type { Court } from "@/types/court";
import type { CenterSettings } from "@/types/settings";

type TodayGlanceProps = {
  today: string;
  todayBookings: AsyncData<Booking[]>;
  courts: Court[];
  settings: CenterSettings;
};

export function TodayGlance({ today, todayBookings, courts, settings }: TodayGlanceProps) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="type-h2">Today at a glance</h2>
          <p className="mt-1 text-xs text-muted">{formatShortDate(today)}</p>
        </div>
        <Link to="/calendar" className="focus-ring rounded-chip text-xs font-medium text-primary hover:underline">
          View calendar
        </Link>
      </div>

      <div className="mt-5">
        <GlanceBody todayBookings={todayBookings} courts={courts} settings={settings} />
      </div>
    </Card>
  );
}

function GlanceBody({ todayBookings, courts, settings }: Omit<TodayGlanceProps, "today">) {
  const openNewBooking = useOpenNewBooking();

  if (todayBookings.status === "loading") {
    return (
      <div role="status" aria-label="Loading today's bookings" className="space-y-2">
        {[0, 1, 2].map((n) => (
          <Skeleton key={n} className="h-14 w-full" />
        ))}
      </div>
    );
  }
  if (todayBookings.status === "error") {
    return <ErrorMessage message={todayBookings.message} onRetry={todayBookings.retry} />;
  }

  const visible = todayBookings.data.filter((b) => b.status !== "cancelled");
  if (visible.length === 0) {
    return (
      <EmptyMessage
        title="No bookings today yet"
        hint="New bookings for today will show up here."
        action={<Button onClick={openNewBooking}>New booking</Button>}
      />
    );
  }

  const colorByCourt = new Map(courts.map((court) => [court.id, courtColorCss(court.color)]));

  return (
    <div className="flex gap-4">
      {/* Hour labels, as in the design. Decorative: the bookings list is what carries the information. */}
      <div aria-hidden="true" className="hidden w-14 shrink-0 text-[11px] leading-5 text-muted sm:block">
        {hourLabels(settings.openTime, settings.closeTime).map((label) => (
          <p key={label}>{label}</p>
        ))}
      </div>

      <ol className="min-w-0 flex-1 space-y-2 sm:border-l sm:pl-4">
        {visible.map((booking) => {
          const color = colorByCourt.get(booking.courtId) ?? courtColorCss("");
          return (
            <li
              key={booking.id}
              style={{
                borderLeftColor: color,
                backgroundColor: `color-mix(in srgb, ${color} 12%, white)`,
              }}
              className="rounded-chip border-l-[3px] px-3 py-2.5"
            >
              <p className="truncate text-[13px] font-medium text-ink">
                {booking.courtName} · {booking.customerName}
              </p>
              <p className="text-[11px] text-muted">
                {formatTimeRange(booking.startAt.toDate(), booking.endAt.toDate(), settings.timezone)}
                {booking.status === "pending" && " · Pending"}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
