import { Link } from "react-router-dom";
import { useOpenNewBooking } from "@/app/useOpenNewBooking";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyMessage, ErrorMessage } from "@/components/ui/StateMessages";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatMoney, formatRate } from "@/lib/money";
import { formatDateAndTimeRange } from "@/lib/time";
import type { AsyncData } from "@/lib/useAsyncData";
import type { Booking } from "@/types/booking";
import type { CenterSettings } from "@/types/settings";

const COLUMNS = ["Customer", "Court", "Date & time", "Rate", "Total", "Status"];

export function RecentBookings({ recent, settings }: { recent: AsyncData<Booking[]>; settings: CenterSettings }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="type-h2">Recent bookings</h2>
        <Link to="/bookings" className="btn btn-secondary h-9 px-3 text-xs">
          View all bookings
        </Link>
      </div>

      <div className="mt-5">
        <RecentBody recent={recent} settings={settings} />
      </div>
    </Card>
  );
}

function RecentBody({ recent, settings }: { recent: AsyncData<Booking[]>; settings: CenterSettings }) {
  const openNewBooking = useOpenNewBooking();

  if (recent.status === "error") return <ErrorMessage message={recent.message} onRetry={recent.retry} />;

  if (recent.status === "ready" && recent.data.length === 0) {
    return (
      <EmptyMessage
        title="No bookings yet"
        hint="Create your first booking to see it here."
        action={<Button onClick={openNewBooking}>New booking</Button>}
      />
    );
  }

  // Tables scroll sideways on small screens
  return (
    <div className="overflow-x-auto rounded-chip border">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="table-head">
            {COLUMNS.map((name) => (
              <th key={name} scope="col" className="px-4 py-3 font-bold">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {recent.status === "loading"
            ? [0, 1, 2].map((n) => (
                <tr key={n} className="border-t" aria-hidden="true">
                  <td colSpan={COLUMNS.length} className="px-4 py-4">
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))
            : recent.data.map((booking) => (
                <tr key={booking.id} className="border-t">
                  <td className="px-4 py-4 font-semibold text-ink">{booking.customerName}</td>
                  <td className="px-4 py-4 text-muted">{booking.courtName}</td>
                  <td className="px-4 py-4 text-muted">
                    {formatDateAndTimeRange(booking.startAt.toDate(), booking.endAt.toDate(), settings.timezone)}
                  </td>
                  <td className="px-4 py-4 text-muted">{formatRate(booking.hourlyRateMinor, settings.currency)}</td>
                  <td className="px-4 py-4 text-ink">{formatMoney(booking.totalMinor, settings.currency)}</td>
                  <td className="px-4 py-4">
                    <StatusBadge status={booking.status} />
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
      {recent.status === "loading" && <span role="status" className="sr-only">Loading recent bookings</span>}
    </div>
  );
}
