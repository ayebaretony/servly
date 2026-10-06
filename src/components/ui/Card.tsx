import type { ComponentPropsWithoutRef } from "react";

// White card with a border and a barely-there shadow (look defined in theme/utilities.css)
export function Card({ className = "", ...rest }: ComponentPropsWithoutRef<"div">) {
  return <div className={`card ${className}`.trim()} {...rest} />;
}
