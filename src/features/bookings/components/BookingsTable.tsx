import { ChevronLeft, ChevronRight, Eye, Trash2, XCircle } from "lucide-react";
import { ActionsMenu, type ActionItem } from "@/components/ui/ActionsMenu";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyMessage, ErrorMessage } from "@/components/ui/StateMessages";
import { formatMoney, formatRate } from "@/lib/money";
import { formatDayLabel, formatTimeRange } from "@/lib/time";
import type { AsyncData } from "@/lib/useAsyncData";
import type { Booking } from "@/types/booking";
import type { CenterSettings } from "@/types/settings";
import { PAGE_SIZE } from "../bookings.service";

const COLUMNS = ["Date", "Time", "Court", "Customer", "Contact", "Email", "Rate / hour", "Total amount", "Status"];

type BookingsTableProps = {
  rows: AsyncData<Booking[]>;
  total: number | null;
  pageIndex: number;
  settings: CenterSettings;
  today: string;
  isAdmin: boolean; // only admins get "Delete booking"
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onNewBooking: () => void;
  onView: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
  onDelete: (booking: Booking) => void;
  onPrevious: () => void;
  onNext: () => void;
  onFirstPage: () => void;
};

export function BookingsTable({
  rows,
  total,
  pageIndex,
  settings,
  today,
  isAdmin,
  hasActiveFilters,
  onClearFilters,
  onNewBooking,
  onView,
  onCancel,
  onDelete,
  onPrevious,
  onNext,
  onFirstPage,
}: BookingsTableProps) {
  function actionsFor(booking: Booking): ActionItem[] {
    const items: ActionItem[] = [{ label: "View details", icon: Eye, onSelect: () => onView(booking) }];
    if (booking.status !== "cancelled") {
      items.push({ label: "Cancel booking", icon: XCircle, tone: "danger", onSelect: () => onCancel(booking) });
    }
    if (isAdmin) items.push({ label: "Delete booking", icon: Trash2, tone: "danger", onSelect: () => onDelete(booking) });
    return items;
  }

  if (rows.status === "error") {
    return (
      <Card>
        <ErrorMessage message={rows.message} onRetry={rows.retry} />
      </Card>
    );
  }

  const isEmpty = rows.status === "ready" && rows.data.length === 0;

  return (
    <Card>
      {isEmpty ? (
        pageIndex > 0 ? (
          // Possible after a delete removed the last row of the last page
          <EmptyMessage
            title="There's nothing on this page"
            action={
              <Button variant="secondary" onClick={onFirstPage}>
                Back to the first page
              </Button>
            }
          />
        ) : hasActiveFilters ? (
          <EmptyMessage
            title="No bookings match your filters"
            hint="Try a different search, or clear the filters."
            action={
              <Button variant="secondary" onClick={onClearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyMessage
            title="No bookings yet"
            hint="Create your first booking to see it here."
            action={<Button onClick={onNewBooking}>New booking</Button>}
          />
        )
      ) : (
        // Tables scroll sideways on small screens
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead>
              <tr className="table-head">
                {COLUMNS.map((name) => (
                  <th key={name} scope="col" className="whitespace-nowrap px-2.5 py-3 font-bold first:pl-6">
                    {name}
                  </th>
                ))}
                <th scope="col" className="py-3 pl-2.5 pr-6 text-right font-bold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.status === "loading"
                ? [0, 1, 2, 3, 4].map((n) => (
                    <tr key={n} className="border-t" aria-hidden="true">
                      <td colSpan={COLUMNS.length + 1} className="px-6 py-4">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    </tr>
                  ))
                : rows.data.map((booking) => (
                    <tr key={booking.id} className="border-t">
                      <td className="whitespace-nowrap py-4 pl-6 pr-2.5 text-ink">{formatDayLabel(booking.date, today)}</td>
                      <td className="whitespace-nowrap px-2.5 py-4 text-ink">
                        {formatTimeRange(booking.startAt.toDate(), booking.endAt.toDate(), settings.timezone)}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-4 text-ink">{booking.courtName}</td>
                      <td className="whitespace-nowrap px-2.5 py-4 font-semibold text-ink">{booking.customerName}</td>
                      <td className="whitespace-nowrap px-2.5 py-4 text-ink">{booking.customerPhone}</td>
                      <td className="max-w-[11rem] truncate px-2.5 py-4 text-ink" title={booking.customerEmail ?? undefined}>
                        {booking.customerEmail ?? <span className="text-muted">Email not provided</span>}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-4 text-ink">{formatRate(booking.hourlyRateMinor, settings.currency)}</td>
                      <td className="whitespace-nowrap px-2.5 py-4 font-semibold text-ink">
                        {formatMoney(booking.totalMinor, settings.currency)}
                      </td>
                      <td className="px-2.5 py-4">
                        <StatusBadge status={booking.status} />
                      </td>
                      <td className="py-4 pl-2.5 pr-6">
                        <div className="flex justify-end">
                          <ActionsMenu label={`${booking.customerName}'s booking`} items={actionsFor(booking)} />
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {rows.status === "loading" && (
            <span role="status" className="sr-only">
              Loading bookings
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4">
        {/* Wording is from the Bookings design; the rule itself is in AGENTS.md "Money rules" */}
        <p className="text-xs text-muted">Rates are calculated per hour. Partial hours are charged proportionally.</p>
        <Pager rows={rows} total={total} pageIndex={pageIndex} onPrevious={onPrevious} onNext={onNext} />
      </div>
    </Card>
  );
}

type PagerProps = Pick<BookingsTableProps, "rows" | "total" | "pageIndex" | "onPrevious" | "onNext">;

// "1–10 of 42" with previous / next buttons
function Pager({ rows, total, pageIndex, onPrevious, onNext }: PagerProps) {
  const shown = rows.status === "ready" ? rows.data.length : 0;
  const first = pageIndex * PAGE_SIZE + 1;
  const last = pageIndex * PAGE_SIZE + shown;
  const hasNext = rows.status === "ready" && (total === null ? shown === PAGE_SIZE : last < total);

  const buttonClass =
    "focus-ring grid size-8 place-items-center rounded-button border bg-surface text-ink transition-colors hover:bg-sidebar disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface";

  return (
    <div className="flex items-center gap-3">
      <p aria-live="polite" className="text-xs text-muted">
        {shown === 0 ? (rows.status === "loading" ? "Loading…" : "0 of 0") : `${first}–${last}${total !== null ? ` of ${total}` : ""}`}
      </p>
      <div className="flex gap-1.5">
        <button type="button" onClick={onPrevious} disabled={pageIndex === 0} aria-label="Previous page" className={buttonClass}>
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>
        <button type="button" onClick={onNext} disabled={!hasNext} aria-label="Next page" className={buttonClass}>
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}
