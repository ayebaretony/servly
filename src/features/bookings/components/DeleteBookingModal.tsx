import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/useToast";
import type { Booking } from "@/types/booking";
import type { CenterSettings } from "@/types/settings";
import { BookingError, deleteBooking } from "../bookings.service";
import { BookingSummaryLine } from "./BookingSummaryLine";

type DeleteBookingModalProps = {
  booking: Booking;
  settings: CenterSettings;
  today: string;
  onClose: () => void;
  onDone: () => void;
};

// Admin-only (the menu item is hidden for staff, and firestore.rules refuses the delete for them anyway).
// For bookings made by mistake: unlike cancelling, nothing is kept.
export function DeleteBookingModal({ booking, settings, today, onClose, onDone }: DeleteBookingModalProps) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await deleteBooking(booking.id);
      showToast("Booking deleted.");
      onDone();
      onClose();
    } catch (caught) {
      setError(caught instanceof BookingError ? caught.message : "We couldn't delete the booking. Try again.");
      setSaving(false);
    }
  }

  return (
    <Modal title="Delete this booking?" onClose={onClose}>
      <ModalBody>
        <div className="space-y-4">
          <BookingSummaryLine booking={booking} settings={settings} today={today} />
          <p className="text-sm text-ink">
            This permanently removes the booking, including from your revenue figures, and frees the time. It can't be
            undone.
          </p>
          <p className="text-sm text-muted">
            Use delete only to fix a mistake. If the customer simply isn't coming, cancel the booking instead so there is
            still a record of it.
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
        <Button variant="danger" onClick={() => void confirm()} loading={saving}>
          {saving ? "Deleting…" : "Delete booking"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
