import { Link } from "react-router-dom";

// Placeholder so the sign-in screen has somewhere to navigate to.
// The real dashboard (stat cards, timeline, revenue chart) is Phase 5.
export function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <h1>Dashboard</h1>
      <p className="text-muted">The dashboard screen will be built in a later phase.</p>
      <Link to="/login" className="text-sm font-semibold text-primary underline-offset-2 hover:underline">
        Back to sign in
      </Link>
    </main>
  );
}
