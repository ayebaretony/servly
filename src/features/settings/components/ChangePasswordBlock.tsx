import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/useToast";
import { canChangePassword, changePassword, friendlyPasswordChangeError } from "@/features/auth/auth.service";
import { MIN_PASSWORD_LENGTH } from "@/features/auth/validation";

type Errors = { current?: string; next?: string; confirm?: string };

function validate(current: string, next: string, confirm: string): Errors {
  const errors: Errors = {};
  if (!current) errors.current = "Enter your current password.";
  if (next.length < MIN_PASSWORD_LENGTH) errors.next = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  else if (next === current) errors.next = "Choose a password you haven't used here before.";
  if (confirm !== next) errors.confirm = "The two passwords don't match.";
  return errors;
}

export function ChangePasswordBlock() {
  const { showToast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Signed in with Google: the password belongs to the Google account, not to Servly
  if (!canChangePassword()) {
    return <p className="text-sm text-muted">You sign in with Google, so your password is managed in your Google account.</p>;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const found = validate(current, next, confirm);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      showToast("Your password was changed.");
    } catch (caught) {
      setFormError(friendlyPasswordChangeError(caught));
    } finally {
      setSaving(false);
    }
  }

  const type = show ? "text" : "password";

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="max-w-md space-y-4">
      <Input
        label="Current password"
        type={type}
        autoComplete="current-password"
        value={current}
        onChange={(event) => setCurrent(event.target.value)}
        error={errors.current}
      />
      <Input
        label="New password"
        type={type}
        autoComplete="new-password"
        value={next}
        onChange={(event) => setNext(event.target.value)}
        error={errors.next}
      />
      <Input
        label="Confirm new password"
        type={type}
        autoComplete="new-password"
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        error={errors.confirm}
      />
      <label className="flex items-center gap-2 text-xs text-ink">
        <input type="checkbox" checked={show} onChange={(event) => setShow(event.target.checked)} className="size-4 rounded-chip accent-primary" />
        Show passwords
      </label>
      {formError && (
        <p role="alert" className="rounded-button bg-danger-soft px-3 py-2 text-xs text-danger">
          {formError}
        </p>
      )}
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
