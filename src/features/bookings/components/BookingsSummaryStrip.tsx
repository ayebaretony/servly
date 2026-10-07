import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatMoney } from "@/lib/money";
import type { AsyncData } from "@/lib/useAsyncData";
import type { Booking } from "@/types/booking";
import type { CenterSettings } from "@/types/settings";
import type { BookingsSummary } from "../bookings.metrics";
import { MATCHING_LIMIT } from "../bookings.service";

type BookingsSummaryStripProps = {
  total: number | null;
  matching: AsyncData<Booking[]>; // only used for its loading / error state
  summary: BookingsSummary | null;
  capped: boolean;
  settings: CenterSettings;
};

// Bookings, revenue and occupancy for whatever the filters currently show
export function BookingsSummaryStrip({ total, matching, summary, capped, settings }: BookingsSummaryStripProps) {
  const failed = matching.status === "error";

  return (
    <Card>
      <div className="grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
        <SummaryCell label="Bookings">
          {total !== null ? `${total} ${total === 1 ? "booking" : "bookings"}` : failed ? "–" : <Skeleton className="h-6 w-28" />}
        </SummaryCell>
        <SummaryCell label="Revenue">
          {summary ? `${formatMoney(summary.revenueMinor, settings.currency)} total revenue` : failed ? "–" : <Skeleton className="h-6 w-36" />}
        </SummaryCell>
        <SummaryCell label="Occupancy">
          {summary ? (
            `${summary.occupancyPercent === null ? "–" : `${summary.occupancyPercent}%`} average occupancy`
          ) : failed ? (
            "–"
          ) : (
            <Skeleton className="h-6 w-40" />
          )}
        </SummaryCell>
      </div>

      {failed && (
        <div className="flex flex-wrap items-center gap-3 border-t px-5 py-3" role="alert">
          <p className="text-xs text-danger">{matching.message}</p>
          <button type="button" onClick={matching.retry} className="focus-ring rounded-chip text-xs font-semibold text-primary hover:underline">
            Try again
          </button>
        </div>
      )}
      {capped && (
        <p className="border-t px-5 py-3 text-xs text-muted">
          Revenue and occupancy cover the {MATCHING_LIMIT} newest matching bookings. Pick a date to narrow it down.
        </p>
      )}
    </Card>
  );
}

function SummaryCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="px-5 py-4">
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1 text-base font-semibold text-ink">{children}</div>
    </div>
  );
}
