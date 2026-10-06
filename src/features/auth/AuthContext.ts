import { createContext } from "react";
import type { UserProfile } from "@/types/user";

// loading    = still working out who is signed in
// signedOut  = nobody signed in
// pending    = signed in, but no active users/{uid} document yet (waiting for admin approval)
// error      = signed in, but the profile could not be loaded (offline, rules, ...)
// active     = signed in and approved
export type AuthState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "pending"; email: string }
  | { status: "error"; message: string }
  | { status: "active"; uid: string; profile: UserProfile };

export type AuthContextValue = AuthState & {
  // Re-checks the profile, e.g. after an admin approves the account
  refresh: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
