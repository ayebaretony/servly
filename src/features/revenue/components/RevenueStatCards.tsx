import { Banknote, CircleCheck, Clock, TrendingUp, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { StatCardSkeleton } from "@/components/ui/StatCard";
import { ChangeText } from "@/features/dashboard/components/ChangeText";
import { formatMoney, formatPercentChange } from "@/lib/money";
import { formatMonthName } from "@/lib/time";
import type { CenterSettings } from "@/types/settings";
import type { RevenueReport } from "../revenue.metrics";

function StatTile({ label, icon: Icon, value, footer }: { label: string; icon: LucideIcon; value: string; footer: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-muted">{label}</p>
        <span className="grid size-8 shrink-0 place-items-center rounded-button bg-sidebar text-primary">
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <p className="type-stat mt-2">{value}</p>
      <div className="mt-2 min-h-5 text-xs">{footer}</div>
    </Card>
  );
}

export function RevenueStatCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((n) => (
        <StatCardSkeleton key={n} />
      ))}
    </div>
  );
}

type RevenueStatCardsProps = { report: RevenueReport; previousMonth: string; settings: CenterSettings };

export function RevenueStatCards({ report, previousMonth, settings }: RevenueStatCardsProps) {
  const previousName = formatMonthName(previousMonth);
  const vsPrevious = (ratio: number | null) =>
    ratio === null ? (
      <ChangeText text={null} positive />
    ) : (
      <ChangeText text={`${formatPercentChange(ratio)} vs ${previousName}`} positive={ratio >= 0} />
    );

  const { pending } = report;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        label="Total revenue"
        icon={Banknote}
        value={formatMoney(report.totalMinor, settings.currency)}
        footer={vsPrevious(report.totalChange)}
      />
      <StatTile label="Confirmed bookings" icon={CircleCheck} value={String(report.confirmedCount)} footer={vsPrevious(report.countChange)} />
      <StatTile
        label="Average booking value"
        icon={TrendingUp}
        value={report.averageMinor === null ? "—" : formatMoney(report.averageMinor, settings.currency)}
        footer={
          <span className="text-muted">
            Across {report.courtCount} {report.courtCount === 1 ? "court" : "courts"}
          </span>
        }
      />
      <StatTile
        label="Pending revenue"
        icon={Clock}
        value={formatMoney(pending.totalMinor, settings.currency)}
        footer={
          <span className={pending.count > 0 ? "font-medium text-warning-ink" : "text-muted"}>
            {pending.count} pending {pending.count === 1 ? "booking" : "bookings"}
          </span>
        }
      />
    </div>
  );
}
