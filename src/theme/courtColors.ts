// Fixed court palette. A court document stores one of these keys in its `color` field (AGENTS.md section 7).
// The actual colours live in colors.css, so a brand change never touches TypeScript.
export const COURT_COLOR_KEYS = [
  "court-1",
  "court-2",
  "court-3",
  "court-4",
  "court-5",
  "court-6",
  "court-7",
  "court-8",
  "court-9",
  "court-10",
] as const;

export type CourtColorKey = (typeof COURT_COLOR_KEYS)[number];

export function isCourtColorKey(value: string): value is CourtColorKey {
  return (COURT_COLOR_KEYS as readonly string[]).includes(value);
}

// For inline styles, e.g. style={{ backgroundColor: courtColorVar(court.color) }}
export function courtColorVar(key: CourtColorKey): string {
  return `var(--color-${key})`;
}

// New courts take the first palette colour that no existing court uses.
// Only when every colour is taken does one repeat: the least-used one, so repeats stay as rare as possible.
export function nextCourtColor(usedKeys: readonly string[]): CourtColorKey {
  const uses = (key: CourtColorKey) => usedKeys.filter((used) => used === key).length;
  return COURT_COLOR_KEYS.reduce((best, key) => (uses(key) < uses(best) ? key : best));
}

// Same as courtColorVar, but safe for a stored value we don't recognise: falls back to a neutral grey
export function courtColorCss(key: string): string {
  return isCourtColorKey(key) ? courtColorVar(key) : "var(--color-border-strong)";
}
