import { useMemo, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/useToast";
import { bookedRanges, overlapsTaken } from "@/lib/conflicts";
import { calcTotalMinor, formatMoney, formatRate, minorToMajorInput, parseMajorToMinor } from "@/lib/money";
import {
  formatDuration,
  formatMinutes,
  formatTimeRange,
  minutesOfDay,
  parseHHmm,
  todayInTimezone,
} from "@/lib/time";
import type { Booking } from "@/types/booking";
import type { Court } from "@/types/court";
import type { CenterSettings } from "@/types/settings";
import { NOTES_MAX, parseMinutes, validateBooking, type BookingFormValues, type NewBookingStatus } from "../booking.validation";
import type { Schedule } from "../bookings.rules";
import { BookingError, createBooking, updateBooking } from "../bookings.service";
import { useTakenSlots } from "../hooks/useTakenSlots";

// Quick picks for how long the booking runs. Only shown when they fit the slot size and opening hours.
const QUICK_DURATIONS = [30, 60, 90, 120];

type BookingFormProps = {
  courts: Court[];
  settings: CenterSettings;
  actor: { uid: string; isAdmin: boolean };
  initialDate?: string; // set when opened from a day or hour on the calendar
  initialStartMin?: number;
  initialCourtId?: string; // set when opened from a free slot on a court's row
  booking?: Booking; // set to edit this booking instead of creating a new one
  onClose: () => void;
  onSaved: () => void; // lets a list on screen read again
};

// Where and when an existing booking is, in the form's own terms (minutes since midnight at the center)
function scheduleOf(booking: Booking, timezone: string): Schedule {
  const startMin = minutesOfDay(booking.startAt.toDate(), timezone);
  return { courtId: booking.courtId, date: booking.date, startMin, endMin: startMin + booking.durationMinutes };
}

export function BookingForm({ courts, settings, actor, initialDate, initialStartMin, initialCourtId, booking, onClose, onSaved }: BookingFormProps) {
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  // Fixed while the form is open, so what the form shows and what it validates always agree
  const [openedAt] = useState(() => new Date());

  const bookable = courts.filter((court) => court.status === "available");
  // Fixed while the form is open: what the booking looked like when editing started
  const [original] = useState(() => (booking ? scheduleOf(booking, settings.timezone) : undefined));
  const [values, setValues] = useState<BookingFormValues>(() => {
    if (booking && original) {
      return {
        courtId: booking.courtId,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        customerEmail: booking.customerEmail ?? "",
        date: booking.date,
        start: String(original.startMin),
        end: String(original.endMin),
        rate: minorToMajorInput(booking.hourlyRateMinor),
        // A cancelled booking is reinstated from its menu, not edited, so this is never "cancelled"
        status: booking.status === "pending" ? "pending" : "confirmed",
        notes: booking.notes ?? "",
      };
    }
    // A clicked hour only pre-fills when it is a real start time at this center; the person can still change it
    const openMin = parseHHmm(settings.openTime);
    const closeMin = parseHHmm(settings.closeTime);
    const startFits =
      initialStartMin !== undefined &&
      initialStartMin >= openMin &&
      initialStartMin + settings.slotMinutes <= closeMin &&
      (initialStartMin - openMin) % settings.slotMinutes === 0;
    const oneHour = Math.max(settings.slotMinutes, Math.floor(60 / settings.slotMinutes) * settings.slotMinutes);
    return {
      // A court in maintenance can't be booked, so a clicked court only pre-fills when it is still bookable
      courtId: bookable.length === 1 ? bookable[0].id : bookable.some((c) => c.id === initialCourtId) ? (initialCourtId ?? "") : "",
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      date: initialDate ?? todayInTimezone(settings.timezone, openedAt),
      start: startFits ? String(initialStartMin) : "",
      end: startFits ? String(Math.min(initialStartMin + oneHour, closeMin)) : "",
      rate: "",
      status: "confirmed",
      notes: "",
    };
  });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [availabilityKey, setAvailabilityKey] = useState(0);

  const slots = useTakenSlots(values.courtId, values.date, availabilityKey, booking?.id);
  const { taken } = slots;

  const slotMinutes = settings.slotMinutes;
  const open = parseHHmm(settings.openTime);
  const close = parseHHmm(settings.closeTime);
  const today = todayInTimezone(settings.timezone, openedAt);
  const court = courts.find((c) => c.id === values.courtId);
  const startMin = parseMinutes(values.start);
  const endMin = parseMinutes(values.end);
  // null until the typed rate is a valid amount
  const hourlyRateMinor = parseMajorToMinor(values.rate);

  const validationContext = { courts, settings, isAdmin: actor.isAdmin, now: openedAt, taken, original };
  const errors = submitted ? validateBooking(values, validationContext) : {};

  // Start times: every slot from opening until one slot before closing. Times that already passed today are left out.
  const startOptions = useMemo(() => {
    const nowMinutes = minutesOfDay(openedAt, settings.timezone);
    const hidePast = !actor.isAdmin && values.date === today;
    const options: number[] = [];
    for (let minute = open; minute + slotMinutes <= close; minute += slotMinutes) {
      // A booking that already started keeps its start time in the list, so it can still be shortened or its details fixed
      const isOwnStart = original !== undefined && values.date === original.date && minute === original.startMin;
      if (!hidePast || minute > nowMinutes || isOwnStart) options.push(minute);
    }
    return options;
  }, [open, close, slotMinutes, openedAt, settings.timezone, actor.isAdmin, values.date, today, original]);

  // End times: from one slot after the start until closing
  const endOptions = useMemo(() => {
    if (startMin === null) return [];
    const options: number[] = [];
    for (let minute = startMin + slotMinutes; minute <= close; minute += slotMinutes) options.push(minute);
    return options;
  }, [startMin, slotMinutes, close]);

  function set<K extends keyof BookingFormValues>(field: K, value: BookingFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  // Picking a start time suggests a one-hour booking, so most bookings need one fewer choice
  function chooseStart(value: string) {
    const newStart = Number(value);
    setValues((current) => {
      const currentEnd = parseMinutes(current.end);
      if (currentEnd !== null && currentEnd > newStart) return { ...current, start: value };
      const suggested = Math.min(newStart + Math.max(slotMinutes, Math.floor(60 / slotMinutes) * slotMinutes), close);
      return { ...current, start: value, end: String(suggested) };
    });
  }

  function chooseDuration(minutes: number) {
    if (startMin !== null) set("end", String(startMin + minutes));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSubmitted(true);
    setSubmitError(null);

    const found = validateBooking(values, validationContext);
    if (Object.keys(found).length > 0 || startMin === null || endMin === null || hourlyRateMinor === null) {
      // Take the person to the first field that needs attention
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }

    setSaving(true);
    try {
      const input = {
        courtId: values.courtId,
        customerName: values.customerName.trim(),
        customerPhone: values.customerPhone.trim(),
        customerEmail: values.customerEmail.trim() || null,
        date: values.date,
        startMin,
        endMin,
        hourlyRateMinor,
        status: values.status,
        notes: values.notes.trim() || null,
      };
      const saved = booking ? await updateBooking(booking.id, input, actor, settings) : await createBooking(input, actor, settings);
      showToast(
        `Booking ${booking ? "updated" : "created"}: ${saved.courtName}, ${formatTimeRange(saved.startAt, saved.endAt, settings.timezone)} (${formatMoney(saved.totalMinor, settings.currency)}).`,
      );
      onSaved();
      onClose();
    } catch (error) {
      // Customer details can be inside a raw error, so only our own friendly messages are shown (and nothing is logged)
      if (error instanceof BookingError) {
        setSubmitError(error.message);
        // Someone else just took the time: read what is booked again so the times on screen are right
        if (error.code === "slot-taken") setAvailabilityKey((n) => n + 1);
      } else {
        setSubmitError("We couldn't save the booking. Check your connection and try again.");
      }
      setSaving(false);
    }
  }

  const durationMinutes = startMin !== null && endMin !== null && endMin > startMin ? endMin - startMin : null;
  const ranges = bookedRanges(taken, slotMinutes);

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <ModalBody>
        <div className="space-y-6">
          <section aria-labelledby="booking-court" className="space-y-4">
            <h3 id="booking-court" className="type-overline text-muted">
              Court
            </h3>
            <Select
              label="Court"
              value={values.courtId}
              onChange={(event) => set("courtId", event.target.value)}
              error={errors.courtId}
              autoFocus={values.courtId === ""}
            >
              <option value="">Select a court</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id} disabled={c.status !== "available"}>
                  {c.name}
                  {c.status === "available" ? "" : " · Under maintenance"}
                </option>
              ))}
            </Select>
          </section>

          <section aria-labelledby="booking-customer" className="space-y-4">
            <h3 id="booking-customer" className="type-overline text-muted">
              Customer
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Full name"
                value={values.customerName}
                onChange={(event) => set("customerName", event.target.value)}
                error={errors.customerName}
                autoFocus={values.courtId !== ""}
                autoComplete="off"
                placeholder="e.g. Sara Ahmed"
              />
              <Input
                label="Phone"
                type="tel"
                value={values.customerPhone}
                onChange={(event) => set("customerPhone", event.target.value)}
                error={errors.customerPhone}
                autoComplete="off"
                placeholder="+971 50 123 4567"
              />
            </div>
            <Input
              label="Email (optional)"
              type="email"
              value={values.customerEmail}
              onChange={(event) => set("customerEmail", event.target.value)}
              error={errors.customerEmail}
              autoComplete="off"
              placeholder="name@example.com"
            />
          </section>

          <section aria-labelledby="booking-when" className="space-y-4">
            <h3 id="booking-when" className="type-overline text-muted">
              When
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Date"
                type="date"
                value={values.date}
                min={actor.isAdmin ? undefined : today}
                onChange={(event) => set("date", event.target.value)}
                error={errors.date}
              />
              <Select
                label="Start time"
                value={values.start}
                onChange={(event) => chooseStart(event.target.value)}
                error={errors.start}
              >
                <option value="">Select</option>
                {startOptions.map((minute) => {
                  const isTaken = taken.has(minute);
                  return (
                    <option key={minute} value={minute} disabled={isTaken}>
                      {formatMinutes(minute)}
                      {isTaken ? " · booked" : ""}
                    </option>
                  );
                })}
              </Select>
              <Select
                label="End time"
                value={values.end}
                onChange={(event) => set("end", event.target.value)}
                error={errors.end}
                disabled={startMin === null}
              >
                <option value="">{startMin === null ? "Pick a start first" : "Select"}</option>
                {endOptions.map((minute) => (
                  <option key={minute} value={minute} disabled={overlapsTaken(startMin ?? 0, minute, slotMinutes, taken)}>
                    {formatMinutes(minute)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Quick duration">
              <span className="text-xs text-muted">Duration</span>
              {QUICK_DURATIONS.map((minutes) => {
                const fits =
                  startMin !== null &&
                  minutes % slotMinutes === 0 &&
                  startMin + minutes <= close &&
                  !overlapsTaken(startMin, startMin + minutes, slotMinutes, taken);
                const selected = durationMinutes === minutes;
                return (
                  <button
                    key={minutes}
                    type="button"
                    disabled={!fits}
                    aria-pressed={selected}
                    onClick={() => chooseDuration(minutes)}
                    className={`focus-ring h-8 rounded-pill border px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      selected ? "border-primary bg-primary text-white" : "bg-surface text-ink hover:bg-sidebar"
                    }`}
                  >
                    {formatDuration(minutes)}
                  </button>
                );
              })}
            </div>

            <AvailabilityNote
              status={slots.status}
              hasChoice={Boolean(court && values.date)}
              courtName={court?.name ?? ""}
              ranges={ranges}
            />
          </section>

          <section aria-labelledby="booking-price" className="space-y-4">
            <h3 id="booking-price" className="type-overline text-muted">
              Price
            </h3>
            <Input
              label={`Hourly rate (${settings.currency})`}
              value={values.rate}
              onChange={(event) => set("rate", event.target.value)}
              error={errors.rate}
              inputMode="decimal"
              autoComplete="off"
              placeholder="e.g. 150"
            />
            <p className="-mt-2 text-xs text-muted">
              Set the rate this customer pays (for example a member or partner rate). Partial hours are billed proportionally.
            </p>
          </section>

          {/* Worked out from the typed rate; the saved booking keeps its own copy (AGENTS.md "Money rules") */}
          <dl aria-live="polite" className="grid grid-cols-3 gap-3 rounded-card bg-sidebar px-4 py-3">
            <SummaryItem label="Duration" value={durationMinutes ? formatDuration(durationMinutes) : "–"} />
            <SummaryItem label="Rate" value={hourlyRateMinor ? formatRate(hourlyRateMinor, settings.currency) : "–"} />
            <SummaryItem
              label="Total"
              emphasis
              value={
                hourlyRateMinor && durationMinutes
                  ? formatMoney(calcTotalMinor(hourlyRateMinor, durationMinutes), settings.currency)
                  : "–"
              }
            />
          </dl>

          <section aria-labelledby="booking-extra" className="space-y-4">
            <h3 id="booking-extra" className="type-overline text-muted">
              Details
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Status"
                value={values.status}
                onChange={(event) => set("status", event.target.value as NewBookingStatus)}
              >
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
              </Select>
            </div>
            <Textarea
              label="Notes (optional)"
              rows={2}
              value={values.notes}
              onChange={(event) => set("notes", event.target.value)}
              error={errors.notes}
              maxLength={NOTES_MAX + 50}
              placeholder="Anything the team should know"
            />
          </section>
        </div>
      </ModalBody>

      <ModalFooter>
        {submitError && (
          <p role="alert" className="mr-auto text-xs text-danger">
            {submitError}
          </p>
        )}
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {saving ? "Saving…" : booking ? "Save changes" : "Create booking"}
        </Button>
      </ModalFooter>
    </form>
  );
}

function SummaryItem({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={emphasis ? "type-h2 mt-0.5" : "mt-0.5 text-sm font-semibold text-ink"}>{value}</dd>
    </div>
  );
}

type AvailabilityNoteProps = {
  status: "loading" | "error" | "ready";
  hasChoice: boolean;
  courtName: string;
  ranges: { start: number; end: number }[];
};

// Tells the person what is already taken on the chosen court and day
function AvailabilityNote({ status, hasChoice, courtName, ranges }: AvailabilityNoteProps) {
  if (!hasChoice) return <p className="text-xs text-muted">Choose a court and date to see what is already booked.</p>;
  if (status === "loading") return <p className="text-xs text-muted">Checking availability…</p>;
  if (status === "error") {
    return <p className="text-xs text-muted">We couldn't check what is booked. We'll check again when you save.</p>;
  }
  if (ranges.length === 0) return <p className="text-xs text-success">{courtName} is free all day.</p>;
  return (
    <p className="text-xs text-muted">
      Already booked on {courtName}:{" "}
      <span className="font-medium text-ink">
        {ranges.map((range) => `${formatMinutes(range.start)}–${formatMinutes(range.end)}`).join(", ")}
      </span>
    </p>
  );
}
