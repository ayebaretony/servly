import type { Timestamp } from "firebase/firestore";

export type BookingStatus = "confirmed" | "pending" | "cancelled";

// Shape of bookings/{bookingId} in Firestore (AGENTS.md section 7), plus the document id
export type Booking = {
  id: string;
  courtId: string;
  courtName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  date: string; // "YYYY-MM-DD" in the center timezone
  startAt: Timestamp;
  endAt: Timestamp;
  durationMinutes: number;
  hourlyRateMinor: number;
  totalMinor: number;
  status: BookingStatus;
  notes: string | null;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
