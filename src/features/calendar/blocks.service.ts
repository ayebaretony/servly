import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  Timestamp,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { BookingError } from "@/features/bookings/bookings.service";
import { checkBookingWindow } from "@/features/bookings/bookings.rules";
import { slotKey, slotStarts } from "@/lib/conflicts";
import { db } from "@/lib/firebase";
import { addDays, zonedDateTime } from "@/lib/time";
import type { Block } from "@/types/block";
import type { CenterSettings } from "@/types/settings";

function readBlock(snapshot: QueryDocumentSnapshot): Block {
  return { id: snapshot.id, ...(snapshot.data() as Omit<Block, "id">) };
}

// Blocks that start between two dates (inclusive). One range on one field, so no composite index is needed.
// Blocks stay inside a single day, so "starts on a day in the range" is the same as "falls in the range".
export async function fetchBlocksInRange(startDate: string, endDate: string, timezone: string): Promise<Block[]> {
  const from = Timestamp.fromDate(zonedDateTime(startDate, 0, timezone));
  const until = Timestamp.fromDate(zonedDateTime(addDays(endDate, 1), 0, timezone));
  const snapshot = await getDocs(
    query(collection(db, "blocks"), where("startAt", ">=", from), where("startAt", "<", until), orderBy("startAt")),
  );
  return snapshot.docs.map(readBlock);
}

export type NewBlockInput = {
  courtId: string;
  date: string; // "YYYY-MM-DD" at the center
  startMin: number;
  endMin: number;
  reason: string;
};

// Same shape as createBooking (AGENTS.md section 7, rule 5): the block and every slot it covers are written in ONE
// transaction, and if any slot already exists (a booking or another block) nothing is written.
export async function createBlock(input: NewBlockInput, uid: string, settings: CenterSettings): Promise<void> {
  // Only admins can block time, and admins may block any day, so the "not in the past" rule is skipped
  const problem = checkBookingWindow({
    date: input.date,
    startMin: input.startMin,
    endMin: input.endMin,
    settings,
    isAdmin: true,
    now: new Date(),
  });
  if (problem) throw new BookingError("invalid", problem.message);

  const slotIds = slotStarts(input.startMin, input.endMin, settings.slotMinutes).map((minute) =>
    slotKey(input.courtId, input.date, minute),
  );
  const blockRef = doc(collection(db, "blocks"));

  try {
    await runTransaction(db, async (transaction) => {
      // Firestore wants every read before the first write
      const slotSnapshots = await Promise.all(slotIds.map((id) => transaction.get(doc(db, "slots", id))));
      if (slotSnapshots.some((slot) => slot.exists())) {
        throw new BookingError(
          "slot-taken",
          "Part of that time is already booked or blocked on this court. Cancel the booking first, or pick another time.",
        );
      }

      transaction.set(blockRef, {
        courtId: input.courtId,
        startAt: Timestamp.fromDate(zonedDateTime(input.date, input.startMin, settings.timezone)),
        endAt: Timestamp.fromDate(zonedDateTime(input.date, input.endMin, settings.timezone)),
        reason: input.reason,
        createdBy: uid,
      });
      for (const id of slotIds) {
        transaction.set(doc(db, "slots", id), { courtId: input.courtId, date: input.date, bookingId: null, blockId: blockRef.id });
      }
    });
  } catch (error) {
    throw toBlockError(error, "Only an admin can block time.", "We couldn't save the block. Check your connection and try again.");
  }
}

// Removes the block and releases its slots in one transaction, so the time can be booked again straight away.
// Slots are found by blockId rather than rebuilt from the times, so this still works if the slot length changed later.
export async function deleteBlock(blockId: string): Promise<void> {
  const blockRef = doc(db, "blocks", blockId);
  try {
    const slots = await getDocs(query(collection(db, "slots"), where("blockId", "==", blockId)));
    await runTransaction(db, async (transaction) => {
      const blockSnapshot = await transaction.get(blockRef);
      const slotSnapshots = await Promise.all(slots.docs.map((slot) => transaction.get(slot.ref)));
      if (!blockSnapshot.exists()) throw new BookingError("not-found", "This block has already been removed.");

      transaction.delete(blockRef);
      for (const slot of slotSnapshots) {
        if (slot.exists() && slot.data().blockId === blockId) transaction.delete(slot.ref);
      }
    });
  } catch (error) {
    throw toBlockError(error, "Only an admin can remove a block.", "We couldn't remove the block. Check your connection and try again.");
  }
}

// Firestore's own messages are technical, so people only see ours
function toBlockError(error: unknown, deniedMessage: string, failedMessage: string): BookingError {
  if (error instanceof BookingError) return error;
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (code === "permission-denied") return new BookingError("permission-denied", deniedMessage);
  return new BookingError("failed", failedMessage);
}
