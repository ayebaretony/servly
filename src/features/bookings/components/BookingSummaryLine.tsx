import { formatMoney } from "@/lib/money";
import { formatDayLabel, formatTimeRange } from "@/lib/time";
import type { Booking } from "@/types/booking";
import type { CenterSettings } from "@/types/settings";

// "Maya Chen · Court 1 · Jun 18, 9:00–10:00 AM · AED 30", so a confirmation pop-up shows exactly which booking it is about
export function BookingSummaryLine({ booking, settings, today }: { booking: Booking; settings: CenterSettings; today: string }) {
  const when = `${formatDayLabel(booking.date, today)}, ${formatTimeRange(booking.startAt.toDate(), booking.endAt.toDate(), settings.timezone)}`;
  return (
    <p className="rounded-card bg-sidebar px-4 py-3 text-sm text-ink">
      <span className="font-semibold">{booking.customerName}</span>
      <span className="text-muted">
        {" · "}
        {booking.courtName}
        {" · "}
        {when}
        {" · "}
        {formatMoney(booking.totalMinor, settings.currency)}
      </span>
    </p>
  );
}
