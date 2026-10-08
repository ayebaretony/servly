import { Suspense, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { AceSuspenseFallback } from "@/components/ui/AceLoadingState";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/useAuth";
import { TourProvider } from "@/features/tour/TourProvider";
import { UsersProvider } from "@/features/settings/UsersProvider";
import { BookingModalProvider } from "./BookingModalProvider";
import { SessionGuard } from "./SessionGuard";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

// Sidebar + top bar around every signed-in page, plus the toasts and the "New booking" pop-up that any page can use.
// The admin also gets a live list of users here, so a new sign-up request is announced on whatever page they are on.
export function AppShell() {
  const auth = useAuth();
  const isAdmin = auth.status === "active" && auth.profile.role === "admin";

  return (
    <ToastProvider>
      <UsersProvider enabled={isAdmin}>
        <BookingModalProvider>
          <TourProvider>
            <SessionGuard />
            <ShellLayout />
          </TourProvider>
        </BookingModalProvider>
      </UsersProvider>
    </ToastProvider>
  );
}

// Below the `lg` breakpoint the sidebar becomes a drawer.
function ShellLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Escape closes the drawer; the page behind it doesn't scroll while it is open
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <div className="min-h-screen">
      {/* Desktop: fixed sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 lg:block">
        <Sidebar onNavigate={() => undefined} />
      </aside>

      {/* Mobile: drawer, closed again when a page is chosen */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 w-64 max-w-[80%]" role="dialog" aria-modal="true" aria-label="Menu">
            <Sidebar onNavigate={() => setDrawerOpen(false)} onClose={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-56">
        <Topbar onOpenMenu={() => setDrawerOpen(true)} />
        <main className="px-4 py-6 sm:px-8">
          {/* The sidebar and top bar stay on screen while a page's code downloads */}
          <Suspense fallback={<AceSuspenseFallback size="lg" label="Loading page…" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
