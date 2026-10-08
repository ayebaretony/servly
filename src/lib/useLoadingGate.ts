import { useEffect, useRef, useState } from "react";

type GateOptions = {
  delayMs?: number; // how long loading must last before the loader appears
  minVisibleMs?: number; // once it has appeared, how long it stays at least
};

// Stops a loader from flashing on fast loads: it only appears after `delayMs`, and once it appears it stays for `minVisibleMs`.
//   busy    = true while loading, and while a loader that has appeared is still being held on screen.
//             Show the loader (or nothing) instead of the content while this is true.
//   visible = true when the loader itself should be drawn.
// So during the first `delayMs` of a load, busy is true and visible is false: render nothing, not the content.
export function useLoadingGate(loading: boolean, { delayMs = 300, minVisibleMs = 600 }: GateOptions = {}) {
  const [shown, setShown] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (loading) {
      if (shown) return; // already on screen; a second load just keeps it there
      const timer = setTimeout(() => {
        shownAt.current = Date.now();
        setShown(true);
      }, delayMs);
      return () => clearTimeout(timer);
    }
    if (!shown) return; // finished before the loader ever appeared: nothing to hold
    const remaining = minVisibleMs - (Date.now() - shownAt.current);
    const timer = setTimeout(() => setShown(false), Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [loading, shown, delayMs, minVisibleMs]);

  return { busy: loading || shown, visible: shown };
}
