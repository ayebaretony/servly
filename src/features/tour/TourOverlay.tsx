import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AceFigure, type AcePose } from "@/components/ui/AceFigure";
import { Button } from "@/components/ui/Button";
import type { UserRole } from "@/types/user";
import { ensureVisible, measureTarget, nextFrame, prefersReducedMotion, sameRect, sleep, waitForTarget } from "./tour.dom";
import { WALK_MS, aceSize, computeLayout, type Rect } from "./tour.layout";
import { TOUR_STEPS } from "./tour.steps";

type TourOverlayProps = {
  role: UserRole;
  // finish = pressed the last button ("Start booking"); skip = Skip tour or Esc
  onClose: (how: "finish" | "skip") => void;
};

const LAST = TOUR_STEPS.length - 1;
const HOLE_RADIUS = 14;
const FADE_MS = 200;
const TARGET_WAIT_MS = 6000;
// Fallback until the bubble has been measured
const BUBBLE_H_GUESS = 240;

function useViewport() {
  const [size, setSize] = useState(() => ({ vw: window.innerWidth, vh: window.innerHeight }));
  useEffect(() => {
    const update = () => setSize({ vw: window.innerWidth, vh: window.innerHeight });
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

// The guided tour: dims the page, cuts a spotlight around the thing being explained, and walks Ace over to it with a
// speech bubble. Everything here is on screen only while the tour is open.
export function TourOverlay({ role, onClose }: TourOverlayProps) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { vw, vh } = useViewport();
  const titleId = useId();
  const bodyId = useId();

  const [index, setIndex] = useState(0); // the step being moved to
  const [skipped, setSkipped] = useState<number[]>([]); // steps whose target wasn't on screen
  // The step currently shown, and the spotlight rectangle around its target (null = centred, no hole)
  const [view, setView] = useState<{ index: number; rect: Rect | null }>({ index: 0, rect: null });
  const [aceVisible, setAceVisible] = useState(false);
  const [walking, setWalking] = useState(false);
  const [walkFlip, setWalkFlip] = useState(false);
  const [edge, setEdge] = useState<{ x: number; y: number } | null>(null); // where Ace starts when he walks in from the screen edge
  const [arrived, setArrived] = useState(false); // Ace is in place: the bubble can show
  const [bubbleH, setBubbleH] = useState(BUBBLE_H_GUESS);

  const bubbleRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const directionRef = useRef<1 | -1>(1);
  const shownOnceRef = useRef(false);
  const lastAceRef = useRef({ x: 0, y: 0 });
  const viewportRef = useRef({ vw, vh });
  const bubbleHRef = useRef(bubbleH);
  const reducedRef = useRef(reduced);
  // React Router hands out a new navigate function after every navigation. Held in a ref so that going to another
  // page doesn't restart the step that is in the middle of walking there.
  const navigateRef = useRef(navigate);

  // The async walking code below runs for a long time; these refs let it read the latest values without restarting
  useEffect(() => {
    viewportRef.current = { vw, vh };
    bubbleHRef.current = bubbleH;
    reducedRef.current = reduced;
    navigateRef.current = navigate;
  }, [vw, vh, bubbleH, reduced, navigate]);

  const go = useCallback((next: number, direction: 1 | -1) => {
    directionRef.current = direction;
    setArrived(false);
    setWalking(false);
    setEdge(null);
    setIndex(Math.min(Math.max(next, 0), LAST));
  }, []);

  // ---------- Getting to a step: navigate, find the target, walk Ace there ----------
  useEffect(() => {
    let cancelled = false;
    const step = TOUR_STEPS[index];

    async function arriveAt() {
      await nextFrame();
      if (cancelled) return;
      const { vw: width, vh: height } = viewportRef.current;
      const direction = directionRef.current;
      const crossPage = !!step.route && window.location.pathname !== step.route;
      const fromNowhere = !shownOnceRef.current;
      // Reduced motion, a new page and the very first step all skip the walk: Ace fades out and in (or walks in from the edge)
      const jump = crossPage || fromNowhere || reducedRef.current;

      if (jump) {
        setAceVisible(false);
        if (crossPage || fromNowhere) setView((current) => ({ ...current, rect: null }));
        if (!fromNowhere) {
          await sleep(FADE_MS - 20);
          if (cancelled) return;
        }
      }
      if (crossPage && step.route) navigateRef.current(step.route);

      let rect: Rect | null = null;
      if (step.target) {
        const el = await waitForTarget(step.target, TARGET_WAIT_MS, () => cancelled);
        if (cancelled) return;
        if (!el) {
          // Not on screen (feature missing, no permission, small screen): move on quietly
          setSkipped((current) => (current.includes(index) ? current : [...current, index]));
          go(index + direction, direction);
          return;
        }
        ensureVisible(el, width, height);
        await nextFrame();
        if (cancelled) return;
        rect = measureTarget(step.target);
      }

      const layout = computeLayout({ rect, vw: width, vh: height, bubbleH: bubbleHRef.current });
      const size = aceSize(width);

      if (jump && reducedRef.current) {
        setView({ index, rect });
        setAceVisible(true);
        shownOnceRef.current = true;
        await sleep(FADE_MS);
      } else if (jump) {
        // Walk in from whichever screen edge is nearer the spot
        const fromLeft = layout.ace.x + size / 2 < width / 2;
        setEdge({ x: fromLeft ? -size - 24 : width + 24, y: layout.ace.y });
        setWalkFlip(!fromLeft);
        setView({ index, rect });
        setAceVisible(true);
        shownOnceRef.current = true;
        await nextFrame();
        await nextFrame();
        if (cancelled) return;
        setWalking(true);
        setEdge(null);
        await sleep(WALK_MS);
      } else {
        const last = lastAceRef.current;
        const distance = Math.hypot(layout.ace.x - last.x, layout.ace.y - last.y);
        setView({ index, rect });
        if (distance < 4) {
          await sleep(FADE_MS - 50);
        } else {
          setWalkFlip(layout.ace.x < last.x);
          setWalking(true);
          await sleep(WALK_MS);
        }
      }
      if (cancelled) return;
      setWalking(false);
      setArrived(true);
    }

    void arriveAt();
    return () => {
      cancelled = true;
    };
  }, [index, go]);

  // ---------- Keeping the spotlight on the target as the page changes ----------
  const targetName = TOUR_STEPS[view.index].target;
  useEffect(() => {
    if (!targetName || !arrived) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = measureTarget(targetName);
        if (rect) setView((current) => (sameRect(current.rect, rect) ? current : { ...current, rect }));
      });
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    // Content that finishes loading can move the target, and nothing else announces that
    const timer = setInterval(update, 500);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      clearInterval(timer);
    };
  }, [targetName, arrived]);

  // ---------- Layout ----------
  const layout = useMemo(() => computeLayout({ rect: view.rect, vw, vh, bubbleH }), [view.rect, vw, vh, bubbleH]);
  const acePos = edge ?? layout.ace;
  const size = aceSize(vw);

  useEffect(() => {
    lastAceRef.current = { x: acePos.x, y: acePos.y };
  }, [acePos.x, acePos.y]);

  useEffect(() => {
    const el = bubbleRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setBubbleH(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ---------- Buttons and keys ----------
  const step = TOUR_STEPS[view.index];
  const isLast = view.index === LAST;
  const skippedBefore = skipped.filter((n) => n < view.index).length;
  const position = view.index + 1 - skippedBefore;
  const total = TOUR_STEPS.length - skipped.length;

  const goNext = useCallback(() => {
    if (index >= LAST) onClose("finish");
    else go(index + 1, 1);
  }, [index, go, onClose]);
  const goBack = useCallback(() => {
    if (index > 0) go(index - 1, -1);
  }, [index, go]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose("skip");
        return;
      }
      if (event.key === "Tab") {
        // Focus stays inside the bubble; while Ace is still walking there is nothing to focus
        const items = Array.from(bubbleRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled)") ?? []);
        if (!arrived || items.length === 0) return event.preventDefault();
        const first = items[0];
        const last = items[items.length - 1];
        const current = document.activeElement;
        if (!bubbleRef.current?.contains(current)) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && current === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && current === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }
      if (!arrived) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goBack();
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      if (arrived && !bubbleRef.current?.contains(event.target as Node)) nextRef.current?.focus();
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [arrived, goNext, goBack, onClose]);

  // Focus lands on Next each time the bubble appears. The browser can refuse while the bubble is only just becoming
  // visible (it happens on the quick reduced-motion path), so try again for a few frames until it sticks.
  useEffect(() => {
    if (!arrived) return;
    let frame = 0;
    let attempts = 0;
    const tryFocus = () => {
      nextRef.current?.focus();
      if (document.activeElement !== nextRef.current && attempts++ < 10) frame = requestAnimationFrame(tryFocus);
    };
    tryFocus();
    return () => cancelAnimationFrame(frame);
  }, [arrived, view.index]);

  // The page behind doesn't scroll while the tour is open, and focus goes back to where it was afterwards
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      if (before && document.contains(before)) before.focus();
    };
  }, []);

  // ---------- Drawing ----------
  const pose: AcePose = walking || edge ? "walk" : step.pose;
  const flip = walking || edge ? walkFlip : layout.ace.flip;
  const hole: Rect = view.rect ?? { left: vw / 2, top: vh / 2, width: 0, height: 0 };
  const glide = walking && !reduced; // the spotlight and Ace slide only while Ace is walking
  const tail = layout.bubble.tail;

  return (
    <div>
      {/* Catches clicks so the page behind can't be used mid-tour */}
      <div aria-hidden="true" className="fixed inset-0 z-[60]" />

      {/* The dimmed page with a rounded hole: the hole's huge shadow is the dimming */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-[60]"
        style={{
          left: hole.left,
          top: hole.top,
          width: hole.width,
          height: hole.height,
          borderRadius: HOLE_RADIUS,
          boxShadow: "0 0 0 9999px rgb(2 31 56 / 0.55)",
          transition: glide ? `left ${WALK_MS}ms ease-in-out, top ${WALK_MS}ms ease-in-out, width ${WALK_MS}ms ease-in-out, height ${WALK_MS}ms ease-in-out` : "none",
        }}
      />

      {/* Ace */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[61]"
        style={{
          width: size,
          height: size,
          transform: `translate(${acePos.x}px, ${acePos.y}px)`,
          opacity: aceVisible ? 1 : 0,
          transition: glide ? `transform ${WALK_MS}ms ease-in-out, opacity ${FADE_MS}ms` : `opacity ${FADE_MS}ms`,
        }}
      >
        <AceFigure pose={pose} size={size} flip={flip} once={pose === "celebrate"} />
      </div>

      {/* Speech bubble. Always in the page (so it can be measured) but hidden while Ace is walking. */}
      <div
        ref={bubbleRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className={`ace-bubble fixed z-[62] border bg-surface shadow-xl ${layout.sheet ? "inset-x-0 bottom-0 rounded-t-card px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5" : "rounded-card p-5"}`}
        style={{
          ...(layout.sheet ? {} : { left: layout.bubble.left, top: layout.bubble.top, width: layout.bubble.width }),
          visibility: arrived ? "visible" : "hidden",
          opacity: arrived ? 1 : 0,
          transition: `opacity ${FADE_MS}ms`,
        }}
      >
        {tail && (
          <span
            aria-hidden="true"
            className={`absolute size-3 rotate-45 bg-surface ${tail === "left" ? "-left-1.5 border-b border-l" : "-right-1.5 border-r border-t"}`}
            style={{ top: layout.bubble.tailOffset - 6 }}
          />
        )}

        <h2 id={titleId} className="type-h2">
          {step.title}
        </h2>
        <p id={bodyId} className="mt-1.5">
          {step.body(role)}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-xs text-muted" aria-label={`Step ${position} of ${total}`}>
            {position} of {total}
          </span>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {!isLast && (
              <button
                type="button"
                onClick={() => onClose("skip")}
                className="focus-ring min-h-11 rounded-button px-3 text-sm font-semibold text-muted underline-offset-2 hover:text-ink hover:underline"
              >
                Skip tour
              </button>
            )}
            {index > 0 && (
              <Button variant="secondary" className="min-h-11" onClick={goBack}>
                Back
              </Button>
            )}
            <button
              ref={nextRef}
              type="button"
              onClick={goNext}
              className="btn btn-primary focus-ring min-h-11"
            >
              {isLast ? "Start booking" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
