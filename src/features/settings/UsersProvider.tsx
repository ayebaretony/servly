import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useToast } from "@/components/ui/useToast";
import { playPop, unlockPopSound } from "@/lib/popSound";
import type { ManagedUser } from "@/types/user";
import { UsersContext, type UsersState } from "./UsersContext";
import { subscribeToUsers } from "./users.service";
import { isAccessRequest } from "./users.logic";

type Result = { attempt: number; users: ManagedUser[] } | { attempt: number; failed: true };

// Keeps one live list of users for the whole app, for the admin only, and announces new sign-up requests with a pop
// sound and a message. Lives in the app shell so it works on every page, not just Settings.
export function UsersProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const { showToast } = useToast();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!enabled) return;
    return subscribeToUsers(
      (users, appeared) => {
        setResult({ attempt, users });
        const requests = appeared.filter(isAccessRequest);
        if (requests.length === 0) return;
        playPop();
        showToast(
          requests.length === 1
            ? `${requests[0].displayName} is asking for access.`
            : `${requests.length} people are asking for access.`,
        );
      },
      () => setResult({ attempt, failed: true }),
    );
  }, [enabled, attempt, showToast]);

  // Browsers only allow sound after the person has used the page, so unlock it on the first click or key press
  useEffect(() => {
    if (!enabled) return;
    const events = ["pointerdown", "keydown"] as const;
    const unlock = () => {
      unlockPopSound();
      events.forEach((name) => window.removeEventListener(name, unlock));
    };
    events.forEach((name) => window.addEventListener(name, unlock));
    return () => events.forEach((name) => window.removeEventListener(name, unlock));
  }, [enabled]);

  const state = useMemo<UsersState>(() => {
    if (!enabled) return { status: "off" };
    if (!result || result.attempt !== attempt) return { status: "loading" };
    if ("failed" in result) return { status: "error", retry: () => setAttempt((n) => n + 1) };
    return { status: "ready", users: result.users };
  }, [enabled, result, attempt]);

  return <UsersContext.Provider value={state}>{children}</UsersContext.Provider>;
}
