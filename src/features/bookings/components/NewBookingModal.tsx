import { Button } from "@/components/ui/Button";
import { Modal, ModalBody } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyMessage, ErrorMessage } from "@/components/ui/StateMessages";
import { useAuth } from "@/features/auth/useAuth";
import { useCourts } from "@/features/courts/hooks/useCourts";
import { useCenterSettings } from "@/features/settings/hooks/useCenterSettings";
import { BookingForm } from "./BookingForm";

// The "+ New booking" pop-up. Loads the courts and center settings first (both cached after the first read),
// then shows the form. Mount it only while it should be open.
type NewBookingModalProps = {
  initialDate?: string; // when opened from the calendar
  initialStartMin?: number;
  onClose: () => void;
  onCreated: () => void;
};

export function NewBookingModal({ initialDate, initialStartMin, onClose, onCreated }: NewBookingModalProps) {
  const auth = useAuth();
  const courts = useCourts();
  const settings = useCenterSettings();

  return (
    <Modal title="New booking" description="Reserve a court for a customer." onClose={onClose}>
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
          onClose={onClose}
          onCreated={onCreated}
        />
      )}
    </Modal>
  );
}
