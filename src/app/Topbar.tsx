import { Bell, Menu, Plus, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { NAV_ITEMS } from "./navItems";
import { useOpenNewBooking } from "./useOpenNewBooking";

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const openNewBooking = useOpenNewBooking();
  const [term, setTerm] = useState("");

  const title = NAV_ITEMS.find((item) => pathname.startsWith(item.to))?.label ?? "Servly";

  // Search hands off to the Bookings page, which owns the filtering (Phase 3)
  function search(event: FormEvent) {
    event.preventDefault();
    const trimmed = term.trim();
    navigate(trimmed ? `/bookings?q=${encodeURIComponent(trimmed)}` : "/bookings");
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-page px-4 sm:px-8">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="focus-ring -ml-2 grid size-9 place-items-center rounded-button text-ink hover:bg-sidebar lg:hidden"
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>

      <p className="text-base font-semibold text-ink">{title}</p>

      <div className="ml-auto flex items-center gap-3">
        <form role="search" onSubmit={search} className="relative hidden md:block">
          <label htmlFor="booking-search" className="sr-only">
            Search bookings
          </label>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            id="booking-search"
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search bookings..."
            className="h-9 w-60 rounded-button border bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-muted"
          />
        </form>

        <button
          type="button"
          aria-label="Notifications"
          className="focus-ring grid size-9 place-items-center rounded-button text-muted transition-colors hover:bg-sidebar hover:text-ink"
        >
          <Bell aria-hidden="true" className="size-[18px]" />
        </button>

        <Button onClick={openNewBooking}>
          <Plus aria-hidden="true" className="size-4" />
          New booking
        </Button>
      </div>
    </header>
  );
}
