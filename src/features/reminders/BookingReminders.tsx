import { BellRing, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCenterSettings } from "@/features/settings/hooks/useCenterSettings";
import { useTodayBookings } from "@/features/dashboard/hooks/useTodayBookings";
import { playChime } from "@/lib/popSound";
import { formatClock, todayInTimezone } from "@/lib/time";
import { useNow } from "@/lib/useNow";
import { DEFAULT_CENTER_SETTINGS } from "@/types/settings";
import type { Booking } from "@/types/booking";
import { dueBookings, minutesUntilLabel, reminderKey } from "./reminders.logic";

const STORAGE_KEY = "servly.reminded";

// Remembered for the browser session so a page refresh doesn't chime again for the same booking
function loadReminded(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function saveReminded(keys: Set<string>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
  } catch {
    // Storage blocked: worst case is a repeat chime after a refresh
  }
}

// Admin only. Watches today's bookings and, 30 minutes before each one starts, plays a chime and shows a pop-up that
// stays until it is dismissed. It works while Servly is open (also in the background); a closed app cannot be
// reminded without Cloud Functions, which the free plan does not allow.
export function BookingReminders() {
  const settings = useCenterSettings();
  const timezone = settings.status === "ready" ? settings.data.timezone : DEFAULT_CENTER_SETTINGS.timezone;
  // Checked twice a minute, so a reminder is never more than ~30 seconds late
  const now = useNow(30_000);
  const nowMs = now.getTime();
  const bookings = useTodayBookings(todayInTimezone(timezone, now));

  const reminded = useRef<Set<string> | null>(null);
  const [shown, setShown] = useState<Booking[]>([]);

  useEffect(() => {
    if (bookings.status !== "ready") return;
    reminded.current ??= loadReminded();
    const due = dueBookings(bookings.data, nowMs, reminded.current);
    if (due.length === 0) return;
    due.forEach((booking) => reminded.current?.add(reminderKey(booking)));
    saveReminded(reminded.current);
    playChime();
    setShown((current) => [...current, ...due]);
  }, [bookings, nowMs]);

  if (shown.length === 0) return null;

  return (
    // role="alert" so screen readers announce it straight away
    <div role="alert" className="fixed right-4 top-20 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      {shown.map((booking) => (
        <div key={reminderKey(booking)} className="card flex items-start gap-3 border-warning bg-warning-soft px-4 py-3 shadow-lg">
          <BellRing aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning-ink" />
          <div className="min-w-0 flex-1 text-sm text-ink">
            <p className="font-semibold">
              {booking.courtName} {minutesUntilLabel(booking.startAt.toMillis(), nowMs)}
            </p>
            <p>
              {booking.customerName} at {formatClock(booking.startAt.toDate(), timezone)}. Time to prepare the equipment.
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss reminder"
            onClick={() => setShown((current) => current.filter((item) => reminderKey(item) !== reminderKey(booking)))}
            className="focus-ring grid size-7 shrink-0 place-items-center rounded-button text-warning-ink hover:bg-warning/20"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
