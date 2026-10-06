export type UserRole = "admin" | "staff";

// Shape of users/{uid} in Firestore (AGENTS.md section 7)
export type UserProfile = {
  displayName: string;
  email: string;
  role: UserRole;
  active: boolean;
};
