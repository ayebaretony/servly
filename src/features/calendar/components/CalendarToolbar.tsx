import { ChevronLeft, ChevronRight, Wrench } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { courtColorCss } from "@/theme/courtColors";
import type { Court } from "@/types/court";
import { courtVars } from "../calendar.style";

export type CalendarView = "month" | "week" | "day";

const VIEW_OPTIONS = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
] as const;

type CalendarToolbarProps = {
  view: CalendarView;
  title: string; // "June 2024"
  courts: Court[];
  onViewChange: (view: CalendarView) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  // Only passed for admins: opens the "Block time" form
  onBlockTime?: () => void;
};

const ARROW_CLASS =
  "focus-ring grid size-9 place-items-center rounded-button border bg-surface text-ink transition-colors hover:bg-sidebar";

// Month / Week / Day toggle, previous and next arrows, the period title, "Today", and the court colour legend on the right
export function CalendarToolbar({ view, title, courts, onViewChange, onPrevious, onNext, onToday, onBlockTime }: CalendarToolbarProps) {
  const unit = view === "month" ? "month" : view === "week" ? "week" : "day";

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl label="Calendar view" options={VIEW_OPTIONS} value={view} onChange={onViewChange} />

        <div className="flex items-center gap-2">
          <button type="button" onClick={onPrevious} aria-label={`Previous ${unit}`} className={ARROW_CLASS}>
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          {/* aria-live so a screen reader hears the new period after pressing an arrow */}
          <h2 aria-live="polite" className="min-w-36 text-center text-sm font-semibold text-ink">
            {title}
          </h2>
          <button type="button" onClick={onNext} aria-label={`Next ${unit}`} className={ARROW_CLASS}>
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </div>

        <Button variant="secondary" onClick={onToday} className="h-9">
          Today
        </Button>

        {onBlockTime && (
          <Button variant="secondary" onClick={onBlockTime} className="h-9">
            <Wrench aria-hidden="true" className="size-4" />
            Block time
          </Button>
        )}
      </div>

      {courts.length > 0 && (
        <ul aria-label="Court colours" className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {courts.map((court) => (
            <li key={court.id} className="flex items-center gap-1.5 text-xs text-muted">
              <span aria-hidden="true" className="court-dot" style={courtVars(courtColorCss(court.color))} />
              {court.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
