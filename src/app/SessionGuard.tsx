import { useEffect, useState } from "react";
import { checkAccess, signOutUser } from "@/features/auth/auth.service";
import { setSignOutNotice } from "@/features/auth/sessionNotice";
import { useAuth } from "@/features/auth/useAuth";
import { fetchSecuritySettings } from "@/features/settings/security.service";
import { DEFAULT_SECURITY_SETTINGS } from "@/types/settings";

// How often an open screen re-checks that the person is still approved and re-reads the sign-out policy
const CHECK_EVERY_MS = 5 * 60 * 1000;
// How often the idle timer looks at the clock. A timer that was frozen (laptop asleep) catches up on the next look.
const IDLE_LOOK_EVERY_MS = 15 * 1000;
const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"] as const;

// Renders nothing. Two protections for everyone who is signed in:
// 1. Removing or suspending someone takes effect on screens that are already open (within a few minutes).
// 2. Signing out automatically after the inactivity time the admin chose in Settings.
export function SessionGuard() {
  const auth = useAuth();
  const uid = auth.status === "active" ? auth.uid : null;
  const { refresh } = auth;
  const [idleMinutes, setIdleMinutes] = useState(DEFAULT_SECURITY_SETTINGS.idleTimeoutMinutes);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;

    async function check() {
      // Two separate tries: if one read fails (offline), the other check still runs
      try {
        const settings = await fetchSecuritySettings();
        if (!cancelled) setIdleMinutes(settings.idleTimeoutMinutes);
      } catch {
        // Keep the last known value and try again next time
      }
      try {
        const access = await checkAccess(uid!);
        if (cancelled) return;
        if (access === "removed") {
          setSignOutNotice("Your access to Servly was removed. Contact your administrator if this is a mistake.");
          void signOutUser();
        } else if (access === "suspended") {
          // Re-checks the profile, which shows the "waiting for approval" screen
          refresh();
        }
      } catch {
        // Offline: the next check will catch it
      }
    }

    void check();
    const timer = window.setInterval(() => void check(), CHECK_EVERY_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [uid, refresh]);

  useEffect(() => {
    if (!uid || idleMinutes === 0) return;
    const limitMs = idleMinutes * 60 * 1000;
    const activityKey = `servly:last-activity:${uid}`;
    let lastActivity = Date.now();
    localStorage.setItem(activityKey, String(lastActivity));

    const onActivity = () => {
      lastActivity = Date.now();
      localStorage.setItem(activityKey, String(lastActivity));
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== activityKey || event.newValue === null) return;
      const timestamp = Number(event.newValue);
      if (Number.isFinite(timestamp)) lastActivity = Math.max(lastActivity, timestamp);
    };
    const lookAtClock = () => {
      const sharedActivity = Number(localStorage.getItem(activityKey));
      if (Number.isFinite(sharedActivity)) lastActivity = Math.max(lastActivity, sharedActivity);
      if (Date.now() - lastActivity < limitMs) return;
      setSignOutNotice("You were signed out because you were inactive for a while. Sign in again to continue.");
      void signOutUser();
    };

    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, onActivity, { passive: true }));
    window.addEventListener("storage", onStorage);
    const timer = window.setInterval(lookAtClock, IDLE_LOOK_EVERY_MS);
    return () => {
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, onActivity));
      window.removeEventListener("storage", onStorage);
      window.clearInterval(timer);
    };
  }, [uid, idleMinutes]);

  return null;
}
