import { createContext } from "react";

// What the "New booking" pop-up starts with when it is opened from a spot on the calendar
export type BookingPrefill = {
  date: string; // "YYYY-MM-DD" at the center
  startMin?: number; // minutes since midnight, when an hour slot was clicked
};

export type BookingModalContextValue = {
  openNewBooking: () => void;
  // Same pop-up, with the date (and maybe the start time) already filled in
  openNewBookingOn: (prefill: BookingPrefill) => void;
  // Goes up by one every time a booking is created, so a list on screen knows to read again
  bookingsVersion: number;
};

export const BookingModalContext = createContext<BookingModalContextValue | null>(null);
