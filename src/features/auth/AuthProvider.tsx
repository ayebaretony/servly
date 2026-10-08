import { useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { UserProfile } from "@/types/user";
import { AuthContext, type AuthContextValue, type AuthState } from "./AuthContext";
import { fetchCourts } from "@/features/courts/courts.service";
import { fetchCenterSettings } from "@/features/settings/settings.service";
import { loadProfile } from "./auth.service";

// The answer to "is this person approved?" for one specific sign-in (`user`) and one check (`attempt`)
type ProfileCheck = { user: User; attempt: number; profile: UserProfile | null } | { user: User; attempt: number; failed: true };

export function AuthProvider({ children }: { children: ReactNode }) {
  // undefined = Firebase hasn't told us yet; null = nobody is signed in
  const [firebaseUser, setFirebaseUser] = useState<User | null | undefined>(undefined);
  const [check, setCheck] = useState<ProfileCheck | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => onAuthStateChanged(auth, setFirebaseUser), []);

  useEffect(() => {
    if (!firebaseUser) return;

    // Start loading the courts and settings now, alongside the approval check, instead of after it. Every page needs
    // them, and they are cached, so the page finds them ready. If the person turns out not to be approved the read
    // is refused and nothing is cached; the error is ignored here and shown by the page if it is ever needed.
    void fetchCenterSettings().catch(() => undefined);
    void fetchCourts().catch(() => undefined);

    // Ignore the answer if the user signed out or a newer check started while we were waiting
    let cancelled = false;
    loadProfile(firebaseUser)
      .then((profile) => !cancelled && setCheck({ user: firebaseUser, attempt, profile }))
      .catch(() => !cancelled && setCheck({ user: firebaseUser, attempt, failed: true }));

    return () => {
      cancelled = true;
    };
  }, [firebaseUser, attempt]);

  // Worked out on every render from the two pieces above, so there is no separate "status" to keep in sync
  const state = useMemo<AuthState>(() => {
    if (firebaseUser === undefined) return { status: "loading" };
    if (firebaseUser === null) return { status: "signedOut" };
    // No answer yet for this exact sign-in and attempt (first load, or "Check again" was pressed)
    if (!check || check.user !== firebaseUser || check.attempt !== attempt) return { status: "loading" };
    if ("failed" in check) {
      return { status: "error", message: "We couldn't check your account. Check your connection and try again." };
    }
    if (check.profile?.active) return { status: "active", uid: firebaseUser.uid, profile: check.profile };
    return { status: "pending", email: firebaseUser.email ?? "" };
  }, [firebaseUser, check, attempt]);

  const value = useMemo<AuthContextValue>(() => ({ ...state, refresh: () => setAttempt((n) => n + 1) }), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
