import { useCallback, useMemo, useState } from "react";
import { useBookingsVersion } from "@/app/useBookingsVersion";
import { useOpenNewBookingOn } from "@/app/useOpenNewBookingOn";
import { AceLoadingState } from "@/components/ui/AceLoadingState";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/StateMessages";
import { BookingDetailsModal } from "@/features/bookings/components/BookingDetailsModal";
import { CancelBookingModal } from "@/features/bookings/components/CancelBookingModal";
import { useAuth } from "@/features/auth/useAuth";
import { useCourts } from "@/features/courts/hooks/useCourts";
import { useCenterSettings } from "@/features/settings/hooks/useCenterSettings";
import {
  addDays,
  addMonths,
  formatLongDate,
  formatMonthYear,
  formatWeekRange,
  monthEnd,
  monthStart,
  todayInTimezone,
  weekEnd,
  weekStart,
} from "@/lib/time";
import type { AsyncData } from "@/lib/useAsyncData";
import { useLoadingGate } from "@/lib/useLoadingGate";
import { courtColorCss } from "@/theme/courtColors";
import type { Block } from "@/types/block";
import type { Booking } from "@/types/booking";
import type { Court } from "@/types/court";
import type { CenterSettings } from "@/types/settings";
import { groupBlocksByDate, groupByDate } from "./calendar.layout";
import { CalendarToolbar, type CalendarView } from "./components/CalendarToolbar";
import { BlockDetailsModal } from "./components/BlockDetailsModal";
import { BlockTimeModal } from "./components/BlockTimeModal";
import { DayPanel } from "./components/DayPanel";
import { MonthView } from "./components/MonthView";
import { RemoveBlockModal } from "./components/RemoveBlockModal";
import { TimeGridView } from "./components/TimeGridView";
import { useCalendarBlocks } from "./hooks/useCalendarBlocks";
import { useCalendarBookings } from "./hooks/useCalendarBookings";

// Settings and courts come first: "today" depends on the center's timezone, and bookings are coloured by court.
export function CalendarPage() {
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
    return gate.visible ? <AceLoadingState label="Loading the calendar…" /> : null;
  }

  return (
    <CalendarContent
      settings={settings.data}
      courts={courts.data}
      uid={auth.uid}
      isAdmin={auth.profile.role === "admin"}
    />
  );
}

// The days the bookings are read for. Month and week are read in one go, so picking another day inside them costs nothing.
function rangeFor(view: CalendarView, date: string) {
  if (view === "month") return { start: monthStart(date), end: monthEnd(date) };
  if (view === "week") return { start: weekStart(date), end: weekEnd(date) };
  return { start: date, end: date };
}

function titleFor(view: CalendarView, date: string) {
  if (view === "month") return formatMonthYear(date);
  if (view === "week") return formatWeekRange(date);
  return formatLongDate(date);
}

// The arrows move by a month, a week or a day. A month lands on today when it is the current month, otherwise on its 1st.
function stepDate(view: CalendarView, date: string, direction: 1 | -1, today: string) {
  if (view === "week") return addDays(date, direction * 7);
  if (view === "day") return addDays(date, direction);
  const target = addMonths(monthStart(date), direction);
  return monthStart(target) === monthStart(today) ? today : target;
}

// Which pop-up is open: none, a booking's details or its cancel confirmation, a block's details or its remove
// confirmation, or the "Block time" form
type Dialog =
  | { kind: "view" | "cancel"; booking: Booking }
  | { kind: "block-view" | "block-remove"; block: Block }
  | { kind: "block-new" }
  | null;

type CalendarContentProps = { settings: CenterSettings; courts: Court[]; uid: string; isAdmin: boolean };

function CalendarContent({ settings, courts, uid, isAdmin }: CalendarContentProps) {
  // Fixed when the page opens so "today" stays one day
  const [now] = useState(() => new Date());
  const today = todayInTimezone(settings.timezone, now);

  const [view, setView] = useState<CalendarView>("month");
  const [selectedDate, setSelectedDate] = useState(today);
  const [changes, setChanges] = useState(0); // bumped after a status change, a cancel, a new block or a removed block
  const [dialog, setDialog] = useState<Dialog>(null);
  const openNewBookingOn = useOpenNewBookingOn();

  // Read again after a booking is cancelled here, or created from the "+ New booking" pop-up
  const createdElsewhere = useBookingsVersion();
  const range = rangeFor(view, selectedDate);
  const bookings = useCalendarBookings(range.start, range.end, changes + createdElsewhere);
  const blocks = useCalendarBlocks(range.start, range.end, settings.timezone, changes);
  // Moving to another month or week re-reads the bookings; Ace stands in for the grid while that takes a moment
  const gridGate = useLoadingGate(bookings.status === "loading" || blocks.status === "loading");

  const byDate = useMemo(() => groupByDate(bookings.status === "ready" ? bookings.data : []), [bookings]);
  const blocksByDate = useMemo(
    () => groupBlocksByDate(blocks.status === "ready" ? blocks.data : [], settings.timezone),
    [blocks, settings.timezone],
  );
  const colorByCourt = useMemo(() => new Map(courts.map((court) => [court.id, courtColorCss(court.color)])), [courts]);
  // A booking or block on a court that was archived since keeps a neutral colour
  const colorOf = (courtId: string) => colorByCourt.get(courtId) ?? courtColorCss("");
  const courtNameOf = (courtId: string) => courts.find((court) => court.id === courtId)?.name ?? "Archived court";

  const selectedBookings: AsyncData<Booking[]> =
    bookings.status === "ready" ? { status: "ready", data: byDate.get(selectedDate) ?? [] } : bookings;

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, n) => addDays(weekStart(selectedDate), n)), [selectedDate]);
  const dayOnly = useMemo(() => [selectedDate], [selectedDate]);

  const closeDialog = () => setDialog(null);
  const openBooking = (booking: Booking) => setDialog({ kind: "view", booking });
  const openBlock = (block: Block) => setDialog({ kind: "block-view", block });
  const reload = useCallback(() => setChanges((n) => n + 1), []);
  const newBookingOn = (date: string) => {
    setSelectedDate(date);
    openNewBookingOn({ date });
  };

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Calendar</h1>

      <CalendarToolbar
        view={view}
        title={titleFor(view, selectedDate)}
        courts={courts}
        onViewChange={setView}
        onPrevious={() => setSelectedDate(stepDate(view, selectedDate, -1, today))}
        onNext={() => setSelectedDate(stepDate(view, selectedDate, 1, today))}
        onToday={() => setSelectedDate(today)}
        // Blocking time is for admins (firestore.rules refuses it for staff)
        onBlockTime={isAdmin ? () => setDialog({ kind: "block-new" }) : undefined}
      />

      {blocks.status === "error" && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-card border bg-warning-soft px-4 py-3 text-xs text-warning-ink">
          <p>We couldn't load the maintenance blocks, so blocked times may be missing below.</p>
          <button type="button" onClick={blocks.retry} className="focus-ring rounded-chip font-semibold underline">
            Try again
          </button>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17.5rem]">
        <Card className="overflow-hidden" data-tour="calendar-grid">
          {gridGate.busy ? (
            gridGate.visible ? <AceLoadingState layout="section" label="Loading the calendar…" /> : <div className="min-h-96" />
          ) : bookings.status === "error" ? (
            <ErrorMessage message={bookings.message} onRetry={bookings.retry} />
          ) : view === "month" ? (
            <MonthView
              month={selectedDate}
              today={today}
              selectedDate={selectedDate}
              bookingsByDate={byDate}
              blocksByDate={blocksByDate}
              colorOf={colorOf}
              courtNameOf={courtNameOf}
              timezone={settings.timezone}
              onSelectDay={setSelectedDate}
              onNewBooking={newBookingOn}
              onOpenBooking={openBooking}
              onOpenBlock={openBlock}
              onShowDay={(date) => {
                setSelectedDate(date);
                setView("day");
              }}
            />
          ) : (
            <TimeGridView
              days={view === "week" ? weekDays : dayOnly}
              today={today}
              selectedDate={selectedDate}
              bookingsByDate={byDate}
              blocksByDate={blocksByDate}
              colorOf={colorOf}
              courtNameOf={courtNameOf}
              settings={settings}
              onSelectDay={setSelectedDate}
              onNewBookingAt={(date, startMin) => {
                setSelectedDate(date);
                openNewBookingOn({ date, startMin });
              }}
              onOpenBooking={openBooking}
              onOpenBlock={openBlock}
            />
          )}
        </Card>

        <DayPanel
          date={selectedDate}
          bookings={selectedBookings}
          blocks={blocksByDate.get(selectedDate) ?? []}
          colorOf={colorOf}
          courtNameOf={courtNameOf}
          settings={settings}
          onNewBooking={() => openNewBookingOn({ date: selectedDate })}
          onOpenBooking={openBooking}
          onOpenBlock={openBlock}
        />
      </div>

      {dialog?.kind === "view" && (
        <BookingDetailsModal
          booking={dialog.booking}
          settings={settings}
          today={today}
          onClose={closeDialog}
          onChanged={reload}
          onCancel={() => setDialog({ kind: "cancel", booking: dialog.booking })}
        />
      )}
      {dialog?.kind === "cancel" && (
        <CancelBookingModal
          booking={dialog.booking}
          settings={settings}
          today={today}
          onClose={closeDialog}
          onDone={reload}
        />
      )}
      {dialog?.kind === "block-new" && (
        <BlockTimeModal
          courts={courts}
          settings={settings}
          uid={uid}
          initialDate={selectedDate}
          onClose={closeDialog}
          onSaved={reload}
        />
      )}
      {dialog?.kind === "block-view" && (
        <BlockDetailsModal
          block={dialog.block}
          court={courts.find((court) => court.id === dialog.block.courtId)}
          settings={settings}
          onClose={closeDialog}
          onRemove={isAdmin ? () => setDialog({ kind: "block-remove", block: dialog.block }) : undefined}
        />
      )}
      {/* Removing is admin-only; this guard is a second line behind the button and firestore.rules */}
      {isAdmin && dialog?.kind === "block-remove" && (
        <RemoveBlockModal
          block={dialog.block}
          court={courts.find((court) => court.id === dialog.block.courtId)}
          settings={settings}
          today={today}
          onClose={closeDialog}
          onDone={reload}
        />
      )}
    </div>
  );
}
