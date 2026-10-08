import { collection, deleteDoc, doc, limit, onSnapshot, query, serverTimestamp, updateDoc, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ManagedUser } from "@/types/user";

// A center has a handful of staff. The cap keeps a runaway number of sign-ups from becoming a runaway number of reads.
const MAX_USERS = 200;

function toManagedUser(id: string, data: DocumentData): ManagedUser | null {
  const valid =
    typeof data.displayName === "string" &&
    typeof data.email === "string" &&
    typeof data.active === "boolean" &&
    (data.role === "admin" || data.role === "staff");
  if (!valid) return null;
  return {
    id,
    displayName: data.displayName,
    email: data.email,
    role: data.role,
    active: data.active,
    createdAt: data.createdAt?.toDate?.() ?? null,
    approvedAt: data.approvedAt?.toDate?.() ?? null,
  };
}

// Live list of everyone with a profile. This is a deliberate exception to "listeners only for today's view"
// (AGENTS.md section 8): the admin must hear about a new sign-up request straight away, and with a team this size
// the listener costs one read per change.
// `onData` also receives the profiles that appeared since the last update (empty on the very first one).
export function subscribeToUsers(
  onData: (users: ManagedUser[], appeared: ManagedUser[]) => void,
  onError: () => void,
): () => void {
  let firstUpdate = true;
  return onSnapshot(
    query(collection(db, "users"), limit(MAX_USERS)),
    (snapshot) => {
      // "estimate" fills in createdAt for a profile whose server time hasn't arrived yet
      const read = (d: (typeof snapshot.docs)[number]) => toManagedUser(d.id, d.data({ serverTimestamps: "estimate" }));
      const users = snapshot.docs.map(read).filter((user): user is ManagedUser => user !== null);
      const appeared = firstUpdate
        ? []
        : snapshot
            .docChanges()
            .filter((change) => change.type === "added" && !change.doc.metadata.hasPendingWrites)
            .map((change) => read(change.doc))
            .filter((user): user is ManagedUser => user !== null);
      firstUpdate = false;
      onData(users, appeared);
    },
    // The raw error is not logged: it isn't useful to the person and could carry details of other accounts
    () => onError(),
  );
}

// A failure with a message that is safe to show as-is
export class UserAdminError extends Error {}

function toUserAdminError(error: unknown): UserAdminError {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (code === "permission-denied") return new UserAdminError("Only the admin can manage users.");
  return new UserAdminError("We couldn't save that change. Check your connection and try again.");
}

// Gives access (new request) or restores it (suspended user)
export async function approveUser(uid: string): Promise<void> {
  try {
    await updateDoc(doc(db, "users", uid), { active: true, approvedAt: serverTimestamp() });
  } catch (error) {
    throw toUserAdminError(error);
  }
}

// Reversible: the profile stays, the person just can't use the app until reactivated.
// Accounts approved before approvedAt existed get it stamped now, so they show as "Suspended" and not as a new request.
export async function suspendUser(user: ManagedUser): Promise<void> {
  try {
    await updateDoc(doc(db, "users", user.id), user.approvedAt ? { active: false } : { active: false, approvedAt: serverTimestamp() });
  } catch (error) {
    throw toUserAdminError(error);
  }
}

// Deletes the profile (AGENTS.md has no Cloud Functions, so the sign-in account itself can only be deleted in the Firebase console).
// Also used to decline a new request. Their bookings stay: bookings only keep the creator's id.
export async function removeUser(uid: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "users", uid));
  } catch (error) {
    throw toUserAdminError(error);
  }
}
