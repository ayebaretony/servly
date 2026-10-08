import { collection, getDocs, query, where } from "firebase/firestore";
import { readBooking } from "@/features/bookings/bookings.service";
import { db } from "@/lib/firebase";
import { monthEnd, previousMonthStart } from "@/lib/time";
import type { Booking } from "@/types/booking";

// One bounded range query on `date` (single field, so no composite index): the chosen month plus the month before it,
// which the "vs last month" comparisons need. `month` is the first day of the chosen month, "YYYY-MM-01".
export async function fetchRevenueBookings(month: string): Promise<Booking[]> {
  const snapshot = await getDocs(
    query(collection(db, "bookings"), where("date", ">=", previousMonthStart(month)), where("date", "<=", monthEnd(month))),
  );
  return snapshot.docs.map(readBooking);
}
