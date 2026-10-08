import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/Card";
import { formatMoney } from "@/lib/money";
import type { CenterSettings } from "@/types/settings";
import type { RevenueReport, WeekRevenue } from "../revenue.metrics";

type TickProps = { x?: number | string; y?: number | string; payload?: { value: string | number } };

// Week name, then its revenue and booking count, as in the design
function WeekTick({ x = 0, y = 0, payload, weeks, currency }: TickProps & { weeks: Map<string, WeekRevenue & { label: string }>; currency: string }) {
  const week = payload ? weeks.get(String(payload.value)) : undefined;
  return (
    <text x={x} y={Number(y) + 4} textAnchor="middle" fontSize={11} fill="var(--color-muted)">
      <tspan x={x} dy="0.8em">{payload?.value}</tspan>
      {week && (
        <tspan x={x} dy="1.3em" fontWeight={600} fill="var(--color-ink)">
          {formatMoney(week.revenueMinor, currency)} / {week.bookingCount}
        </tspan>
      )}
    </text>
  );
}

// Revenue and booking counts are different units, so each gets its own (hidden) scale and the bars compare week to week.
export function WeeklyPerformance({ report, settings }: { report: RevenueReport; settings: CenterSettings }) {
  const data = report.weeks.map((week) => ({ ...week, label: `Week ${week.week}` }));
  const byLabel = new Map(data.map((week) => [week.label, week]));
  const summary = data
    .map((week) => `${week.label}: ${formatMoney(week.revenueMinor, settings.currency)}, ${week.bookingCount} bookings`)
    .join(". ");

  return (
    <Card className="flex flex-col p-6">
      <h2 className="type-h2">Weekly performance</h2>
      <p className="mt-1 text-xs text-muted">Revenue and bookings by week</p>

      <div role="img" aria-label={`Weekly performance. ${summary}`} className="mt-4 min-h-60 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }} barGap={4} barCategoryGap="25%">
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--color-border)" }} tick={(props: TickProps) => <WeekTick {...props} weeks={byLabel} currency={settings.currency} />} interval={0} height={48} />
            <YAxis yAxisId="revenue" hide />
            <YAxis yAxisId="bookings" orientation="right" hide />
            <Tooltip
              cursor={{ fill: "var(--color-sidebar)" }}
              formatter={(value, name) => [
                name === "Revenue" ? formatMoney(Number(value), settings.currency) : String(value),
                String(name),
              ]}
              contentStyle={{ borderRadius: 10, borderColor: "var(--color-border)", fontSize: 12 }}
            />
            <Bar yAxisId="revenue" dataKey="revenueMinor" name="Revenue" fill="var(--color-primary)" radius={[2, 2, 0, 0]} isAnimationActive={false} />
            <Bar
              yAxisId="bookings"
              dataKey="bookingCount"
              name="Bookings"
              fill="var(--color-navy-100)"
              stroke="var(--color-navy-500)"
              radius={[2, 2, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-pill bg-primary" />
            Revenue
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-pill border border-focus bg-navy-100" />
            Bookings
          </span>
        </div>
        {report.bestWeek && (
          <span>
            Best week: Week {report.bestWeek.week} · {formatMoney(report.bestWeek.revenueMinor, settings.currency)} revenue
          </span>
        )}
      </div>
    </Card>
  );
}
