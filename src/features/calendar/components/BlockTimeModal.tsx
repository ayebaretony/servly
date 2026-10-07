import { useMemo, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/useToast";
import { BookingError } from "@/features/bookings/bookings.service";
import { parseMinutes } from "@/features/bookings/booking.validation";
import { useTakenSlots } from "@/features/bookings/hooks/useTakenSlots";
import { bookedRanges, overlapsTaken } from "@/lib/conflicts";
import { formatMinutes, formatTimeRange, parseHHmm, todayInTimezone, zonedDateTime } from "@/lib/time";
import type { Court } from "@/types/court";
import type { CenterSettings } from "@/types/settings";
import { validateBlock, REASON_MAX, type BlockFormValues } from "../block.validation";
import { createBlock } from "../blocks.service";

type BlockTimeModalProps = {
  courts: Court[];
  settings: CenterSettings;
  uid: string;
  initialDate?: string;
  onClose: () => void;
  onSaved: () => void; // lets the calendar read again
};

// "Block time for maintenance" (admins only). Closes one court for part of one day; the time can't be booked until it is removed.
export function BlockTimeModal({ courts, settings, uid, initialDate, onClose, onSaved }: BlockTimeModalProps) {
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  // Fixed while the form is open, so what it shows and what it validates always agree
  const [openedAt] = useState(() => new Date());

  const [values, setValues] = useState<BlockFormValues>({
    courtId: courts.length === 1 ? courts[0].id : "",
    date: initialDate ?? todayInTimezone(settings.timezone, openedAt),
    start: "",
    end: "",
    reason: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const slots = useTakenSlots(values.courtId, values.date, 0);
  const { taken } = slots;

  const { slotMinutes } = settings;
  const open = parseHHmm(settings.openTime);
  const close = parseHHmm(settings.closeTime);
  const startMin = parseMinutes(values.start);
  const endMin = parseMinutes(values.end);
  const errors = submitted ? validateBlock(values, { courts, settings, now: openedAt, taken }) : {};

  const startOptions = useMemo(() => {
    const options: number[] = [];
    for (let minute = open; minute + slotMinutes <= close; minute += slotMinutes) options.push(minute);
    return options;
  }, [open, close, slotMinutes]);

  const endOptions = useMemo(() => {
    if (startMin === null) return [];
    const options: number[] = [];
    for (let minute = startMin + slotMinutes; minute <= close; minute += slotMinutes) options.push(minute);
    return options;
  }, [startMin, slotMinutes, close]);

  function set<K extends keyof BlockFormValues>(field: K, value: BlockFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  // A new start clears an end that would now be too early
  function chooseStart(value: string) {
    setValues((current) => {
      const currentEnd = parseMinutes(current.end);
      return { ...current, start: value, end: currentEnd !== null && currentEnd > Number(value) ? current.end : "" };
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSubmitted(true);
    setSubmitError(null);

    const found = validateBlock(values, { courts, settings, now: openedAt, taken });
    if (Object.keys(found).length > 0 || startMin === null || endMin === null) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }

    setSaving(true);
    try {
      await createBlock(
        { courtId: values.courtId, date: values.date, startMin, endMin, reason: values.reason.trim() },
        uid,
        settings,
      );
      const court = courts.find((c) => c.id === values.courtId);
      showToast(
        `Time blocked: ${court?.name ?? "court"}, ${formatTimeRange(
          zonedDateTime(values.date, startMin, settings.timezone),
          zonedDateTime(values.date, endMin, settings.timezone),
          settings.timezone,
        )}.`,
      );
      onSaved();
      onClose();
    } catch (error) {
      setSubmitError(
        error instanceof BookingError ? error.message : "We couldn't save the block. Check your connection and try again.",
      );
      setSaving(false);
    }
  }

  const ranges = bookedRanges(taken, slotMinutes);
  const court = courts.find((c) => c.id === values.courtId);

  return (
    <Modal title="Block time for maintenance" description="Close a court so it can't be booked." onClose={onClose}>
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalBody>
          <div className="space-y-4">
            <Select
              label="Court"
              value={values.courtId}
              onChange={(event) => set("courtId", event.target.value)}
              error={errors.courtId}
              autoFocus
            >
              <option value="">Select a court</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Date"
                type="date"
                value={values.date}
                onChange={(event) => set("date", event.target.value)}
                error={errors.date}
              />
              <Select label="Start time" value={values.start} onChange={(event) => chooseStart(event.target.value)} error={errors.start}>
                <option value="">Select</option>
                {startOptions.map((minute) => (
                  <option key={minute} value={minute} disabled={taken.has(minute)}>
                    {formatMinutes(minute)}
                    {taken.has(minute) ? " · taken" : ""}
                  </option>
                ))}
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

            <AvailabilityNote
              status={slots.status}
              hasChoice={Boolean(court && values.date)}
              courtName={court?.name ?? ""}
              ranges={ranges}
            />

            <Input
              label="Reason"
              value={values.reason}
              onChange={(event) => set("reason", event.target.value)}
              error={errors.reason}
              maxLength={REASON_MAX + 50}
              autoComplete="off"
              placeholder="e.g. Resurfacing"
            />
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
          <Button type="submit" disabled={saving}>
            {saving ? "Blocking…" : "Block time"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

type AvailabilityNoteProps = {
  status: "loading" | "error" | "ready";
  hasChoice: boolean;
  courtName: string;
  ranges: { start: number; end: number }[];
};

// What is already taken (by bookings or other blocks) on the chosen court and day
function AvailabilityNote({ status, hasChoice, courtName, ranges }: AvailabilityNoteProps) {
  if (!hasChoice) return <p className="text-xs text-muted">Choose a court and date to see what is already taken.</p>;
  if (status === "loading") return <p className="text-xs text-muted">Checking availability…</p>;
  if (status === "error") return <p className="text-xs text-muted">We couldn't check what is taken. We'll check again when you save.</p>;
  if (ranges.length === 0) return <p className="text-xs text-success">{courtName} is free all day.</p>;
  return (
    <p className="text-xs text-muted">
      Already taken on {courtName}:{" "}
      <span className="font-medium text-ink">
        {ranges.map((range) => `${formatMinutes(range.start)}–${formatMinutes(range.end)}`).join(", ")}
      </span>
    </p>
  );
}
