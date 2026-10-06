import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/StateMessages";
import { StatCard, StatCardSkeleton } from "@/components/ui/StatCard";
import { changeRatio, formatMoney, formatPercentChange } from "@/lib/money";
import { addDays } from "@/lib/time";
import type { AsyncData } from "@/lib/useAsyncData";
import type { Booking } from "@/types/booking";
import type { Court } from "@/types/court";
import type { CenterSettings } from "@/types/settings";
import { computeDayStats } from "../dashboard.metrics";
import { ChangeText } from "./ChangeText";

type StatCardsProps = {
  today: string;
  todayBookings: AsyncData<Booking[]>;
  history: AsyncData<Booking[]>;
  courts: Court[];
  settings: CenterSettings;
};

const ratioText = (ratio: number | null) => (ratio === null ? null : `${formatPercentChange(ratio)} vs last week`);

export function StatCards({ today, todayBookings, history, courts, settings }: StatCardsProps) {
  if (todayBookings.status === "loading") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((n) => (
          <StatCardSkeleton key={n} />
        ))}
      </div>
    );
  }
  if (todayBookings.status === "error") {
    return (
      <Card>
        <ErrorMessage message={todayBookings.message} onRetry={todayBookings.retry} />
      </Card>
    );
  }

  const stats = computeDayStats(todayBookings.data, courts, settings);

  // The comparison is the same weekday last week. If that history fails to load, the cards simply omit the change line.
  const lastWeekDate = addDays(today, -7);
  const lastWeek =
    history.status === "ready"
      ? computeDayStats(
          history.data.filter((b) => b.date === lastWeekDate),
          courts,
          settings,
        )
      : null;

  const bookingsChange = lastWeek ? changeRatio(stats.bookingCount, lastWeek.bookingCount) : null;
  const revenueChange = lastWeek ? changeRatio(stats.revenueMinor, lastWeek.revenueMinor) : null;
  // Utilization is already a percentage, so its change is shown in percentage points
  const utilizationPoints =
    lastWeek && lastWeek.occupiedSlots > 0 ? (stats.utilization - lastWeek.utilization) * 100 : null;
  const utilizationText =
    utilizationPoints === null
      ? null
      : `${utilizationPoints > 0 ? "+" : ""}${utilizationPoints.toFixed(1)} pts vs last week`;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Today's bookings"
        value={stats.bookingCount}
        footer={lastWeek && <ChangeText text={ratioText(bookingsChange)} positive={(bookingsChange ?? 0) >= 0} />}
      />
      <StatCard
        label="Today's revenue"
        value={formatMoney(stats.revenueMinor, settings.currency)}
        footer={lastWeek && <ChangeText text={ratioText(revenueChange)} positive={(revenueChange ?? 0) >= 0} />}
      />
      <StatCard
        label="Court utilization"
        value={`${Math.round(stats.utilization * 100)}%`}
        footer={lastWeek && <ChangeText text={utilizationText} positive={(utilizationPoints ?? 0) >= 0} />}
      />
      <StatCard
        label="Open slots today"
        value={stats.openSlots}
        footer={<span className="text-muted">Across {stats.courtCount} {stats.courtCount === 1 ? "court" : "courts"}</span>}
      />
    </div>
  );
}
