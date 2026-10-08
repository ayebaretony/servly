import type { UserProfile, UserRole } from "@/types/user";

// Bump this when the tour changes enough that people who have seen it should see it again.
export const TOUR_VERSION = 1;

export type TourPose = "wave" | "point" | "celebrate";

export type TourStep = {
  id: string;
  title: string;
  body: (role: UserRole) => string;
  pose: TourPose;
  // The page the target lives on. Missing = stay wherever the person is.
  route?: string;
  // The data-tour="..." attribute on the element to point at. Missing = centred, no spotlight.
  target?: string;
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    pose: "wave",
    title: "Welcome to Servly",
    body: () => "Hi, I'm Ace! Let's take a 1-minute tour of Servly so you're ready for your first booking.",
  },
  {
    id: "dashboard",
    pose: "point",
    route: "/dashboard",
    target: "dashboard-stats",
    title: "Your day at a glance",
    body: () => "Today's bookings, today's revenue in AED, how busy the courts are and how many slots are still open.",
  },
  {
    id: "calendar",
    pose: "point",
    route: "/calendar",
    target: "calendar-grid",
    title: "Every court, every hour",
    body: () => "Tap an empty slot or day to start a booking. Tap a booking to see its details.",
  },
  {
    id: "new-booking",
    pose: "point",
    target: "new-booking",
    title: "New booking",
    body: () => "Got a request on WhatsApp? Start here to add the booking.",
  },
  {
    id: "bookings",
    pose: "point",
    route: "/bookings",
    target: "bookings-status",
    title: "Booking statuses",
    body: () => "Green means Confirmed, amber means Pending, red means Cancelled. Keep pending ones moving.",
  },
  {
    id: "courts",
    pose: "point",
    route: "/courts",
    target: "courts-table",
    title: "Your courts",
    // Only admins can change courts, and courts have no price in Servly (the rate is typed on each booking)
    body: (role) =>
      role === "admin"
        ? "Add your courts here and mark one as under maintenance when it's out of action."
        : "See which courts are available and which are under maintenance. An admin keeps this list up to date.",
  },
  {
    id: "finish",
    pose: "celebrate",
    title: "You're all set!",
    body: () => "You can replay this tour any time with “Replay tour” in the sidebar menu.",
  },
];

// Show the tour to anyone who has never finished it, or finished an older version
export function needsTour(profile: UserProfile): boolean {
  return !profile.onboarding || profile.onboarding.tourVersion < TOUR_VERSION;
}
