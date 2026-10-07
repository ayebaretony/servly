import { useCallback, useMemo, useState, type ReactNode } from "react";
import { NewBookingModal } from "@/features/bookings/components/NewBookingModal";
import { BookingModalContext, type BookingPrefill } from "./BookingModalContext";

// Owns the one "New booking" pop-up, so the button works from any page (AGENTS.md section 5, "Global layout").
export function BookingModalProvider({ children }: { children: ReactNode }) {
  // null = closed. An empty object opens it with nothing filled in.
  const [prefill, setPrefill] = useState<Partial<BookingPrefill> | null>(null);
  const [bookingsVersion, setBookingsVersion] = useState(0);

  const openNewBooking = useCallback(() => setPrefill({}), []);
  const openNewBookingOn = useCallback((next: BookingPrefill) => setPrefill(next), []);
  const value = useMemo(
    () => ({ openNewBooking, openNewBookingOn, bookingsVersion }),
    [openNewBooking, openNewBookingOn, bookingsVersion],
  );

  return (
    <BookingModalContext.Provider value={value}>
      {children}
      {prefill && (
        <NewBookingModal
          initialDate={prefill.date}
          initialStartMin={prefill.startMin}
          onClose={() => setPrefill(null)}
          onCreated={() => setBookingsVersion((n) => n + 1)}
        />
      )}
    </BookingModalContext.Provider>
  );
}
