import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useLoadingGate } from "@/lib/useLoadingGate";
import { ApprovalPendingScreen, LoadingScreen, ProfileErrorScreen } from "./StatusScreens";
import { useAuth } from "./useAuth";

// Wraps every page that needs a signed-in, approved user.
export function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();
  // Blank until the check has taken a moment, then Ace; held briefly so he doesn't flash
  const gate = useLoadingGate(auth.status === "loading");
  if (gate.busy) return gate.visible ? <LoadingScreen /> : null;

  switch (auth.status) {
    case "loading":
      return null; // unreachable: the gate above is busy whenever auth is loading
    case "signedOut":
      // Remember where they were heading so sign-in can send them back
      return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    case "pending":
      return <ApprovalPendingScreen email={auth.email} />;
    case "error":
      return <ProfileErrorScreen message={auth.message} />;
    case "active":
      return <Outlet />;
  }
}

// Settings is for the admin only. Staff who type the address by hand are sent back to the dashboard.
// Goes inside RequireAuth, which has already dealt with signed-out, pending and error states.
export function RequireAdmin() {
  const auth = useAuth();
  if (auth.status !== "active") return null;
  return auth.profile.role === "admin" ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

// Wraps Login and Sign up: someone who is already signed in goes straight into the app.
export function PublicOnly({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();
  const gate = useLoadingGate(auth.status === "loading");

  if (gate.busy) return gate.visible ? <LoadingScreen /> : null;
  if (auth.status === "loading") return null; // unreachable: the gate above is busy whenever auth is loading
  if (auth.status === "signedOut") return children;

  const from = (location.state as { from?: string } | null)?.from;
  return <Navigate to={from ?? "/dashboard"} replace />;
}
