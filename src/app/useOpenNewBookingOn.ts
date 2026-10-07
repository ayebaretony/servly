import { useContext } from "react";
import { BookingModalContext } from "./BookingModalContext";

// For spots on the calendar: opens the booking pop-up with that date (and start time) already chosen.
export function useOpenNewBookingOn() {
  const value = useContext(BookingModalContext);
  if (!value) throw new Error("useOpenNewBookingOn must be used inside <BookingModalProvider>.");
  return value.openNewBookingOn;
}
