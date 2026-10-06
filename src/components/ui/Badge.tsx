import { Check, X } from "lucide-react";
import type { BookingStatus } from "@/types/booking";

const LABEL: Record<BookingStatus, string> = {
  confirmed: "Confirmed",
  pending: "Pending",
  cancelled: "Cancelled",
};

const TONE: Record<BookingStatus, string> = {
  confirmed: "badge-success",
  pending: "badge-warning",
  cancelled: "badge-danger",
};

// Status always shows a word and an icon, never colour alone (brand sheet).
export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`badge ${TONE[status]}`}>
      {status === "confirmed" && <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />}
      {status === "pending" && <span aria-hidden="true" className="size-1.5 rounded-pill bg-warning" />}
      {status === "cancelled" && <X aria-hidden="true" className="size-3.5" strokeWidth={3} />}
      {LABEL[status]}
    </span>
  );
}
