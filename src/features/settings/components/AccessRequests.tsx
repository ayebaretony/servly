import { Check, User, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyMessage } from "@/components/ui/StateMessages";
import { useToast } from "@/components/ui/useToast";
import type { ManagedUser } from "@/types/user";
import { UserAdminError, approveUser } from "../users.service";
import { formatAdded } from "../users.format";

type AccessRequestsProps = {
  requests: ManagedUser[];
  timezone: string;
  onDecline: (user: ManagedUser) => void;
};

// People who created a sign-in and are waiting to be let in (AGENTS.md section 9)
export function AccessRequests({ requests, timezone, onDecline }: AccessRequestsProps) {
  const { showToast } = useToast();
  // The person currently being approved, so only their button is disabled
  const [approvingId, setApprovingId] = useState<string | null>(null);

  async function approve(user: ManagedUser) {
    if (approvingId) return;
    setApprovingId(user.id);
    try {
      await approveUser(user.id);
      showToast(`${user.displayName} was approved and can now sign in.`);
    } catch (caught) {
      showToast(caught instanceof UserAdminError ? caught.message : "Something went wrong. Try again.", "error");
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <Card>
      <div className="p-6 pb-5">
        <div className="flex items-center gap-3">
          <h2 className="type-h2">Waiting for approval</h2>
          {requests.length > 0 && <span className="badge badge-warning">{requests.length}</span>}
        </div>
        <p className="mt-1 text-xs text-muted">
          Anyone can create a sign-in, but nobody gets in until you approve them. You will hear a soft pop and see a badge on
          the bell when someone new asks.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="border-t">
          <EmptyMessage title="No one is waiting" hint="New sign-up requests will appear here." />
        </div>
      ) : (
        <ul className="border-t">
          {requests.map((user) => (
            <li key={user.id} className="flex flex-wrap items-center gap-4 border-b px-6 py-4 last:border-b-0">
              <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-pill bg-sidebar text-primary">
                <User className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{user.displayName}</p>
                <p className="truncate text-xs text-muted">
                  {user.email}
                  {user.createdAt && ` · Asked ${formatAdded(user.createdAt, timezone)}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => onDecline(user)}
                  disabled={approvingId !== null}
                  aria-label={`Decline ${user.displayName}`}
                >
                  <X aria-hidden="true" className="size-4" />
                  Decline
                </Button>
                <Button onClick={() => void approve(user)} disabled={approvingId !== null} aria-label={`Approve ${user.displayName}`}>
                  <Check aria-hidden="true" className="size-4" />
                  {approvingId === user.id ? "Approving…" : "Approve"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
