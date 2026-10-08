import type { Rect } from "./tour.layout";

// Small helpers that talk to the page: find the element a step points at, bring it on screen, measure it.

const PADDING = 8; // breathing room around the spotlight hole
// Space the sticky top bar takes, and (on phones) what the bottom-sheet bubble and Ace need
const TOP_CLEARANCE = 72;
const PHONE_BOTTOM_CLEARANCE = 320;

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
export const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// An element counts as "on screen" if it exists and has a size (hidden by a media query = not there)
function find(name: string): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${name}"]`);
  if (!el || el.getClientRects().length === 0) return null;
  const box = el.getBoundingClientRect();
  return box.width > 0 && box.height > 0 ? el : null;
}

// Pages download and load their data before the target renders, so keep looking for a while. null = give up.
export async function waitForTarget(name: string, timeoutMs: number, cancelled: () => boolean): Promise<HTMLElement | null> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (cancelled()) return null;
    const el = find(name);
    if (el) return el;
    await sleep(100);
  }
  return null;
}

// Scrolls the page (instantly, so Ace's walk isn't chasing a moving target) until the element is clear of the top bar
// and, on phones, of the bottom sheet.
export function ensureVisible(el: HTMLElement, vw: number, vh: number) {
  el.scrollIntoView({ block: "nearest", inline: "nearest" }); // also handles a table scrolled sideways
  if (el.closest("header")) return; // the sticky top bar never moves

  const box = el.getBoundingClientRect();
  const bottomLimit = vh - (vw < 640 ? PHONE_BOTTOM_CLEARANCE : 16);
  const room = bottomLimit - TOP_CLEARANCE;
  let wantedTop = box.top;
  if (box.height > room) wantedTop = TOP_CLEARANCE;
  else if (box.top < TOP_CLEARANCE || box.bottom > bottomLimit) wantedTop = TOP_CLEARANCE + (room - box.height) / 2;
  if (wantedTop !== box.top) window.scrollBy({ top: box.top - wantedTop, behavior: "instant" });
}

// The target's rectangle on screen, grown by the spotlight padding. null if it isn't there right now.
export function measureTarget(name: string): Rect | null {
  const el = find(name);
  if (!el) return null;
  const box = el.getBoundingClientRect();
  return { left: box.left - PADDING, top: box.top - PADDING, width: box.width + PADDING * 2, height: box.height + PADDING * 2 };
}

export function sameRect(a: Rect | null, b: Rect | null) {
  if (!a || !b) return a === b;
  return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}
