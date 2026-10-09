import { Plus } from "lucide-react";
import { useState } from "react";
import { AceLoadingState } from "@/components/ui/AceLoadingState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/StateMessages";
import { useAuth } from "@/features/auth/useAuth";
import { useTodayBookings } from "@/features/dashboard/hooks/useTodayBookings";
import { useCenterSettings } from "@/features/settings/hooks/useCenterSettings";
import { todayInTimezone } from "@/lib/time";
import { useLoadingGate } from "@/lib/useLoadingGate";
import type { Court } from "@/types/court";
import type { CenterSettings } from "@/types/settings";
import { BlockTimeModal } from "@/features/calendar/components/BlockTimeModal";
import { ArchiveCourtModal } from "./components/ArchiveCourtModal";
import { CourtFormModal } from "./components/CourtFormModal";
import { CourtStats } from "./components/CourtStats";
import { CourtsTable, type StatusFilter } from "./components/CourtsTable";
import { QuickActions } from "./components/QuickActions";
import { TodayAvailability } from "./components/TodayAvailability";
import { useCourtList } from "./hooks/useCourtList";

// Settings come first because "today" depends on the center's timezone.
export function CourtsPage() {
  const auth = useAuth();
  const settings = useCenterSettings();
  const { courts, reload } = useCourtList();
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
    return gate.visible ? <AceLoadingState label="Loading courts…" /> : null;
  }

  return (
    <CourtsContent
      courts={courts.data}
      settings={settings.data}
      uid={auth.uid}
      canManage={auth.profile.role === "admin"}
      onChanged={reload}
    />
  );
}

type CourtsContentProps = {
  courts: Court[];
  settings: CenterSettings;
  uid: string;
  canManage: boolean;
  onChanged: () => void;
};

// Which pop-up is open: none, adding, editing a court, confirming an archive, or blocking time
type Dialog = { kind: "add" } | { kind: "block" } | { kind: "edit"; court: Court } | { kind: "archive"; court: Court } | null;

function CourtsContent({ courts, settings, uid, canManage, onChanged }: CourtsContentProps) {
  // Fixed when the page opens so the live listener stays on one day
  const [now] = useState(() => new Date());
  const today = todayInTimezone(settings.timezone, now);
  const todayBookings = useTodayBookings(today);

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [dialog, setDialog] = useState<Dialog>(null);
  const closeDialog = () => setDialog(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="type-h1">Manage your courts</h1>
          <p className="mt-1 text-sm text-muted">Manage availability and maintenance status for each court.</p>
        </div>
        {canManage && (
          <Button onClick={() => setDialog({ kind: "add" })}>
            <Plus aria-hidden="true" className="size-4" />
            Add court
          </Button>
        )}
      </div>

      <CourtStats courts={courts} />

      <CourtsTable
        courts={courts}
        filter={filter}
        onFilterChange={setFilter}
        todayBookings={todayBookings}
        canManage={canManage}
        onAdd={() => setDialog({ kind: "add" })}
        onEdit={(court) => setDialog({ kind: "edit", court })}
        onArchive={(court) => setDialog({ kind: "archive", court })}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <TodayAvailability today={today} courts={courts} todayBookings={todayBookings} settings={settings} />
        <QuickActions onBlockTime={canManage ? () => setDialog({ kind: "block" }) : undefined} />
      </div>

      {dialog?.kind === "add" && <CourtFormModal courts={courts} onClose={closeDialog} onSaved={onChanged} />}
      {dialog?.kind === "edit" && (
        <CourtFormModal court={dialog.court} courts={courts} onClose={closeDialog} onSaved={onChanged} />
      )}
      {dialog?.kind === "block" && (
        <BlockTimeModal courts={courts} settings={settings} uid={uid} onClose={closeDialog} onSaved={() => undefined} />
      )}
      {dialog?.kind === "archive" && <ArchiveCourtModal court={dialog.court} onClose={closeDialog} onArchived={onChanged} />}
    </div>
  );
}
