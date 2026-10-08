import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/useToast";
import type { ManagedUser } from "@/types/user";
import { UserAdminError, removeUser, suspendUser } from "../users.service";

export type UserAction = "decline" | "suspend" | "remove";

type ConfirmUserActionModalProps = {
  action: UserAction;
  user: ManagedUser;
  onClose: () => void;
};

// Confirmation before access is taken away (AGENTS.md section 4: destructive actions ask first).
// The list on screen is live, so there is nothing to reload afterwards.
const COPY: Record<UserAction, { title: (name: string) => string; body: (name: string) => string; button: string; busy: string; done: (name: string) => string }> = {
  decline: {
    title: (name) => `Decline ${name}'s request?`,
    body: (name) =>
      `${name} will not get access. If they sign in again they will show up here as a new request.`,
    button: "Decline request",
    busy: "Declining…",
    done: (name) => `${name}'s request was declined.`,
  },
  suspend: {
    title: (name) => `Suspend ${name}?`,
    body: (name) =>
      `${name} will be locked out of Servly within a few minutes. Nothing is deleted, and you can reactivate them at any time.`,
    button: "Suspend access",
    busy: "Suspending…",
    done: (name) => `${name} was suspended.`,
  },
  remove: {
    title: (name) => `Remove ${name}?`,
    body: (name) =>
      `${name} will lose access to Servly within a few minutes. Bookings they created stay in your records. ` +
      `Their sign-in itself is not deleted, so if they sign in again they will appear as a new request that needs your approval.`,
    button: "Remove user",
    busy: "Removing…",
    done: (name) => `${name} was removed.`,
  },
};

export function ConfirmUserActionModal({ action, user, onClose }: ConfirmUserActionModalProps) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[action];

  async function confirm() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      if (action === "suspend") await suspendUser(user);
      else await removeUser(user.id);
      showToast(copy.done(user.displayName));
      onClose();
    } catch (caught) {
      setError(caught instanceof UserAdminError ? caught.message : "Something went wrong. Try again.");
      setSaving(false);
    }
  }

  return (
    <Modal title={copy.title(user.displayName)} onClose={onClose}>
      <ModalBody>
        <p className="text-sm text-ink">{copy.body(user.displayName)}</p>
        <p className="mt-3 text-xs text-muted">{user.email}</p>
      </ModalBody>
      <ModalFooter>
        {error && (
          <p role="alert" className="mr-auto text-xs text-danger">
            {error}
          </p>
        )}
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="danger" onClick={() => void confirm()} loading={saving}>
          {saving ? copy.busy : copy.button}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
