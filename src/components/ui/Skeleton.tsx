// Grey pulsing block shown while data loads. Decorative, so hidden from screen readers.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-chip bg-border ${className}`.trim()} />;
}
