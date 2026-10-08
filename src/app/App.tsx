import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { PublicOnly, RequireAdmin, RequireAuth } from "@/features/auth/RouteGuards";
import { LoginPage } from "@/features/auth/LoginPage";
import { SignUpPage } from "@/features/auth/SignUpPage";
import { AppShell } from "./AppShell";

// Each page is downloaded the first time it is opened, not up front. This keeps the first load small
// (the charts library alone is large and is only needed by the Dashboard and Revenue pages).
const BookingsPage = lazy(() => import("@/features/bookings/BookingsPage").then((m) => ({ default: m.BookingsPage })));
const CalendarPage = lazy(() => import("@/features/calendar/CalendarPage").then((m) => ({ default: m.CalendarPage })));
const CourtsPage = lazy(() => import("@/features/courts/CourtsPage").then((m) => ({ default: m.CourtsPage })));
const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const RevenuePage = lazy(() => import("@/features/revenue/RevenuePage").then((m) => ({ default: m.RevenuePage })));
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })));

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
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/courts" element={<CourtsPage />} />
          <Route path="/revenue" element={<RevenuePage />} />
          <Route element={<RequireAdmin />}>
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      {/* Unknown addresses go to the dashboard; the guard sends signed-out visitors on to /login */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
