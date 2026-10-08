import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { formatMoney, formatRate } from "@/lib/money";
import { formatDuration, formatMonthDay } from "@/lib/time";
import type { CenterSettings } from "@/types/settings";
import type { RevenueReport } from "../revenue.metrics";

const COLUMNS = ["Date", "Customer", "Court", "Rate / hour", "Duration", "Amount", "Status"];

export function RecentRevenue({ report, settings }: { report: RevenueReport; settings: CenterSettings }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="type-h2">Recent revenue</h2>
        <Link to="/bookings" className="focus-ring text-sm font-semibold text-primary hover:underline">
          View all bookings
        </Link>
      </div>

      {report.recent.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No bookings have taken place this month yet.</p>
      ) : (
        // Tables scroll sideways on small screens
        <div className="mt-5 overflow-x-auto rounded-chip border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="table-head">
                {COLUMNS.map((name) => (
                  <th key={name} scope="col" className="px-4 py-3 font-bold">
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.recent.map((booking) => (
                <tr key={booking.id} className="border-t">
                  <td className="px-4 py-3.5 text-muted">{formatMonthDay(booking.date)}</td>
                  <td className="px-4 py-3.5 font-semibold text-ink">{booking.customerName}</td>
                  <td className="px-4 py-3.5 text-muted">{booking.courtName}</td>
                  <td className="px-4 py-3.5 text-muted">{formatRate(booking.hourlyRateMinor, settings.currency)}</td>
                  <td className="px-4 py-3.5 text-muted">{formatDuration(booking.durationMinutes)}</td>
                  <td className="px-4 py-3.5 text-ink">{formatMoney(booking.totalMinor, settings.currency)}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={booking.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-muted">Rates are calculated per hour. Partial hours are billed proportionally.</p>
    </Card>
  );
}
