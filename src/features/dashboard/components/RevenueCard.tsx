import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Card } from "@/components/ui/Card";
import { EmptyMessage, ErrorMessage } from "@/components/ui/StateMessages";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatMoney, formatPercentChange } from "@/lib/money";
import { addDays, formatMonthName, monthStart } from "@/lib/time";
import type { AsyncData } from "@/lib/useAsyncData";
import type { Booking } from "@/types/booking";
import type { CenterSettings } from "@/types/settings";
import { computeMonthRevenue } from "../dashboard.metrics";

type RevenueCardProps = {
  today: string;
  history: AsyncData<Booking[]>;
  settings: CenterSettings;
};

export function RevenueCard({ today, history, settings }: RevenueCardProps) {
  return (
    <Card className="flex flex-col p-6">
      <h2 className="type-h2">Revenue this month</h2>
      <RevenueBody today={today} history={history} settings={settings} />
    </Card>
  );
}

function RevenueBody({ today, history, settings }: RevenueCardProps) {
  if (history.status === "loading") {
    return (
      <div role="status" aria-label="Loading revenue" className="mt-4 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (history.status === "error") {
    return <ErrorMessage message={history.message} onRetry={history.retry} />;
  }

  const revenue = computeMonthRevenue(history.data, today);
  const previousMonthName = formatMonthName(addDays(monthStart(today), -1));
  const change = revenue.changeVsPreviousMonth;
  const chartSummary = revenue.weeks
    .map((week) => `${week.label}: ${formatMoney(week.revenueMinor, settings.currency)}`)
    .join(", ");

  return (
    <>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="type-stat">{formatMoney(revenue.totalMinor, settings.currency)}</p>
        {change !== null && (
          <p className={`text-xs font-medium ${change >= 0 ? "text-success" : "text-danger"}`}>
            {formatPercentChange(change)} from {previousMonthName}
          </p>
        )}
      </div>

      {revenue.totalMinor === 0 ? (
        <EmptyMessage title="No confirmed bookings this month yet" hint="Revenue appears here once bookings are confirmed." />
      ) : (
        <div role="img" aria-label={`Revenue by week. ${chartSummary}`} className="mt-4 min-h-44 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenue.weeks} margin={{ top: 4, right: 8, bottom: 0, left: 8 }} barCategoryGap="12%">
              <XAxis
                dataKey="label"
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--color-muted)" }}
                axisLine={{ stroke: "var(--color-border)" }}
              />
              <Tooltip
                cursor={{ fill: "var(--color-sidebar)" }}
                formatter={(value) => [formatMoney(Number(value), settings.currency), "Revenue"]}
                contentStyle={{ borderRadius: 10, borderColor: "var(--color-border)", fontSize: 12 }}
              />
              <Bar dataKey="revenueMinor" fill="var(--color-primary)" radius={[2, 2, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="mt-auto flex items-center gap-2 pt-4 text-xs text-muted">
        Average booking value
        <span className="text-sm font-semibold text-ink">
          {revenue.averageBookingMinor === null ? "—" : formatMoney(revenue.averageBookingMinor, settings.currency)}
        </span>
      </p>
    </>
  );
}
