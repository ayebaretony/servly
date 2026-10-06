import type { QueryDocumentSnapshot } from "firebase/firestore";
import type { Booking } from "@/types/booking";

// Firestore security rules already guarantee the stored shape (see validBooking in firestore.rules), so this is a typed read, not a re-check.
export function readBooking(snapshot: QueryDocumentSnapshot): Booking {
  return { id: snapshot.id, ...(snapshot.data() as Omit<Booking, "id">) };
}
