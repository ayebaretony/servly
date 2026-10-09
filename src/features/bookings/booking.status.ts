import type { BookingStatus } from "@/types/booking";
import type { NewBookingStatus } from "./booking.validation";

export type StatusChange = { status: NewBookingStatus; label: string };

// The status changes offered for a booking, besides Cancel (which has its own confirmation).
// Any status can be changed later: a cancelled booking is brought back ("reinstated") as confirmed or pending.
export function statusChangesFor(current: BookingStatus): StatusChange[] {
  if (current === "pending") return [{ status: "confirmed", label: "Mark as confirmed" }];
  if (current === "confirmed") return [{ status: "pending", label: "Mark as pending" }];
  return [
    { status: "confirmed", label: "Reinstate as confirmed" },
    { status: "pending", label: "Reinstate as pending" },
  ];
}
