import { useId, type ComponentPropsWithoutRef } from "react";

type TextareaProps = Omit<ComponentPropsWithoutRef<"textarea">, "id"> & {
  label: string;
  error?: string;
};

// Same label and inline-error pattern as Input.
export function Textarea({ label, error, className = "", ...rest }: TextareaProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-ink">
        {label}
      </label>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full resize-none rounded-button border bg-surface px-3 py-2 text-sm text-ink transition-colors placeholder:text-muted ${
          error ? "border-danger" : "border-border"
        } ${className}`}
        {...rest}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
