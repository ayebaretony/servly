import { ChevronDown } from "lucide-react";
import type { CSSProperties } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CourtStatusBadge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyMessage, ErrorMessage } from "@/components/ui/StateMessages";
import type { AsyncData } from "@/lib/useAsyncData";
import { courtColorCss } from "@/theme/courtColors";
import type { Booking } from "@/types/booking";
import type { Court, CourtStatus } from "@/types/court";
import { countBookingsByCourt } from "../courts.metrics";
import { CourtActionsMenu } from "./CourtActionsMenu";

export type StatusFilter = "all" | CourtStatus;

type CourtsTableProps = {
  courts: Court[]; // every listed court; the filter is applied here
  filter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  todayBookings: AsyncData<Booking[]>;
  canManage: boolean; // admins only: staff can look but not change courts
  onAdd: () => void;
  onEdit: (court: Court) => void;
  onArchive: (court: Court) => void;
};

export function CourtsTable({
  courts,
  filter,
  onFilterChange,
  todayBookings,
  canManage,
  onAdd,
  onEdit,
  onArchive,
}: CourtsTableProps) {
  const visible = filter === "all" ? courts : courts.filter((court) => court.status === filter);
  const counts = todayBookings.status === "ready" ? countBookingsByCourt(todayBookings.data) : null;

  return (
    <Card data-tour="courts-table">
      <div className="flex flex-wrap items-start justify-between gap-4 p-6 pb-5">
        <div>
          <h2 className="type-h2">All courts</h2>
          <p className="mt-1 text-xs text-muted">
            {courts.length} {courts.length === 1 ? "court" : "courts"} configured for booking
          </p>
        </div>

        <div className="relative">
          <label htmlFor="court-status-filter" className="sr-only">
            Filter courts by status
          </label>
          <select
            id="court-status-filter"
            value={filter}
            onChange={(event) => onFilterChange(event.target.value as StatusFilter)}
            className="h-9 appearance-none rounded-button border bg-surface pl-3 pr-9 text-xs font-medium text-ink"
          >
            <option value="all">All statuses</option>
            <option value="available">Available</option>
            <option value="maintenance">Maintenance</option>
          </select>
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        </div>
      </div>

      {courts.length === 0 ? (
        <EmptyMessage
          title="No courts yet"
          hint={canManage ? "Add your first court so bookings can be made." : "An admin needs to add the courts."}
          action={canManage ? <Button onClick={onAdd}>Add court</Button> : undefined}
        />
      ) : visible.length === 0 ? (
        <EmptyMessage
          title="No courts match this filter"
          action={
            <Button variant="secondary" onClick={() => onFilterChange("all")}>
              Show all courts
            </Button>
          }
        />
      ) : (
        // Tables scroll sideways on small screens
        <div className="overflow-x-auto border-t">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="table-head">
                <th scope="col" className="px-6 py-3 font-bold">
                  Court
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  Today's bookings
                </th>
                {canManage && (
                  <th scope="col" className="px-6 py-3 text-right font-bold">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map((court) => (
                <tr key={court.id} className="border-t">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="court-dot" style={{ "--court-color": courtColorCss(court.color) } as CSSProperties} aria-hidden="true" />
                      <div>
                        <p className="font-semibold text-ink">{court.name}</p>
                        <p className="text-xs text-muted">{court.surface}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <CourtStatusBadge status={court.status} />
                  </td>
                  <td className="px-4 py-4 text-muted">
                    <BookingsToday status={todayBookings.status} count={counts?.get(court.id) ?? 0} />
                  </td>
                  {canManage && (
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onEdit(court)}
                          aria-label={`Edit ${court.name}`}
                          className="focus-ring rounded-chip px-2 py-1 text-xs font-medium text-ink transition-colors hover:bg-sidebar"
                        >
                          Edit
                        </button>
                        <CourtActionsMenu court={court} onEdit={onEdit} onArchive={onArchive} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {todayBookings.status === "error" && courts.length > 0 && (
        <div className="border-t">
          <ErrorMessage message={todayBookings.message} onRetry={todayBookings.retry} />
        </div>
      )}

    </Card>
  );
}

function BookingsToday({ status, count }: { status: AsyncData<Booking[]>["status"]; count: number }) {
  if (status === "loading") return <Skeleton className="h-4 w-20" />;
  if (status === "error") return <span aria-label="Not available">–</span>;
  return <>{count === 1 ? "1 booking today" : `${count} bookings today`}</>;
}
