import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { readBooking } from "@/features/bookings/bookings.service";
import { db } from "@/lib/firebase";
import type { Booking } from "@/types/booking";

const bookingsRef = () => collection(db, "bookings");

// Live listener for one day. The only real-time query on the dashboard (AGENTS.md section 8).
// Equality on `date` alone needs no composite index; callers sort by start time.
export function subscribeToDay(
  date: string,
  onData: (bookings: Booking[]) => void,
  onError: () => void,
): Unsubscribe {
  return onSnapshot(
    query(bookingsRef(), where("date", "==", date)),
    (snapshot) => onData(snapshot.docs.map(readBooking)),
    onError,
  );
}

// One bounded range query (single field, so no composite index): last month plus this month.
// It feeds the revenue card and the "vs last week" comparisons.
export async function fetchBookingsInRange(startDate: string, endDate: string): Promise<Booking[]> {
  const snapshot = await getDocs(query(bookingsRef(), where("date", ">=", startDate), where("date", "<=", endDate)));
  return snapshot.docs.map(readBooking);
}

// Newest bookings first, by when they were made
export async function fetchRecentBookings(count: number): Promise<Booking[]> {
  const snapshot = await getDocs(query(bookingsRef(), orderBy("createdAt", "desc"), limit(count)));
  return snapshot.docs.map(readBooking);
}
