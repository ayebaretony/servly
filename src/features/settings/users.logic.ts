import type { ManagedUser } from "@/types/user";

// A request = someone who signed up and has never been approved
export function isAccessRequest(user: ManagedUser): boolean {
  return !user.active && user.approvedAt === null;
}

const byCreated = (a: ManagedUser, b: ManagedUser) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0);

// Requests: oldest first, so the longest wait is at the top. Team: admins first, then by name.
export function splitUsers(users: ManagedUser[]): { requests: ManagedUser[]; team: ManagedUser[] } {
  const requests = users.filter(isAccessRequest).sort(byCreated);
  const team = users
    .filter((user) => !isAccessRequest(user))
    .sort((a, b) => Number(b.role === "admin") - Number(a.role === "admin") || a.displayName.localeCompare(b.displayName));
  return { requests, team };
}
