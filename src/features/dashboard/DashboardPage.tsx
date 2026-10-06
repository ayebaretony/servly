import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorMessage } from "@/components/ui/StateMessages";
import { useAuth } from "@/features/auth/useAuth";
import { useCourts } from "@/features/courts/hooks/useCourts";
import { useCenterSettings } from "@/features/settings/hooks/useCenterSettings";
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
  if (settings.status !== "ready" || courts.status !== "ready") return <DashboardSkeleton />;

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

      <StatCards today={today} todayBookings={todayBookings} history={history} courts={courts} settings={settings} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <TodayGlance today={today} todayBookings={todayBookings} courts={courts} settings={settings} />
        <RevenueCard today={today} history={history} settings={settings} />
      </div>

      <RecentBookings recent={recent} settings={settings} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading dashboard">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((n) => (
          <Card key={n} className="h-[118px]" />
        ))}
      </div>
      <Card className="h-80" />
    </div>
  );
}
