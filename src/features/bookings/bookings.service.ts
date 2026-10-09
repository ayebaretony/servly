import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  Timestamp,
  where,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { fromHHmm, slotKey, slotStarts } from "@/lib/conflicts";
import { db } from "@/lib/firebase";
import { calcTotalMinor } from "@/lib/money";
import { minutesOfDay, zonedDateTime } from "@/lib/time";
import type { Booking, BookingStatus } from "@/types/booking";
import type { Court } from "@/types/court";
import type { CenterSettings } from "@/types/settings";
import type { NewBookingStatus } from "./booking.validation";
import { checkBookingWindow } from "./bookings.rules";

// Firestore security rules already guarantee the stored shape (see validBooking in firestore.rules), so this is a typed read, not a re-check.
export function readBooking(snapshot: QueryDocumentSnapshot): Booking {
  return { id: snapshot.id, ...(snapshot.data() as Omit<Booking, "id">) };
}

// Something the person can fix or act on, with a message that is safe to show as-is
export class BookingError extends Error {
  readonly code: "slot-taken" | "court-unavailable" | "invalid" | "not-found" | "permission-denied" | "failed";

  constructor(code: BookingError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

// Start minutes of the slots already taken on one court and day (by bookings and maintenance blocks).
// Two equality filters need no composite index, and a day has at most a few dozen slots.
export async function fetchTakenSlotStarts(courtId: string, date: string): Promise<number[]> {
  const snapshot = await getDocs(
    query(collection(db, "slots"), where("courtId", "==", courtId), where("date", "==", date)),
  );
  // The slot id ends in the start time: courtId_date_HHmm
  return snapshot.docs.map((slot) => fromHHmm(slot.id.slice(-4)));
}

export type NewBookingInput = {
  courtId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  date: string; // "YYYY-MM-DD" at the center
  startMin: number;
  endMin: number;
  hourlyRateMinor: number; // what this customer pays per hour, in minor units
  status: NewBookingStatus;
  notes: string | null;
};

export type CreatedBooking = {
  id: string;
  courtName: string;
  startAt: Date;
  endAt: Date;
  totalMinor: number;
};

// Creates the booking and every slot it occupies in ONE transaction (AGENTS.md section 7, "Double-booking prevention").
// If any slot already exists, nothing is written and the person is told the time is gone. Two people saving the same
// time at once can't both win: Firestore re-runs the loser's transaction, which then finds the slot taken.
export async function createBooking(
  input: NewBookingInput,
  actor: { uid: string; isAdmin: boolean },
  settings: CenterSettings,
): Promise<CreatedBooking> {
  const problem = checkBookingWindow({
    date: input.date,
    startMin: input.startMin,
    endMin: input.endMin,
    settings,
    isAdmin: actor.isAdmin,
    now: new Date(),
  });
  if (problem) throw new BookingError("invalid", problem.message);
  if (!Number.isInteger(input.hourlyRateMinor) || input.hourlyRateMinor <= 0) {
    throw new BookingError("invalid", "Enter the hourly rate for this booking.");
  }

  const startAt = zonedDateTime(input.date, input.startMin, settings.timezone);
  const endAt = zonedDateTime(input.date, input.endMin, settings.timezone);
  const durationMinutes = input.endMin - input.startMin;
  const slotIds = slotStarts(input.startMin, input.endMin, settings.slotMinutes).map((minute) =>
    slotKey(input.courtId, input.date, minute),
  );

  const courtRef = doc(db, "courts", input.courtId);
  const bookingRef = doc(collection(db, "bookings"));

  return runTransaction(db, async (transaction) => {
    // Firestore wants every read before the first write
    // The court is read fresh so its maintenance status is never stale
    const courtSnapshot = await transaction.get(courtRef);
    const slotSnapshots = await Promise.all(slotIds.map((id) => transaction.get(doc(db, "slots", id))));

    const court = courtSnapshot.data() as Omit<Court, "id"> | undefined;
    if (!court || court.archived || court.status !== "available") {
      throw new BookingError("court-unavailable", "That court isn't available for booking right now.");
    }
    if (slotSnapshots.some((slot) => slot.exists())) {
      throw new BookingError("slot-taken", "That time is no longer available. Please pick another time.");
    }

    const totalMinor = calcTotalMinor(input.hourlyRateMinor, durationMinutes);
    transaction.set(bookingRef, {
      courtId: input.courtId,
      courtName: court.name,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      date: input.date,
      startAt: Timestamp.fromDate(startAt),
      endAt: Timestamp.fromDate(endAt),
      durationMinutes,
      // The rate is chosen per booking and stored with it, so the total never changes later
      hourlyRateMinor: input.hourlyRateMinor,
      totalMinor,
      status: input.status,
      notes: input.notes,
      createdBy: actor.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    for (const id of slotIds) {
      transaction.set(doc(db, "slots", id), {
        courtId: input.courtId,
        date: input.date,
        bookingId: bookingRef.id,
        blockId: null,
      });
    }

    return { id: bookingRef.id, courtName: court.name, startAt, endAt, totalMinor };
  });
}

// ---------- Reading the Bookings table ----------

// "" means "no filter" for that field
export type BookingFilters = { date: string; courtId: string; status: BookingStatus | "" };

export const NO_FILTERS: BookingFilters = { date: "", courtId: "", status: "" };

export const PAGE_SIZE = 10;

// How many matching bookings are read at once for the summary strip, the search box and the CSV export (AGENTS.md section 8: bounded reads)
export const MATCHING_LIMIT = 500;

function filterConstraints({ date, courtId, status }: BookingFilters): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];
  if (date) constraints.push(where("date", "==", date));
  if (courtId) constraints.push(where("courtId", "==", courtId));
  if (status) constraints.push(where("status", "==", status));
  return constraints;
}

export type BookingsPage = {
  bookings: Booking[];
  // Pass this back as `after` to get the next page
  lastDoc: QueryDocumentSnapshot | null;
};

// One page, newest first. Equality filters plus the start-time order need the composite indexes in firestore.indexes.json.
export async function fetchBookingsPage(filters: BookingFilters, after: QueryDocumentSnapshot | null): Promise<BookingsPage> {
  const constraints = [...filterConstraints(filters), orderBy("startAt", "desc")];
  if (after) constraints.push(startAfter(after));
  const snapshot = await getDocs(query(collection(db, "bookings"), ...constraints, limit(PAGE_SIZE)));
  return { bookings: snapshot.docs.map(readBooking), lastDoc: snapshot.docs[snapshot.docs.length - 1] ?? null };
}

// The "of 42" in the pager. A count query is billed as a tiny fraction of a read, not one read per booking.
export async function fetchBookingCount(filters: BookingFilters): Promise<number> {
  const snapshot = await getCountFromServer(query(collection(db, "bookings"), ...filterConstraints(filters)));
  return snapshot.data().count;
}

// Up to MATCHING_LIMIT of the newest matching bookings, for the summary, search and export
export async function fetchMatchingBookings(filters: BookingFilters): Promise<Booking[]> {
  const snapshot = await getDocs(
    query(collection(db, "bookings"), ...filterConstraints(filters), orderBy("startAt", "desc"), limit(MATCHING_LIMIT)),
  );
  return snapshot.docs.map(readBooking);
}

// ---------- Cancelling and deleting ----------

// Firestore's own messages are technical (and can carry customer details), so people only see ours
function toBookingError(error: unknown, deniedMessage: string, failedMessage: string): BookingError {
  if (error instanceof BookingError) return error;
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (code === "permission-denied") return new BookingError("permission-denied", deniedMessage);
  return new BookingError("failed", failedMessage);
}

// The slot documents a booking holds. They are found by bookingId rather than rebuilt from the booking's times, so this
// still works if the center's slot length was changed after the booking was made.
async function findSlotRefs(bookingId: string) {
  const snapshot = await getDocs(query(collection(db, "slots"), where("bookingId", "==", bookingId)));
  return snapshot.docs.map((slot) => slot.ref);
}

// Cancel: the booking stays in the list marked "Cancelled", and its slots are released in the SAME transaction,
// so the time can be booked again straight away (AGENTS.md section 7, rule 4).
export async function cancelBooking(bookingId: string): Promise<void> {
  const bookingRef = doc(db, "bookings", bookingId);
  try {
    const slotRefs = await findSlotRefs(bookingId);
    await runTransaction(db, async (transaction) => {
      // Firestore wants every read before the first write
      const bookingSnapshot = await transaction.get(bookingRef);
      const slotSnapshots = await Promise.all(slotRefs.map((ref) => transaction.get(ref)));

      if (!bookingSnapshot.exists()) throw new BookingError("not-found", "This booking no longer exists.");
      if (bookingSnapshot.data().status === "cancelled") {
        throw new BookingError("invalid", "This booking is already cancelled.");
      }

      transaction.update(bookingRef, { status: "cancelled", updatedAt: serverTimestamp() });
      for (const slot of slotSnapshots) {
        // Only release slots that still belong to this booking
        if (slot.exists() && slot.data().bookingId === bookingId) transaction.delete(slot.ref);
      }
    });
  } catch (error) {
    throw toBookingError(
      error,
      "You don't have permission to cancel this booking.",
      "We couldn't cancel the booking. Check your connection and try again.",
    );
  }
}

// Delete (admins only, enforced by firestore.rules): removes a booking that was made by mistake, for good.
// The booking and its slots go in one transaction, so the time is freed and no orphan slot is left blocking it.
export async function deleteBooking(bookingId: string): Promise<void> {
  const bookingRef = doc(db, "bookings", bookingId);
  try {
    const slotRefs = await findSlotRefs(bookingId);
    await runTransaction(db, async (transaction) => {
      const bookingSnapshot = await transaction.get(bookingRef);
      const slotSnapshots = await Promise.all(slotRefs.map((ref) => transaction.get(ref)));

      if (!bookingSnapshot.exists()) throw new BookingError("not-found", "This booking has already been deleted.");

      transaction.delete(bookingRef);
      for (const slot of slotSnapshots) {
        if (slot.exists() && slot.data().bookingId === bookingId) transaction.delete(slot.ref);
      }
    });
  } catch (error) {
    throw toBookingError(
      error,
      "Only an admin can delete a booking.",
      "We couldn't delete the booking. Check your connection and try again.",
    );
  }
}

// ---------- Changing the status ----------

// Pending <-> Confirmed only flips the label: the booking keeps its slots, so the time stays held either way.
// Reinstating a cancelled booking is different: its slots were released, so they are taken again in the SAME transaction
// (AGENTS.md section 7). If someone booked that time in the meantime, nothing changes and the person is told.
// To cancel, use cancelBooking: it releases the slots.
export async function changeBookingStatus(
  bookingId: string,
  status: NewBookingStatus,
  actor: { isAdmin: boolean },
  settings: CenterSettings,
): Promise<void> {
  const bookingRef = doc(db, "bookings", bookingId);
  try {
    await runTransaction(db, async (transaction) => {
      // Firestore wants every read before the first write
      const bookingSnapshot = await transaction.get(bookingRef);
      if (!bookingSnapshot.exists()) throw new BookingError("not-found", "This booking no longer exists.");
      const booking = bookingSnapshot.data() as Omit<Booking, "id">;
      if (booking.status === status) throw new BookingError("invalid", `This booking is already ${status}.`);

      if (booking.status !== "cancelled") {
        transaction.update(bookingRef, { status, updatedAt: serverTimestamp() });
        return;
      }

      // Same rule as a new booking: staff can't bring back a time that has already started
      if (!actor.isAdmin && booking.startAt.toDate() <= new Date()) {
        throw new BookingError("invalid", "This booking's time has already passed. Ask an admin to reinstate it.");
      }

      const startMin = minutesOfDay(booking.startAt.toDate(), settings.timezone);
      const slotRefs = slotStarts(startMin, startMin + booking.durationMinutes, settings.slotMinutes).map((minute) =>
        doc(db, "slots", slotKey(booking.courtId, booking.date, minute)),
      );
      const courtSnapshot = await transaction.get(doc(db, "courts", booking.courtId));
      const slotSnapshots = await Promise.all(slotRefs.map((ref) => transaction.get(ref)));

      const court = courtSnapshot.data() as Omit<Court, "id"> | undefined;
      if (!court || court.archived || court.status !== "available") {
        throw new BookingError("court-unavailable", "That court isn't available for booking right now.");
      }
      // A slot still pointing at this booking is its own leftover, not a clash
      if (slotSnapshots.some((slot) => slot.exists() && slot.data().bookingId !== bookingId)) {
        throw new BookingError("slot-taken", "That time has been booked by someone else, so this booking can't be reinstated.");
      }

      transaction.update(bookingRef, { status, updatedAt: serverTimestamp() });
      for (const ref of slotRefs) {
        transaction.set(ref, { courtId: booking.courtId, date: booking.date, bookingId, blockId: null });
      }
    });
  } catch (error) {
    throw toBookingError(
      error,
      "You don't have permission to change this booking.",
      "We couldn't change the status. Check your connection and try again.",
    );
  }
}
