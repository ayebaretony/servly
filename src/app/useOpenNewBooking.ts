import { useContext } from "react";
import { BookingModalContext } from "./BookingModalContext";

// Every "+ New booking" button calls this. It opens the booking pop-up that lives in AppShell.
export function useOpenNewBooking() {
  const value = useContext(BookingModalContext);
  if (!value) throw new Error("useOpenNewBooking must be used inside <BookingModalProvider>.");
  return value.openNewBooking;
}
