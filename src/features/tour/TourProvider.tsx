import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useOpenNewBooking } from "@/app/useOpenNewBooking";
import { useAuth } from "@/features/auth/useAuth";
import { useCourts } from "@/features/courts/hooks/useCourts";
import { useCenterSettings } from "@/features/settings/hooks/useCenterSettings";
import { TourContext, type TourContextValue } from "./TourContext";
import { TourOverlay } from "./TourOverlay";
import { markTourDone } from "./tour.service";
import { needsTour } from "./tour.steps";

// How often to check that the page has settled before the tour starts
const SETTLE_CHECK_MS = 250;

// Starts the welcome tour the first time someone signs in (and again when the tour is updated), and lets the
// "Replay tour" button start it on demand. Mount inside the booking pop-up provider and the router.
export function TourProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const settings = useCenterSettings();
  const courts = useCourts();
  const openNewBooking = useOpenNewBooking();

  // null = closed. `replay` tours are for people who have already seen it, so they aren't saved again.
  const [session, setSession] = useState<{ replay: boolean } | null>(null);
  // Set once the tour has been shown this visit, so finishing it can't be followed by it starting again
  // while the saved "seen it" flag is still on its way to the profile the app already loaded.
  const [handled, setHandled] = useState(false);

  const active = auth.status === "active" ? auth : null;
  const wantsTour = !!active && needsTour(active.profile) && !handled;
  const dataReady = settings.status === "ready" && courts.status === "ready";
  const shouldStart = wantsTour && dataReady && !session;

  // Wait until the page behind has finished loading (no Ace loader, no pop-up open), so there is only ever one Ace
  useEffect(() => {
    if (!shouldStart) return;
    let calmChecks = 0;
    const timer = setInterval(() => {
      const busy = document.querySelector(".ace-state, dialog[open]");
      calmChecks = busy ? 0 : calmChecks + 1;
      if (calmChecks >= 2) {
        clearInterval(timer);
        setSession({ replay: false });
      }
    }, SETTLE_CHECK_MS);
    return () => clearInterval(timer);
  }, [shouldStart]);

  const startTour = useCallback(() => setSession({ replay: true }), []);
  const value = useMemo<TourContextValue>(() => ({ startTour }), [startTour]);

  function close(how: "finish" | "skip") {
    const wasReplay = session?.replay ?? false;
    setSession(null);
    setHandled(true);
    // Finishing and skipping both count as "seen it". If saving fails the tour just shows once more next time.
    if (active && !wasReplay) void markTourDone(active.uid).catch(() => undefined);
    if (how === "finish") openNewBooking();
  }

  return (
    <TourContext.Provider value={value}>
      {children}
      {session && active && createPortal(<TourOverlay role={active.profile.role} onClose={close} />, document.body)}
    </TourContext.Provider>
  );
}
