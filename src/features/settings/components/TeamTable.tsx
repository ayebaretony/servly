import { Check, Pause, Trash2, Undo2 } from "lucide-react";
import { ActionsMenu, type ActionItem } from "@/components/ui/ActionsMenu";
import { Card } from "@/components/ui/Card";
import { EmptyMessage } from "@/components/ui/StateMessages";
import { useToast } from "@/components/ui/useToast";
import type { ManagedUser } from "@/types/user";
import { UserAdminError, approveUser } from "../users.service";
import { formatAdded } from "../users.format";
import type { UserAction } from "./ConfirmUserActionModal";

type TeamTableProps = {
  team: ManagedUser[];
  currentUid: string;
  timezone: string;
  onAction: (action: UserAction, user: ManagedUser) => void;
};

// Everyone who has been approved at some point. Only staff can be suspended or removed: the admin can't lock
// themselves out, and the app never lets one admin act against another.
export function TeamTable({ team, currentUid, timezone, onAction }: TeamTableProps) {
  const { showToast } = useToast();

  async function reactivate(user: ManagedUser) {
    try {
      await approveUser(user.id);
      showToast(`${user.displayName} can sign in again.`);
    } catch (caught) {
      showToast(caught instanceof UserAdminError ? caught.message : "Something went wrong. Try again.", "error");
    }
  }

  function itemsFor(user: ManagedUser): ActionItem[] {
    return [
      user.active
        ? { label: "Suspend access", icon: Pause, onSelect: () => onAction("suspend", user) }
        : { label: "Reactivate", icon: Undo2, onSelect: () => void reactivate(user) },
      { label: "Remove user", icon: Trash2, tone: "danger", onSelect: () => onAction("remove", user) },
    ];
  }

  return (
    <Card>
      <div className="p-6 pb-5">
        <h2 className="type-h2">Team</h2>
        <p className="mt-1 text-xs text-muted">
          Staff can create, edit and cancel bookings. Only you can manage courts, settings and users.
        </p>
      </div>

      {team.length === 0 ? (
        <div className="border-t">
          <EmptyMessage title="No team members yet" hint="Approve a request above to add your first team member." />
        </div>
      ) : (
        // Tables scroll sideways on small screens
        <div className="overflow-x-auto border-t">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="table-head">
                <th scope="col" className="px-6 py-3 font-bold">
                  Person
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  Role
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  Access
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  Joined
                </th>
                <th scope="col" className="px-6 py-3 text-right font-bold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {team.map((user) => {
                const isYou = user.id === currentUid;
                return (
                  <tr key={user.id} className="border-t">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-ink">
                        {user.displayName}
                        {isYou && <span className="ml-2 text-xs font-medium text-muted">(you)</span>}
                      </p>
                      <p className="text-xs text-muted">{user.email}</p>
                    </td>
                    <td className="px-4 py-4 text-ink">{user.role === "admin" ? "Admin" : "Staff"}</td>
                    <td className="px-4 py-4">
                      {user.active ? (
                        <span className="badge badge-success">
                          <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
                          Active
                        </span>
                      ) : (
                        <span className="badge badge-warning">
                          <Pause aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
                          Suspended
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-muted">{user.createdAt ? formatAdded(user.createdAt, timezone) : "–"}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end">
                        {user.role === "staff" ? (
                          <ActionsMenu label={user.displayName} items={itemsFor(user)} />
                        ) : (
                          <span className="text-xs text-muted">–</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
