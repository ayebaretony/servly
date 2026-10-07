import { ChevronDown } from "lucide-react";
import { useId, type ComponentPropsWithoutRef } from "react";

type SelectProps = Omit<ComponentPropsWithoutRef<"select">, "id"> & {
  label: string;
  error?: string;
};

// Same label and inline-error pattern as Input, so form fields line up.
export function Select({ label, error, className = "", children, ...rest }: SelectProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`h-10 w-full appearance-none rounded-button border bg-surface pl-3 pr-9 text-sm text-ink transition-colors disabled:bg-sidebar disabled:text-muted ${
            error ? "border-danger" : "border-border"
          } ${className}`}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
