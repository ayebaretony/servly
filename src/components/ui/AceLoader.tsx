import type { CSSProperties } from "react";
import { AceFigure } from "./AceFigure";

// Ace, the Servly mascot, as the app's loading animation. The drawing itself is AceFigure (shared with the welcome tour).

export type AceVariant = "bounce" | "spin";
export type AceSize = "sm" | "md" | "lg";

type AceLoaderProps = {
  variant?: AceVariant; // bounce = full body, for pages and sections; spin = head-only ball, for small inline spots
  size?: AceSize; // 32 / 96 / 160 px. Defaults to md, or sm for the spin variant.
  label?: string; // caption under Ace. Pass "" when the surrounding text already says what is happening (e.g. a button).
};

const PIXELS: Record<AceSize, number> = { sm: 32, md: 96, lg: 160 };

export function AceLoader({ variant = "bounce", size, label = "Loading…" }: AceLoaderProps) {
  const resolved = size ?? (variant === "spin" ? "sm" : "md");
  const pixels = PIXELS[resolved];
  const graphic = <AceFigure pose={variant} size={pixels} />;

  const className = `ace-loader ace-loader--${variant}`;
  const style = { "--ace-size": `${pixels}px` } as CSSProperties;

  // No caption means nothing to announce, so no status region either
  if (!label) {
    return (
      <span className={className} style={style}>
        {graphic}
      </span>
    );
  }

  return (
    <span role="status" aria-live="polite" className={className} style={style}>
      {graphic}
      {/* The smallest size has no room for text, but screen readers still get it */}
      <span className={resolved === "sm" ? "sr-only" : "ace-label"}>{label}</span>
    </span>
  );
}
