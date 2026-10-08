import type { ComponentPropsWithoutRef } from "react";
import { useLoadingGate } from "@/lib/useLoadingGate";
import { AceLoader } from "./AceLoader";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean; // saving or signing in: disables the button and shows Ace spinning inside it
};

const VARIANT_CLASS = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  danger: "btn-danger",
} as const;

// The look lives in theme/utilities.css (btn, btn-primary, btn-secondary); this just picks the right ones.
// Defaults to type="button" so a button inside a form never submits it by accident; pass type="submit" when it should.
export function Button({
  variant = "primary",
  type = "button",
  className = "",
  loading = false,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  // Disabled straight away, but Ace only turns up if the wait is noticeable. No minimum time: the button must be usable again as soon as it finishes.
  const { visible } = useLoadingGate(loading, { minVisibleMs: 0 });
  return (
    <button
      type={type}
      className={`btn ${VARIANT_CLASS[variant]} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {/* The button's own text says what is happening ("Creating…"), so Ace has no caption of his own */}
      {visible && <AceLoader variant="spin" size="sm" label="" />}
      {children}
    </button>
  );
}
