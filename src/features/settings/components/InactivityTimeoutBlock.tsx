import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorMessage } from "@/components/ui/StateMessages";
import { useToast } from "@/components/ui/useToast";
import { IDLE_TIMEOUT_OPTIONS, type SecuritySettings } from "@/types/settings";
import { useSecuritySettings } from "../hooks/useSecuritySettings";
import { SecuritySettingsError, saveSecuritySettings } from "../security.service";

const OPTION_LABEL: Record<number, string> = {
  15: "After 15 minutes",
  30: "After 30 minutes",
  60: "After 1 hour",
  120: "After 2 hours",
  0: "Never (not recommended)",
};

// Automatic sign-out for everyone who uses Servly: a screen left open on the front desk can't be used by a stranger.
export function InactivityTimeoutBlock() {
  const settings = useSecuritySettings();

  if (settings.status === "loading") {
    return (
      <div role="status" aria-label="Loading security settings" className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
    );
  }
  if (settings.status === "error") return <ErrorMessage message={settings.message} onRetry={settings.retry} />;
  return <InactivityForm saved={settings.data} />;
}

function InactivityForm({ saved }: { saved: SecuritySettings }) {
  const { showToast } = useToast();
  const [minutes, setMinutes] = useState(saved.idleTimeoutMinutes);
  const [savedMinutes, setSavedMinutes] = useState(saved.idleTimeoutMinutes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveSecuritySettings({ idleTimeoutMinutes: minutes });
      setSavedMinutes(minutes);
      showToast("Automatic sign-out saved.");
    } catch (caught) {
      setError(caught instanceof SecuritySettingsError ? caught.message : "Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full max-w-64">
          <Select label="Sign out when inactive" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))}>
            {IDLE_TIMEOUT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {OPTION_LABEL[option]}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" disabled={saving || minutes === savedMinutes}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted">
        Applies to everyone, including you. Screens that are already open pick up the change within a few minutes.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
