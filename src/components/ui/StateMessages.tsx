import type { ReactNode } from "react";
import { Button } from "./Button";

// The two non-happy states every data screen needs (AGENTS.md section 4): a clear error with a retry, and a friendly empty message.

export function ErrorMessage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-4 py-8 text-center">
      <p className="text-sm text-ink">{message}</p>
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

export function EmptyMessage({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-8 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {hint && <p className="text-sm text-muted">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
