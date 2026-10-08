import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/Card";
import { formatMoney, formatPercentChange } from "@/lib/money";
import { formatMonthDay, formatMonthName, formatMonthYear } from "@/lib/time";
import type { CenterSettings } from "@/types/settings";
import type { RevenueReport } from "../revenue.metrics";

type RevenueOverTimeProps = { report: RevenueReport; previousMonth: string; settings: CenterSettings };

// Days labelled along the bottom: the 1st, then every fifth day, then the last day
function axisDates(dates: string[]): string[] {
  return dates.filter((_, index) => index === 0 || (index + 1) % 5 === 0 || index === dates.length - 1);
}

// Plain SVG attributes don't resolve CSS variables for these dots, so the colour goes in through style
function DailyDot({ cx, cy, index }: { cx?: number; cy?: number; index?: number }) {
  if (cx === undefined || cy === undefined) return <g key={index} />;
  return <circle key={index} cx={cx} cy={cy} r={3} style={{ fill: "var(--color-primary)" }} />;
}

export function RevenueOverTime({ report, previousMonth, settings }: RevenueOverTimeProps) {
  const change = report.totalChange;
  const dates = report.daily.map((day) => day.date);
  const summary = `Daily confirmed revenue for ${formatMonthYear(report.month)}. Total ${formatMoney(report.totalMinor, settings.currency)}.`;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div>
          <h2 className="type-h2">Revenue over time</h2>
          <p className="mt-1 text-xs text-muted">Daily booking revenue · {formatMonthYear(report.month)}</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-ink">
            <span aria-hidden="true" className="size-2 rounded-pill bg-primary" />
            Daily revenue
          </span>
          {change !== null && (
            <span className={`font-medium ${change >= 0 ? "text-success" : "text-danger"}`}>
              {formatPercentChange(change)} from {formatMonthName(previousMonth)}
            </span>
          )}
        </div>
      </div>

      <div role="img" aria-label={summary} className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={report.daily} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="date"
              ticks={axisDates(dates)}
              tickFormatter={formatMonthDay}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11, fill: "var(--color-muted)" }}
            />
            <YAxis
              width={72}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatMoney(Number(value), settings.currency)}
              tick={{ fontSize: 11, fill: "var(--color-muted)" }}
            />
            <Tooltip
              cursor={{ stroke: "var(--color-border-strong)" }}
              labelFormatter={(date) => formatMonthDay(String(date))}
              formatter={(value) => [formatMoney(Number(value), settings.currency), "Revenue"]}
              contentStyle={{ borderRadius: 10, borderColor: "var(--color-border)", fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="revenueMinor"
              stroke="var(--color-primary)"
              strokeWidth={2}
              fill="var(--color-primary)"
              fillOpacity={0.12}
              dot={DailyDot}
              activeDot={{ r: 5 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
