import { Eye, EyeOff } from "lucide-react";

// Show/hide button that sits inside a password field (Input's `trailing` slot)
export function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? "Hide password" : "Show password"}
      aria-pressed={shown}
      className="flex size-7 items-center justify-center rounded-chip text-muted transition-colors hover:text-ink"
    >
      {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );
}
