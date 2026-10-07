import type { CSSProperties } from "react";

// Sets the --court-color variable that the .court-dot and .court-chip recipes read.
// `color` is a CSS colour such as "var(--color-court-1)", from courtColorCss().
export function courtVars(color: string): CSSProperties {
  // A CSS custom property isn't in React's CSSProperties type, hence the cast
  return { "--court-color": color } as CSSProperties;
}

// A booking chip or block: the coloured left border from .court-chip on a soft tint of the same court colour
export function courtTint(color: string): CSSProperties {
  return { ...courtVars(color), backgroundColor: `color-mix(in srgb, ${color} 12%, white)` };
}

// A maintenance block: the same coloured border, but hatched so it can't be mistaken for a booking
export function blockHatch(color: string): CSSProperties {
  return {
    ...courtVars(color),
    backgroundImage: `repeating-linear-gradient(135deg, color-mix(in srgb, ${color} 22%, white) 0 5px, white 5px 10px)`,
  };
}
