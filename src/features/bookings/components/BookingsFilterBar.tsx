import { CalendarDays, ChevronDown, Search } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { formatDayLabel } from "@/lib/time";
import type { BookingStatus } from "@/types/booking";
import type { Court } from "@/types/court";
import type { BookingFilters } from "../bookings.service";

type BookingsFilterBarProps = {
  filters: BookingFilters;
  term: string;
  courts: Court[];
  today: string;
  hasActiveFilters: boolean;
  onFiltersChange: (filters: BookingFilters) => void;
  onTermChange: (term: string) => void;
  onClear: () => void;
};

const STATUS_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: "confirmed", label: "Confirmed" },
  { value: "pending", label: "Pending" },
  { value: "cancelled", label: "Cancelled" },
];

const FIELD_CLASS = "h-9 rounded-button border bg-surface text-xs font-medium text-ink";

// Search, date, court and status. The search text lives in the page address (?q=), so the top bar's search box
// and this one are the same thing.
export function BookingsFilterBar({
  filters,
  term,
  courts,
  today,
  hasActiveFilters,
  onFiltersChange,
  onTermChange,
  onClear,
}: BookingsFilterBarProps) {
  return (
    <Card className="flex flex-wrap items-center gap-3 p-3">
      <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
        <label htmlFor="bookings-search" className="sr-only">
          Search by name, email or phone
        </label>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          id="bookings-search"
          type="search"
          value={term}
          onChange={(event) => onTermChange(event.target.value)}
          placeholder="Search by name, email or phone"
          autoComplete="off"
          className={`${FIELD_CLASS} w-full pl-9 pr-3 placeholder:font-normal placeholder:text-muted`}
        />
      </div>

      {/* The real date input sits invisibly over the face, so the picker is native and keyboard friendly */}
      <div className="relative rounded-button has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus">
        <div className={`${FIELD_CLASS} flex items-center gap-2 px-3`} aria-hidden="true">
          <CalendarDays className="size-4 text-muted" />
          {filters.date && <span>{formatDayLabel(filters.date, today)}</span>}
          <ChevronDown className="size-4 text-muted" />
        </div>
        <input
          type="date"
          aria-label="Filter by date"
          value={filters.date}
          onChange={(event) => onFiltersChange({ ...filters, date: event.target.value })}
          onClick={(event) => {
            // Opens the calendar from anywhere on the field, not only from the browser's tiny icon
            try {
              event.currentTarget.showPicker();
            } catch {
              // Older browsers: the native control still works by itself
            }
          }}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </div>

      <FilterSelect
        label="Filter by court"
        value={filters.courtId}
        onChange={(courtId) => onFiltersChange({ ...filters, courtId })}
      >
        <option value="">All courts</option>
        {courts.map((court) => (
          <option key={court.id} value={court.id}>
            {court.name}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label="Filter by status"
        value={filters.status}
        onChange={(status) => onFiltersChange({ ...filters, status: status as BookingFilters["status"] })}
      >
        <option value="">All statuses</option>
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </FilterSelect>

      <button
        type="button"
        onClick={onClear}
        disabled={!hasActiveFilters}
        className="focus-ring ml-auto rounded-chip px-2 py-1 text-xs font-semibold text-primary transition-colors hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
      >
        Clear filters
      </button>
    </Card>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${FIELD_CLASS} appearance-none pl-3 pr-9`}
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
}
