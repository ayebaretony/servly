import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "./BrandMark";
import { signOutUser } from "./auth.service";
import { useAuth } from "./useAuth";

function CenteredCard({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-page px-4">
      <BrandMark />
      <div className="card w-full max-w-md p-8 text-center">{children}</div>
    </main>
  );
}

// Shown while Firebase works out who is signed in. A skeleton card, so the page doesn't jump when it loads.
export function LoadingScreen() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-page px-4"
      role="status"
      aria-label="Loading"
    >
      <BrandMark />
      <div className="card w-full max-w-md animate-pulse space-y-3 p-8" aria-hidden="true">
        <div className="mx-auto h-5 w-2/3 rounded-chip bg-border" />
        <div className="mx-auto h-4 w-1/2 rounded-chip bg-border" />
      </div>
    </main>
  );
}

// Signed in, but the profile couldn't be loaded
export function ProfileErrorScreen({ message }: { message: string }) {
  const { refresh } = useAuth();
  return (
    <CenteredCard>
      <h1 className="text-xl">Something went wrong</h1>
      <p role="alert" className="mt-2 text-sm text-muted">
        {message}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={refresh}>Try again</Button>
        <Button variant="secondary" onClick={() => void signOutUser()}>
          Sign out
        </Button>
      </div>
    </CenteredCard>
  );
}

// Anyone can create a sign-in, but only approved accounts get into the app (AGENTS.md section 9)
export function ApprovalPendingScreen({ email }: { email: string }) {
  const { refresh } = useAuth();
  return (
    <CenteredCard>
      <h1 className="text-xl">Your account is waiting for approval</h1>
      <p className="mt-2 text-sm text-muted">
        You&apos;re signed in{email ? ` as ${email}` : ""}, but an administrator needs to approve your account before you
        can use Servly. Ask them to approve you, then check again.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={refresh}>Check again</Button>
        <Button variant="secondary" onClick={() => void signOutUser()}>
          Sign out
        </Button>
      </div>
    </CenteredCard>
  );
}

// Shown instead of the app when .env.local hasn't been filled in yet
export function ConfigMissingScreen({ missing }: { missing: string[] }) {
  return (
    <CenteredCard>
      <h1 className="text-xl">Firebase isn&apos;t connected yet</h1>
      <p className="mt-2 text-sm text-muted">
        Copy <strong>.env.example</strong> to <strong>.env.local</strong>, fill in these values from the Firebase console
        (or switch on practice mode), then restart <strong>npm run dev</strong>.
      </p>
      <ul className="mt-4 space-y-1 text-left text-xs text-ink">
        {missing.map((name) => (
          <li key={name} className="rounded-chip bg-sidebar px-3 py-1.5 font-mono">
            {name}
          </li>
        ))}
      </ul>
    </CenteredCard>
  );
}
