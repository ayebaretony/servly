import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/useToast";
import type { Booking } from "@/types/booking";
import type { CenterSettings } from "@/types/settings";
import { BookingError, cancelBooking } from "../bookings.service";
import { BookingSummaryLine } from "./BookingSummaryLine";

type CancelBookingModalProps = {
  booking: Booking;
  settings: CenterSettings;
  today: string;
  onClose: () => void;
  onDone: () => void;
};

// Confirmation before a booking is cancelled (AGENTS.md section 4: destructive actions ask first)
export function CancelBookingModal({ booking, settings, today, onClose, onDone }: CancelBookingModalProps) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await cancelBooking(booking.id);
      showToast("Booking cancelled. The time is free to book again.");
      onDone();
      onClose();
    } catch (caught) {
      setError(caught instanceof BookingError ? caught.message : "We couldn't cancel the booking. Try again.");
      setSaving(false);
    }
  }

  return (
    <Modal title="Cancel this booking?" onClose={onClose}>
      <ModalBody>
        <div className="space-y-4">
          <BookingSummaryLine booking={booking} settings={settings} today={today} />
          <p className="text-sm text-ink">
            The time will be released so another customer can book it. The booking stays in the list marked Cancelled and
            no longer counts towards revenue.
          </p>
        </div>
      </ModalBody>
      <ModalFooter>
        {error && (
          <p role="alert" className="mr-auto text-xs text-danger">
            {error}
          </p>
        )}
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Keep booking
        </Button>
        <Button variant="danger" onClick={() => void confirm()} disabled={saving}>
          {saving ? "Cancelling…" : "Cancel booking"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
