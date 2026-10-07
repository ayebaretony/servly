import type { ComponentPropsWithoutRef } from "react";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: "primary" | "secondary" | "danger";
};

const VARIANT_CLASS = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  danger: "btn-danger",
} as const;

// The look lives in theme/utilities.css (btn, btn-primary, btn-secondary); this just picks the right ones.
// Defaults to type="button" so a button inside a form never submits it by accident; pass type="submit" when it should.
export function Button({ variant = "primary", type = "button", className = "", ...rest }: ButtonProps) {
  return <button type={type} className={`btn ${VARIANT_CLASS[variant]} ${className}`.trim()} {...rest} />;
}
