import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_CENTER_SETTINGS, type CenterSettings } from "@/types/settings";

// Settings change rarely, so they are read once and kept in memory (AGENTS.md section 8).
let cached: Promise<CenterSettings> | null = null;

async function readSettings(): Promise<CenterSettings> {
  const snapshot = await getDoc(doc(db, "settings", "center"));
  // Not seeded yet (Phase 2 does that): fall back to the approved defaults instead of breaking every screen
  if (!snapshot.exists()) return DEFAULT_CENTER_SETTINGS;
  return { ...DEFAULT_CENTER_SETTINGS, ...(snapshot.data() as Partial<CenterSettings>) };
}

export function fetchCenterSettings(): Promise<CenterSettings> {
  if (!cached) {
    cached = readSettings();
    // A failed read must not stay cached, or "Try again" would keep returning the same failure
    cached.catch(() => {
      cached = null;
    });
  }
  return cached;
}
