import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react";

type InputProps = Omit<ComponentPropsWithoutRef<"input">, "id"> & {
  label: string;
  error?: string;
  // Small control shown inside the right edge of the field, e.g. the show/hide password button
  trailing?: ReactNode;
};

// Every input has a visible label and an inline error, so forms stay accessible by default.
export function Input({ label, error, trailing, className = "", ...rest }: InputProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`h-10 w-full rounded-button border bg-surface px-3 text-sm text-ink transition-colors placeholder:text-muted ${
            trailing ? "pr-10" : ""
          } ${error ? "border-danger" : "border-border"} ${className}`}
          {...rest}
        />
        {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">{trailing}</div>}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
