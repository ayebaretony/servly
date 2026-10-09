import { useCallback, useState } from "react";
import { useToast } from "@/components/ui/useToast";
import { useAuth } from "@/features/auth/useAuth";
import type { Booking } from "@/types/booking";
import type { CenterSettings } from "@/types/settings";
import type { NewBookingStatus } from "../booking.validation";
import { BookingError, changeBookingStatus } from "../bookings.service";

// Shared by the Bookings table menu and the booking details pop-up, so both behave and talk the same way.
// `change` resolves to true when the status was saved; the person has already been told either way (toast).
export function useBookingStatusChange(settings: CenterSettings, onChanged: () => void) {
  const auth = useAuth();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  const change = useCallback(
    async (booking: Booking, status: NewBookingStatus): Promise<boolean> => {
      if (busy || auth.status !== "active") return false;
      setBusy(true);
      try {
        await changeBookingStatus(booking.id, status, { isAdmin: auth.profile.role === "admin" }, settings);
        showToast(
          booking.status === "cancelled"
            ? `Booking reinstated as ${status}. The time is held for the customer again.`
            : `Booking marked as ${status}.`,
        );
        onChanged();
        return true;
      } catch (error) {
        showToast(error instanceof BookingError ? error.message : "We couldn't change the status. Try again.", "error");
        // The time was taken or the booking changed under us: read the list again so it shows the truth
        if (error instanceof BookingError && error.code !== "permission-denied" && error.code !== "failed") onChanged();
        return false;
      } finally {
        setBusy(false);
      }
    },
    [busy, auth, settings, showToast, onChanged],
  );

  return { change, busy };
}
