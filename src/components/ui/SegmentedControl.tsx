type SegmentedControlProps<T extends string> = {
  label: string; // read out by screen readers, e.g. "Calendar view"
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

// A row of connected buttons where exactly one is chosen (e.g. Month / Week / Day).
// Each button reports whether it is the chosen one with aria-pressed, so it works with the keyboard and a screen reader.
export function SegmentedControl<T extends string>({ label, options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-button border bg-surface p-0.5">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`focus-ring h-8 rounded-[0.5rem] px-3.5 text-xs font-semibold transition-colors ${
              selected ? "bg-primary text-white" : "text-ink hover:bg-sidebar"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
