import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_SECURITY_SETTINGS, IDLE_TIMEOUT_OPTIONS, type SecuritySettings } from "@/types/settings";

const ref = () => doc(db, "settings", "security");

// Read fresh every time (not cached like the center settings): the session guard re-reads it every few minutes so a
// change the admin makes reaches people who already have the app open.
export async function fetchSecuritySettings(): Promise<SecuritySettings> {
  const snapshot = await getDoc(ref());
  const minutes: unknown = snapshot.data()?.idleTimeoutMinutes;
  // Anything missing or unexpected falls back to the default rather than switching protection off by accident
  const known = IDLE_TIMEOUT_OPTIONS.find((option) => option === minutes);
  return { idleTimeoutMinutes: known ?? DEFAULT_SECURITY_SETTINGS.idleTimeoutMinutes };
}

// A failure with a message that is safe to show as-is
export class SecuritySettingsError extends Error {}

export async function saveSecuritySettings(settings: SecuritySettings): Promise<void> {
  try {
    await setDoc(ref(), { idleTimeoutMinutes: settings.idleTimeoutMinutes });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    throw new SecuritySettingsError(
      code === "permission-denied" ? "Only the admin can change security settings." : "We couldn't save the setting. Check your connection and try again.",
    );
  }
}
