import type { CSSProperties } from "react";
import { Card } from "@/components/ui/Card";
import { formatMoney } from "@/lib/money";
import { courtColorCss } from "@/theme/courtColors";
import type { CenterSettings } from "@/types/settings";
import type { RevenueReport } from "../revenue.metrics";

export function RevenueByCourt({ report, settings }: { report: RevenueReport; settings: CenterSettings }) {
  return (
    <Card className="flex flex-col p-6">
      <h2 className="type-h2">Revenue by court</h2>
      <p className="mt-1 text-xs text-muted">Contribution this month</p>

      {report.byCourt.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No courts yet.</p>
      ) : (
        <ul className="mt-5 space-y-5">
          {report.byCourt.map((court) => {
            const percent = Math.round(court.share * 100);
            return (
              <li key={court.courtId}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 text-ink">
                    <span className="court-dot" style={{ "--court-color": courtColorCss(court.color) } as CSSProperties} />
                    <span className="truncate">{court.name}</span>
                  </span>
                  <span className="shrink-0 text-ink">
                    <span className="font-semibold">{formatMoney(court.revenueMinor, settings.currency)}</span>
                    <span className="ml-2 text-xs text-muted">{percent}%</span>
                  </span>
                </div>
                {/* The bar repeats the figures beside it, so it stays out of the screen-reader tree */}
                <div aria-hidden="true" className="mt-2 h-2 overflow-hidden rounded-pill bg-sidebar">
                  <div className="h-full rounded-pill" style={{ width: `${percent}%`, backgroundColor: courtColorCss(court.color) }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-auto flex items-center justify-between border-t pt-4 text-sm">
        <span className="text-muted">Total</span>
        <span className="font-semibold text-ink">{formatMoney(report.totalMinor, settings.currency)}</span>
      </div>
    </Card>
  );
}
