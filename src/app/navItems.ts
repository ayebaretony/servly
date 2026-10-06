import {
  CalendarDays,
  ChartNoAxesColumn,
  ClipboardList,
  LayoutDashboard,
  RectangleHorizontal,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { to: string; label: string; icon: LucideIcon };

// Order matches the sidebar in the design (AGENTS.md section 5)
export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/bookings", label: "Bookings", icon: ClipboardList },
  { to: "/courts", label: "Courts", icon: RectangleHorizontal },
  { to: "/revenue", label: "Revenue", icon: ChartNoAxesColumn },
  { to: "/settings", label: "Settings", icon: Settings },
];
