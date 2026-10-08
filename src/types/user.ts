export type UserRole = "admin" | "staff";

// Shape of users/{uid} in Firestore (AGENTS.md section 7)
export type UserProfile = {
  displayName: string;
  email: string;
  role: UserRole;
  active: boolean;
  // Set when the person finishes or skips the welcome tour. Missing = never seen it.
  onboarding?: { tourVersion: number };
};

// A users/{uid} document as the admin sees it in Settings.
// approvedAt is set the first time an admin approves the account, which is how "never approved" (a new request)
// is told apart from "approved before, now suspended".
export type ManagedUser = UserProfile & {
  id: string;
  createdAt: Date | null;
  approvedAt: Date | null;
};
