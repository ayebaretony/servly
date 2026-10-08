import { CalendarDays, ChevronDown, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { useOpenNewBooking } from "@/app/useOpenNewBooking";
import { AceLoadingState } from "@/components/ui/AceLoadingState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyMessage, ErrorMessage } from "@/components/ui/StateMessages";
import { useToast } from "@/components/ui/useToast";
import { useAuth } from "@/features/auth/useAuth";
import { downloadCsv } from "@/features/bookings/bookings.export";
import { useCourts } from "@/features/courts/hooks/useCourts";
import { useCenterSettings } from "@/features/settings/hooks/useCenterSettings";
import { addMonths, formatMonthYear, monthStart, previousMonthStart, todayInTimezone } from "@/lib/time";
import { useLoadingGate } from "@/lib/useLoadingGate";
import type { Court } from "@/types/court";
import type { CenterSettings } from "@/types/settings";
import { BookingStatusCard } from "./components/BookingStatusCard";
import { RecentRevenue } from "./components/RecentRevenue";
import { RevenueByCourt } from "./components/RevenueByCourt";
import { RevenueOverTime } from "./components/RevenueOverTime";
import { RevenueStatCards, RevenueStatCardsSkeleton } from "./components/RevenueStatCards";
import { WeeklyPerformance } from "./components/WeeklyPerformance";
import { useRevenueBookings } from "./hooks/useRevenueBookings";
import { buildRevenueCsv } from "./revenue.export";
import { computeRevenueReport } from "./revenue.metrics";

// How many months the picker offers, counting back from the current one
const MONTHS_BACK = 12;

// Settings and courts come first: "today" depends on the center's timezone, and revenue by court needs the court list.
export function RevenuePage() {
  const auth = useAuth();
  const settings = useCenterSettings();
  const courts = useCourts();
  const gate = useLoadingGate(settings.status === "loading" || courts.status === "loading");
  if (auth.status !== "active") return null;

  const failed = settings.status === "error" ? settings : courts.status === "error" ? courts : null;
  if (failed) {
    return (
      <Card>
        <ErrorMessage
          message={failed.message}
          onRetry={() => {
            if (settings.status === "error") settings.retry();
            if (courts.status === "error") courts.retry();
          }}
        />
      </Card>
    );
  }
  // Blank for the first moment, then Ace; the page is held back until he has been seen long enough
  if (settings.status !== "ready" || courts.status !== "ready" || gate.busy) {
    return gate.visible ? <AceLoadingState label="Loading revenue…" /> : null;
  }

  return <RevenueContent settings={settings.data} courts={courts.data} />;
}

function RevenueContent({ settings, courts }: { settings: CenterSettings; courts: Court[] }) {
  const { showToast } = useToast();
  const openNewBooking = useOpenNewBooking();
  // Fixed when the page opens so "today" stays one day
  const [now] = useState(() => new Date());
  const today = todayInTimezone(settings.timezone, now);

  const [month, setMonth] = useState(() => monthStart(today));
  const months = useMemo(
    () => Array.from({ length: MONTHS_BACK }, (_, index) => addMonths(monthStart(today), -index)),
    [today],
  );

  const bookings = useRevenueBookings(month);
  const report = useMemo(
    () => (bookings.status === "ready" ? computeRevenueReport(bookings.data, courts, month, today) : null),
    [bookings, courts, month, today],
  );

  function exportReport() {
    if (!report) return;
    downloadCsv(`servly-revenue-${month.slice(0, 7)}.csv`, buildRevenueCsv(report, settings));
    showToast(`Exported the ${formatMonthYear(month)} revenue report.`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="type-h1">Revenue overview</h1>
          <p className="mt-1 text-sm text-muted">Track court performance, booking income, and booking activity.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <label htmlFor="revenue-month" className="sr-only">
              Month
            </label>
            <CalendarDays aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <select
              id="revenue-month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="btn btn-secondary h-10 appearance-none pl-9 pr-9"
            >
              {months.map((value) => (
                <option key={value} value={value}>
                  {formatMonthYear(value)}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          </div>
          <Button variant="secondary" onClick={exportReport} disabled={!report?.hasBookings}>
            <Download aria-hidden="true" className="size-4" />
            Export report
          </Button>
        </div>
      </div>

      {bookings.status === "loading" && <RevenueBodySkeleton />}
      {bookings.status === "error" && (
        <Card>
          <ErrorMessage message={bookings.message} onRetry={bookings.retry} />
        </Card>
      )}
      {report && !report.hasBookings && (
        <Card>
          <EmptyMessage
            title={`No bookings in ${formatMonthYear(month)}`}
            hint="Revenue appears here once bookings are confirmed."
            action={<Button onClick={openNewBooking}>New booking</Button>}
          />
        </Card>
      )}
      {report?.hasBookings && (
        <>
          <RevenueStatCards report={report} previousMonth={previousMonthStart(month)} settings={settings} />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <RevenueOverTime report={report} previousMonth={previousMonthStart(month)} settings={settings} />
            <RevenueByCourt report={report} settings={settings} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <WeeklyPerformance report={report} settings={settings} />
            <BookingStatusCard report={report} settings={settings} />
          </div>

          <RecentRevenue report={report} settings={settings} />
        </>
      )}
    </div>
  );
}

function RevenueBodySkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading revenue">
      <RevenueStatCardsSkeleton />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="h-80" />
        <Card className="h-80" />
      </div>
      <Card className="h-72" />
    </div>
  );
}
