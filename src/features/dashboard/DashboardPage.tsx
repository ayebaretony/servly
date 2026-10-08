import { useState } from "react";
import { AceLoadingState } from "@/components/ui/AceLoadingState";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/StateMessages";
import { useAuth } from "@/features/auth/useAuth";
import { useCourts } from "@/features/courts/hooks/useCourts";
import { useCenterSettings } from "@/features/settings/hooks/useCenterSettings";
import { useLoadingGate } from "@/lib/useLoadingGate";
import { formatLongDate, hourInTimezone, todayInTimezone } from "@/lib/time";
import type { Court } from "@/types/court";
import type { CenterSettings } from "@/types/settings";
import { RecentBookings } from "./components/RecentBookings";
import { RevenueCard } from "./components/RevenueCard";
import { StatCards } from "./components/StatCards";
import { TodayGlance } from "./components/TodayGlance";
import { useBookingHistory, useRecentBookings } from "./hooks/useBookingHistory";
import { useTodayBookings } from "./hooks/useTodayBookings";

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Settings and courts come first because "today" depends on the center's timezone and utilization on its courts.
export function DashboardPage() {
  const auth = useAuth();
  const settings = useCenterSettings();
  const courts = useCourts();
  const gate = useLoadingGate(settings.status === "loading" || courts.status === "loading");
  if (auth.status !== "active") return null;

  const failed = settings.status === "error" ? settings : courts.status === "error" ? courts : null;
  if (failed) {
    return (
      <Card>
        <ErrorMessage
          message={failed.message}
          onRetry={() => {
            if (settings.status === "error") settings.retry();
            if (courts.status === "error") courts.retry();
          }}
        />
      </Card>
    );
  }
  // Blank for the first moment, then Ace; the page is held back until he has been seen long enough
  if (settings.status !== "ready" || courts.status !== "ready" || gate.busy) {
    return gate.visible ? <AceLoadingState label="Loading your dashboard…" /> : null;
  }

  return <DashboardContent firstName={auth.profile.displayName.split(" ")[0]} settings={settings.data} courts={courts.data} />;
}

function DashboardContent({ firstName, settings, courts }: { firstName: string; settings: CenterSettings; courts: Court[] }) {
  // Fixed when the page opens so the live listener and the queries stay on one day
  const [now] = useState(() => new Date());
  const today = todayInTimezone(settings.timezone, now);

  const todayBookings = useTodayBookings(today);
  const history = useBookingHistory(today);
  const recent = useRecentBookings();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted">{formatLongDate(today)}</p>
        <h1 className="type-h1 mt-1">
          {greetingFor(hourInTimezone(settings.timezone, now))}, {firstName}
        </h1>
      </div>

      <div data-tour="dashboard-stats">
        <StatCards today={today} todayBookings={todayBookings} history={history} courts={courts} settings={settings} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <TodayGlance today={today} todayBookings={todayBookings} courts={courts} settings={settings} />
        <RevenueCard today={today} history={history} settings={settings} />
      </div>

      <RecentBookings recent={recent} settings={settings} />
    </div>
  );
}
