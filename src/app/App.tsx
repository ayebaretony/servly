import { Navigate, Route, Routes } from "react-router-dom";
import { PublicOnly, RequireAuth } from "@/features/auth/RouteGuards";
import { LoginPage } from "@/features/auth/LoginPage";
import { SignUpPage } from "@/features/auth/SignUpPage";
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
          {/* Placeholders until their phases: Calendar 4, Bookings 3, Courts 2, Revenue and Settings 6 */}
          <Route path="/calendar" element={<PlaceholderPage name="Calendar" />} />
          <Route path="/bookings" element={<PlaceholderPage name="Bookings" />} />
          <Route path="/courts" element={<PlaceholderPage name="Courts" />} />
          <Route path="/revenue" element={<PlaceholderPage name="Revenue" />} />
          <Route path="/settings" element={<PlaceholderPage name="Settings" />} />
        </Route>
      </Route>

      {/* Unknown addresses go to the dashboard; the guard sends signed-out visitors on to /login */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
