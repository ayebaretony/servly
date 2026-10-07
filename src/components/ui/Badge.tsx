import { Check, Wrench, X } from "lucide-react";
import type { BookingStatus } from "@/types/booking";
import type { CourtStatus } from "@/types/court";

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

const COURT_LABEL: Record<CourtStatus, string> = {
  available: "Available",
  maintenance: "Maintenance",
};

// Available = green, Maintenance = red (AGENTS.md section 6). Word plus icon, so colour is never the only signal.
export function CourtStatusBadge({ status }: { status: CourtStatus }) {
  return (
    <span className={`badge ${status === "available" ? "badge-success" : "badge-danger"}`}>
      {status === "available" ? (
        <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
      ) : (
        <Wrench aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
      )}
      {COURT_LABEL[status]}
    </span>
  );
}
