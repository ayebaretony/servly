import { Card } from "@/components/ui/Card";
import type { Court } from "@/types/court";
import { computeCourtStats } from "../courts.metrics";

// The four small number cards under the page title
export function CourtStats({ courts }: { courts: Court[] }) {
  const stats = computeCourtStats(courts);
  const items = [
    { label: "Total courts", value: String(stats.total) },
    { label: "Available now", value: String(stats.available) },
    { label: "In maintenance", value: String(stats.maintenance) },
  ];

  return (
    <dl className="grid gap-4 sm:grid-cols-3">
      {items.map(({ label, value }) => (
        <Card key={label} className="px-4 py-3.5">
          <dt className="text-xs text-muted">{label}</dt>
          <dd className="mt-1.5 font-heading text-xl font-bold text-ink">{value}</dd>
        </Card>
      ))}
    </dl>
  );
}

export function CourtStatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3" aria-hidden="true">
      {[0, 1, 2].map((n) => (
        <Card key={n} className="h-[74px]" />
      ))}
    </div>
  );
}
