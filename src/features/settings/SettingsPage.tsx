import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorMessage } from "@/components/ui/StateMessages";
import { useAuth } from "@/features/auth/useAuth";
import type { ManagedUser } from "@/types/user";
import { AccessRequests } from "./components/AccessRequests";
import { ConfirmUserActionModal, type UserAction } from "./components/ConfirmUserActionModal";
import { SecuritySection } from "./components/SecuritySection";
import { TeamTable } from "./components/TeamTable";
import { useCenterSettings } from "./hooks/useCenterSettings";
import { splitUsers } from "./users.logic";
import { useUsers } from "./useUsers";

// Admin only (the route is guarded). Who may use Servly, plus security. Center details, booking preferences and
// customer self-booking are deliberately not here.
export function SettingsPage() {
  const auth = useAuth();
  const users = useUsers();
  const settings = useCenterSettings();
  if (auth.status !== "active") return null;

  const failed = users.status === "error" ? users : settings.status === "error" ? settings : null;
  if (failed) {
    return (
      <Card>
        <ErrorMessage
          message={settings.status === "error" ? settings.message : "We couldn't load your team."}
          onRetry={() => {
            if (users.status === "error") users.retry();
            if (settings.status === "error") settings.retry();
          }}
        />
      </Card>
    );
  }
  if (users.status !== "ready" || settings.status !== "ready") return <SettingsSkeleton />;

  return <SettingsContent users={users.users} uid={auth.uid} timezone={settings.data.timezone} />;
}

type Dialog = { action: UserAction; user: ManagedUser } | null;

function SettingsContent({ users, uid, timezone }: { users: ManagedUser[]; uid: string; timezone: string }) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const { requests, team } = splitUsers(users);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="type-h1">Settings</h1>
        <p className="mt-1 text-sm text-muted">Choose who can use Servly and keep your account secure.</p>
      </div>

      <AccessRequests requests={requests} timezone={timezone} onDecline={(user) => setDialog({ action: "decline", user })} />
      <TeamTable team={team} currentUid={uid} timezone={timezone} onAction={(action, user) => setDialog({ action, user })} />
      <SecuritySection />

      {dialog && <ConfirmUserActionModal action={dialog.action} user={dialog.user} onClose={() => setDialog(null)} />}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading settings">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Card className="h-40" />
      <Card className="h-64" />
      <Card className="h-72" />
    </div>
  );
}
