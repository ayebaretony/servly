import { useState, type ReactNode } from "react";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { formatMoney, formatRate } from "@/lib/money";
import { formatClock, formatDayLabel, formatDuration, formatLongDate, formatTimeRange, todayInTimezone } from "@/lib/time";
import type { Booking } from "@/types/booking";
import type { CenterSettings } from "@/types/settings";
import { statusChangesFor } from "../booking.status";
import { useBookingStatusChange } from "../hooks/useBookingStatusChange";

type BookingDetailsModalProps = {
  booking: Booking;
  settings: CenterSettings;
  today: string;
  onClose: () => void;
  // Shown as a "Cancel booking" button (not for bookings that are already cancelled). The caller opens the confirmation.
  onCancel?: () => void;
  // Lets the list behind this pop-up read again after the status was changed here
  onChanged: () => void;
};

// Everything saved on a booking, with buttons to change its status
export function BookingDetailsModal({ booking, settings, today, onClose, onCancel, onChanged }: BookingDetailsModalProps) {
  const { change, busy } = useBookingStatusChange(settings, onChanged);
  // Which status button was pressed, so only that one shows it is working
  const [pressed, setPressed] = useState<string | null>(null);
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
          <Button variant="danger" onClick={onCancel} disabled={busy} className="mr-auto">
            Cancel booking
          </Button>
        )}
        {statusChangesFor(booking.status).map((option) => (
          <Button
            key={option.status}
            variant="secondary"
            loading={busy && pressed === option.status}
            disabled={busy}
            // Closes on success; the list behind has already been told to read again
            onClick={() => {
              setPressed(option.status);
              void change(booking, option.status).then((saved) => saved && onClose());
            }}
          >
            {option.label}
          </Button>
        ))}
        <Button variant="secondary" onClick={onClose} disabled={busy}>
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
