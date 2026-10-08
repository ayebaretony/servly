import { Cell, Pie, PieChart } from "recharts";
import { Card } from "@/components/ui/Card";
import { formatMoney } from "@/lib/money";
import type { CenterSettings } from "@/types/settings";
import type { RevenueReport } from "../revenue.metrics";

// Drawn at a fixed size: a measured (responsive) chart inside a flex-wrap row can end up 0px wide
const RING_SIZE = 160;

// Bookings carry no payment state, so the design's Paid / Pending / Refunded are Confirmed / Pending / Cancelled.
export function BookingStatusCard({ report, settings }: { report: RevenueReport; settings: CenterSettings }) {
  const slices = [
    { label: "Confirmed", ...report.confirmed, color: "var(--color-success)" },
    { label: "Pending", ...report.pending, color: "var(--color-warning)" },
    { label: "Cancelled", ...report.cancelled, color: "var(--color-danger)" },
  ];
  const totalCount = slices.reduce((sum, slice) => sum + slice.count, 0);

  return (
    <Card className="flex flex-col p-6">
      <h2 className="type-h2">Booking status</h2>
      <p className="mt-1 text-xs text-muted">Booking totals by status</p>

      <div className="my-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-6 py-6">
        {/* The legend beside the ring has the same numbers, so the ring is decorative */}
        <div aria-hidden="true" className="relative shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
          <PieChart width={RING_SIZE} height={RING_SIZE}>
            <Pie
              data={slices}
              dataKey="count"
              nameKey="label"
              innerRadius="72%"
              outerRadius="100%"
              stroke="var(--color-surface)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {slices.map((slice) => (
                <Cell key={slice.label} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
          <div className="absolute inset-0 grid place-content-center text-center">
            <p className="type-stat leading-none">{totalCount}</p>
            <p className="mt-1 text-xs text-muted">bookings</p>
          </div>
        </div>

        <ul className="space-y-3 text-sm">
          {slices.map((slice) => (
            <li key={slice.label} className="flex items-center gap-2 text-ink">
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-pill" style={{ backgroundColor: slice.color }} />
              <span>
                {slice.label} {slice.count} · {formatMoney(slice.totalMinor, settings.currency)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
