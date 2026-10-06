import type { ReactNode } from "react";
import { Card } from "./Card";
import { Skeleton } from "./Skeleton";

type StatCardProps = {
  label: string;
  value: ReactNode;
  // Line under the number: the change vs last week, or a note such as "Across 4 courts"
  footer?: ReactNode;
};

export function StatCard({ label, value, footer }: StatCardProps) {
  return (
    <Card className="p-5">
      <p className="text-xs text-muted">{label}</p>
      <p className="type-stat mt-2">{value}</p>
      <div className="mt-2 min-h-5 text-xs">{footer}</div>
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="p-5" role="status" aria-label="Loading">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-20" />
      <Skeleton className="mt-3 h-4 w-28" />
    </Card>
  );
}
