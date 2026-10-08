import { LogOut, User, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { BrandMark } from "@/features/auth/BrandMark";
import { signOutUser } from "@/features/auth/auth.service";
import { useAuth } from "@/features/auth/useAuth";
import { NAV_ITEMS } from "./navItems";

const ROLE_LABEL = { admin: "Admin", staff: "Staff" } as const;

type SidebarProps = {
  // Only used in the mobile drawer
  onNavigate: () => void;
  onClose?: () => void;
};

export function Sidebar({ onNavigate, onClose }: SidebarProps) {
  const auth = useAuth();
  const profile = auth.status === "active" ? auth.profile : null;
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || profile?.role === "admin");

  return (
    <div className="flex h-full flex-col border-r bg-sidebar">
      <div className="flex h-16 items-center justify-between px-5">
        <BrandMark />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="focus-ring -mr-2 grid size-9 place-items-center rounded-button text-muted hover:bg-surface"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        )}
      </div>

      <nav aria-label="Main" className="flex-1 px-3 pt-4">
        <ul className="space-y-1">
          {items.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `focus-ring flex h-10 items-center gap-3 rounded-button px-3 text-sm font-medium transition-colors ${
                    isActive ? "bg-primary text-white" : "text-ink hover:bg-surface"
                  }`
                }
              >
                <Icon aria-hidden="true" className="size-[18px]" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {profile && (
        <div className="flex items-center gap-3 border-t px-4 py-4">
          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-pill bg-navy-100 text-primary">
            <User className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{profile.displayName}</p>
            <p className="text-xs text-muted">{ROLE_LABEL[profile.role]}</p>
          </div>
          <button
            type="button"
            onClick={() => void signOutUser()}
            aria-label="Sign out"
            title="Sign out"
            className="focus-ring grid size-9 shrink-0 place-items-center rounded-button text-muted transition-colors hover:bg-surface hover:text-ink"
          >
            <LogOut aria-hidden="true" className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
