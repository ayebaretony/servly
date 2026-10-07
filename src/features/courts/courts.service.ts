import { addDoc, collection, doc, getDocs, orderBy, query, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { nextCourtColor } from "@/theme/courtColors";
import type { Court, CourtStatus } from "@/types/court";

// Courts change rarely, so they are read once and kept in memory (AGENTS.md section 8).
// Every write below clears this, so the next read (on this page or in the booking form) sees the change.
let cached: Promise<Court[]> | null = null;

async function readCourts(): Promise<Court[]> {
  // Sorted by one field so no composite index is needed; archived courts are dropped here (there are only a handful)
  const snapshot = await getDocs(query(collection(db, "courts"), orderBy("sortOrder")));
  return snapshot.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Court, "id">) }))
    .filter((court) => !court.archived);
}

export function fetchCourts(): Promise<Court[]> {
  if (!cached) {
    cached = readCourts();
    cached.catch(() => {
      cached = null;
    });
  }
  return cached;
}

function invalidateCourts() {
  cached = null;
}

// A failure with a message that is safe to show as-is
export class CourtError extends Error {}

// Firestore's own messages are technical, so only the one case a person can act on gets its own wording
function toCourtError(error: unknown): CourtError {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (code === "permission-denied") return new CourtError("Only an admin can change courts.");
  return new CourtError("We couldn't save the court. Check your connection and try again.");
}

export type CourtInput = {
  name: string;
  surface: string;
  status: CourtStatus;
};

// `existing` is the current list: the new court goes last and takes the next unused palette colour (AGENTS.md section 6).
export async function createCourt(input: CourtInput, existing: Court[]): Promise<void> {
  try {
    await addDoc(collection(db, "courts"), {
      ...input,
      color: nextCourtColor(existing.map((court) => court.color)),
      sortOrder: existing.reduce((highest, court) => Math.max(highest, court.sortOrder), 0) + 1,
      archived: false,
    });
  } catch (error) {
    throw toCourtError(error);
  } finally {
    invalidateCourts();
  }
}

export async function updateCourt(courtId: string, input: CourtInput): Promise<void> {
  try {
    await updateDoc(doc(db, "courts", courtId), { ...input });
  } catch (error) {
    throw toCourtError(error);
  } finally {
    invalidateCourts();
  }
}

// Courts are archived, never deleted, so past bookings keep their court (AGENTS.md section 7)
export async function archiveCourt(courtId: string): Promise<void> {
  try {
    await updateDoc(doc(db, "courts", courtId), { archived: true });
  } catch (error) {
    throw toCourtError(error);
  } finally {
    invalidateCourts();
  }
}
