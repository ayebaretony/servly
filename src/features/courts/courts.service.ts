import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Court } from "@/types/court";

// Courts change rarely, so they are read once and kept in memory (AGENTS.md section 8).
// Whoever adds court editing (Phase 2) needs to clear this after a save.
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
