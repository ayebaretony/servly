import { Download } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useBookingsVersion } from "@/app/useBookingsVersion";
import { useOpenNewBooking } from "@/app/useOpenNewBooking";
import { AceLoadingState } from "@/components/ui/AceLoadingState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/StateMessages";
import { useToast } from "@/components/ui/useToast";
import { useAuth } from "@/features/auth/useAuth";
import { useCourts } from "@/features/courts/hooks/useCourts";
import { useCenterSettings } from "@/features/settings/hooks/useCenterSettings";
import { useLoadingGate } from "@/lib/useLoadingGate";
import { todayInTimezone } from "@/lib/time";
import type { Booking } from "@/types/booking";
import type { Court } from "@/types/court";
import type { CenterSettings } from "@/types/settings";
import { buildBookingsCsv, downloadCsv } from "./bookings.export";
import { computeBookingsSummary } from "./bookings.metrics";
import { NO_FILTERS, type BookingFilters } from "./bookings.service";
import { BookingDetailsModal } from "./components/BookingDetailsModal";
import { BookingsFilterBar } from "./components/BookingsFilterBar";
import { BookingsSummaryStrip } from "./components/BookingsSummaryStrip";
import { BookingsTable } from "./components/BookingsTable";
import { CancelBookingModal } from "./components/CancelBookingModal";
import { DeleteBookingModal } from "./components/DeleteBookingModal";
import { useBookingsData } from "./hooks/useBookingsData";

// Settings and courts come first: "today" depends on the center's timezone, and the court filter needs the court list.
export function BookingsPage() {
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
    return gate.visible ? <AceLoadingState label="Loading bookings…" /> : null;
  }

  return <BookingsContent settings={settings.data} courts={courts.data} isAdmin={auth.profile.role === "admin"} />;
}

// Which pop-up is open: none, a booking's details, or a confirmation to cancel or delete one
type Dialog = { kind: "view" | "cancel" | "delete"; booking: Booking } | null;

type BookingsContentProps = { settings: CenterSettings; courts: Court[]; isAdmin: boolean };

function BookingsContent({ settings, courts, isAdmin }: BookingsContentProps) {
  const { showToast } = useToast();
  const openNewBooking = useOpenNewBooking();
  // Fixed when the page opens so "today" stays one day
  const [now] = useState(() => new Date());
  const today = todayInTimezone(settings.timezone, now);

  // The search text lives in the address (/bookings?q=maya), which is how the top bar's search box hands over to this page
  const [searchParams, setSearchParams] = useSearchParams();
  const term = searchParams.get("q") ?? "";
  const setTerm = (next: string) => setSearchParams(next ? { q: next } : {}, { replace: true });

  const [filters, setFilters] = useState<BookingFilters>(NO_FILTERS);
  const [changes, setChanges] = useState(0); // bumped after a cancel or delete
  const [dialog, setDialog] = useState<Dialog>(null);

  // Read everything again after a change here, or after a booking was created from the "+ New booking" pop-up
  const createdElsewhere = useBookingsVersion();
  const data = useBookingsData(filters, term, changes + createdElsewhere);

  const hasActiveFilters = Boolean(filters.date || filters.courtId || filters.status || term.trim());
  const summary =
    data.matching.status === "ready" ? computeBookingsSummary(data.matching.data, { courts, filters, settings }) : null;

  function clearFilters() {
    setFilters(NO_FILTERS);
    setTerm("");
  }

  function exportCsv() {
    if (data.matching.status !== "ready") return;
    const list = data.matching.data;
    if (list.length === 0) {
      showToast("There are no bookings to export.", "error");
      return;
    }
    downloadCsv(`servly-bookings-${today}.csv`, buildBookingsCsv(list, settings));
    showToast(
      data.capped
        ? `Exported the ${list.length} newest matching bookings.`
        : `Exported ${list.length} ${list.length === 1 ? "booking" : "bookings"}.`,
    );
  }

  const closeDialog = () => setDialog(null);
  const refresh = () => setChanges((n) => n + 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="type-h1">All bookings</h1>
          <p className="mt-1 text-sm text-muted">Manage court reservations and customer details</p>
        </div>
        <Button
          variant="secondary"
          onClick={exportCsv}
          disabled={data.matching.status !== "ready" || data.matching.data.length === 0}
        >
          <Download aria-hidden="true" className="size-4" />
          Export CSV
        </Button>
      </div>

      <BookingsFilterBar
        filters={filters}
        term={term}
        courts={courts}
        today={today}
        hasActiveFilters={hasActiveFilters}
        onFiltersChange={setFilters}
        onTermChange={setTerm}
        onClear={clearFilters}
      />

      <BookingsSummaryStrip total={data.total} matching={data.matching} summary={summary} capped={data.capped} settings={settings} />

      <BookingsTable
        rows={data.rows}
        total={data.total}
        pageIndex={data.pageIndex}
        settings={settings}
        today={today}
        isAdmin={isAdmin}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        onNewBooking={openNewBooking}
        onView={(booking) => setDialog({ kind: "view", booking })}
        onCancel={(booking) => setDialog({ kind: "cancel", booking })}
        onDelete={(booking) => setDialog({ kind: "delete", booking })}
        onPrevious={data.goPrevious}
        onNext={data.goNext}
        onFirstPage={data.goFirst}
      />

      {dialog?.kind === "view" && (
        <BookingDetailsModal booking={dialog.booking} settings={settings} today={today} onClose={closeDialog} />
      )}
      {dialog?.kind === "cancel" && (
        <CancelBookingModal booking={dialog.booking} settings={settings} today={today} onClose={closeDialog} onDone={refresh} />
      )}
      {/* Delete is admin-only; the guard here is a second line behind the menu and firestore.rules */}
      {isAdmin && dialog?.kind === "delete" && (
        <DeleteBookingModal booking={dialog.booking} settings={settings} today={today} onClose={closeDialog} onDone={refresh} />
      )}
    </div>
  );
}
