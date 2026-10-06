import type { ReactNode } from "react";
import { BrandMark } from "./BrandMark";

// Faint court-line grid behind the brand panel text
const gridStyle = {
  backgroundImage:
    "linear-gradient(to right, rgb(255 255 255 / 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.06) 1px, transparent 1px)",
  backgroundSize: "96px 96px",
} as const;

// Split layout shared by Sign in and Create account: brand panel on the left, the form on the right.
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[42%_1fr]">
      {/* Brand panel: hidden on small screens, where the form shows the logo instead */}
      <aside
        className="relative hidden items-center justify-center overflow-hidden bg-primary px-12 text-center lg:flex"
        style={gridStyle}
      >
        <div className="flex max-w-md flex-col items-center">
          <BrandMark tone="light" size="lg" />
          <h2 className="mt-10 text-3xl leading-tight text-white">Every court. Every booking. Under control.</h2>
          <p className="mt-4 text-sm text-white/80">
            A simpler way to manage tennis bookings, availability, and revenue.
          </p>
        </div>
      </aside>

      <main className="flex flex-col bg-page px-4 py-8">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="flex justify-center">
              <BrandMark />
            </div>
            {children}
          </div>
        </div>

        <footer className="pt-8 text-center text-xs text-muted">
          &copy; {new Date().getFullYear()} Servly &middot; Terms &middot; Privacy
        </footer>
      </main>
    </div>
  );
}
