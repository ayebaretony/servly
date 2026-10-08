import {
  CalendarDays,
  ChartNoAxesColumn,
  ClipboardList,
  LayoutDashboard,
  RectangleHorizontal,
  Settings,
  type LucideIcon,
} from "lucide-react";

// adminOnly links are hidden from staff (the route itself is also guarded)
export type NavItem = { to: string; label: string; icon: LucideIcon; adminOnly?: boolean };

// Order matches the sidebar in the design (AGENTS.md section 5)
export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/bookings", label: "Bookings", icon: ClipboardList },
  { to: "/courts", label: "Courts", icon: RectangleHorizontal },
  { to: "/revenue", label: "Revenue", icon: ChartNoAxesColumn },
  { to: "/settings", label: "Settings", icon: Settings, adminOnly: true },
];
