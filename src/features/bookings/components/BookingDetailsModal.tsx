import type { ReactNode } from "react";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { formatMoney, formatRate } from "@/lib/money";
import { formatClock, formatDayLabel, formatDuration, formatLongDate, formatTimeRange, todayInTimezone } from "@/lib/time";
import type { Booking } from "@/types/booking";
import type { CenterSettings } from "@/types/settings";

type BookingDetailsModalProps = {
  booking: Booking;
  settings: CenterSettings;
  today: string;
  onClose: () => void;
  // Shown as a "Cancel booking" button (not for bookings that are already cancelled). The caller opens the confirmation.
  onCancel?: () => void;
};

// Read-only view of everything saved on a booking
export function BookingDetailsModal({ booking, settings, today, onClose, onCancel }: BookingDetailsModalProps) {
  const madeAt = booking.createdAt.toDate();

  return (
    <Modal title="Booking details" description={booking.courtName} onClose={onClose}>
      <ModalBody>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Detail label="Customer">{booking.customerName}</Detail>
          <Detail label="Status">
            <StatusBadge status={booking.status} />
          </Detail>
          <Detail label="Phone">{booking.customerPhone}</Detail>
          <Detail label="Email">{booking.customerEmail ?? <span className="text-muted">Email not provided</span>}</Detail>
          <Detail label="Date">{formatLongDate(booking.date)}</Detail>
          <Detail label="Time">
            {formatTimeRange(booking.startAt.toDate(), booking.endAt.toDate(), settings.timezone)} ·{" "}
            {formatDuration(booking.durationMinutes)}
          </Detail>
          <Detail label="Rate">{formatRate(booking.hourlyRateMinor, settings.currency)}</Detail>
          <Detail label="Total">
            <span className="font-semibold">{formatMoney(booking.totalMinor, settings.currency)}</span>
          </Detail>
          <Detail label="Booked on">
            {formatDayLabel(todayInTimezone(settings.timezone, madeAt), today)}, {formatClock(madeAt, settings.timezone)}
          </Detail>
          {booking.notes && (
            <div className="sm:col-span-2">
              <Detail label="Notes">
                <span className="whitespace-pre-wrap">{booking.notes}</span>
              </Detail>
            </div>
          )}
        </dl>
      </ModalBody>
      <ModalFooter>
        {onCancel && booking.status !== "cancelled" && (
          <Button variant="danger" onClick={onCancel} className="mr-auto">
            Cancel booking
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{children}</dd>
    </div>
  );
}
