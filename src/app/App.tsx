import { Navigate, Route, Routes } from "react-router-dom";
import { PublicOnly, RequireAuth } from "@/features/auth/RouteGuards";
import { LoginPage } from "@/features/auth/LoginPage";
import { SignUpPage } from "@/features/auth/SignUpPage";
import { BookingsPage } from "@/features/bookings/BookingsPage";
import { CalendarPage } from "@/features/calendar/CalendarPage";
import { CourtsPage } from "@/features/courts/CourtsPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { AppShell } from "./AppShell";
import { PlaceholderPage } from "./PlaceholderPage";

export function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnly>
            <SignUpPage />
          </PublicOnly>
        }
      />

      {/* Everything inside here needs a signed-in, approved user, and gets the sidebar + top bar */}
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          {/* Placeholders until Phase 6 */}
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/courts" element={<CourtsPage />} />
          <Route path="/revenue" element={<PlaceholderPage name="Revenue" />} />
          <Route path="/settings" element={<PlaceholderPage name="Settings" />} />
        </Route>
      </Route>

      {/* Unknown addresses go to the dashboard; the guard sends signed-out visitors on to /login */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
