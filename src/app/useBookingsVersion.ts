import { useContext } from "react";
import { BookingModalContext } from "./BookingModalContext";

// Changes whenever a booking is created from the "+ New booking" pop-up. A page that lists bookings reads again when it changes.
export function useBookingsVersion() {
  const value = useContext(BookingModalContext);
  if (!value) throw new Error("useBookingsVersion must be used inside <BookingModalProvider>.");
  return value.bookingsVersion;
}
