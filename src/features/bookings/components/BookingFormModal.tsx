import { Button } from "@/components/ui/Button";
import { Modal, ModalBody } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyMessage, ErrorMessage } from "@/components/ui/StateMessages";
import { useAuth } from "@/features/auth/useAuth";
import { useCourts } from "@/features/courts/hooks/useCourts";
import { useCenterSettings } from "@/features/settings/hooks/useCenterSettings";
import type { Booking } from "@/types/booking";
import { BookingForm } from "./BookingForm";

// The "+ New booking" pop-up, or "Edit booking" when given a booking. Loads the courts and center settings first
// (both cached after the first read), then shows the form. Mount it only while it should be open.
type BookingFormModalProps = {
  booking?: Booking; // set to edit this booking
  initialDate?: string; // when opened from the calendar
  initialStartMin?: number;
  initialCourtId?: string;
  onClose: () => void;
  onSaved: () => void;
};

export function BookingFormModal({ booking, initialDate, initialStartMin, initialCourtId, onClose, onSaved }: BookingFormModalProps) {
  const auth = useAuth();
  const courts = useCourts();
  const settings = useCenterSettings();

  return (
    <Modal
      title={booking ? "Edit booking" : "New booking"}
      description={booking ? "Change the time, length, rate or customer details." : "Reserve a court for a customer."}
      onClose={onClose}
    >
      {auth.status !== "active" || courts.status === "loading" || settings.status === "loading" ? (
        <ModalBody>
          <div role="status" aria-label="Loading the booking form" className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </ModalBody>
      ) : courts.status === "error" ? (
        <ModalBody>
          <ErrorMessage message={courts.message} onRetry={courts.retry} />
        </ModalBody>
      ) : settings.status === "error" ? (
        <ModalBody>
          <ErrorMessage message={settings.message} onRetry={settings.retry} />
        </ModalBody>
      ) : courts.data.length === 0 ? (
        <ModalBody>
          <EmptyMessage
            title="There are no courts to book yet"
            hint="An admin needs to add a court on the Courts page first."
            action={<Button variant="secondary" onClick={onClose}>Close</Button>}
          />
        </ModalBody>
      ) : (
        <BookingForm
          courts={courts.data}
          settings={settings.data}
          actor={{ uid: auth.uid, isAdmin: auth.profile.role === "admin" }}
          initialDate={initialDate}
          initialStartMin={initialStartMin}
          initialCourtId={initialCourtId}
          booking={booking}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </Modal>
  );
}
