import {
  EmailAuthProvider,
  GoogleAuthProvider,
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { UserProfile } from "@/types/user";

// "Remember me" ticked = stay signed in after the browser closes; unticked = signed out when the tab closes.
async function applyPersistence(remember: boolean) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
}

export async function signInWithEmail(email: string, password: string, remember: boolean) {
  await applyPersistence(remember);
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signInWithGoogle(remember: boolean) {
  await applyPersistence(remember);
  await signInWithPopup(auth, new GoogleAuthProvider());
}

// Firebase fires its "signed in" event the moment the account exists, before we can attach the name.
// The profile document is created from that event, so the typed name is parked here for it to pick up.
let nameFromSignUp: string | null = null;

export async function signUpWithEmail(displayName: string, email: string, password: string) {
  await applyPersistence(true);
  nameFromSignUp = displayName.trim();
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(user, { displayName: nameFromSignUp });
  } finally {
    nameFromSignUp = null;
  }
}

export function sendPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email.trim());
}

export function signOutUser() {
  return signOut(auth);
}

// Google accounts have no password in Servly: Google manages it
export function canChangePassword(): boolean {
  return !!auth.currentUser?.providerData.some((provider) => provider.providerId === "password");
}

// Firebase wants the current password again before it changes a password, so a stolen open session can't lock the owner out
export async function changePassword(currentPassword: string, newPassword: string) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error("Not signed in.");
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
  await updatePassword(user, newPassword);
}

export function friendlyPasswordChangeError(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Your current password isn't right.";
    case "auth/weak-password":
      return "Choose a stronger password (at least 8 characters).";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/requires-recent-login":
      return "For your security, sign out and sign in again, then change your password.";
    case "auth/network-request-failed":
      return "Can't reach the server. Check your internet connection and try again.";
    default:
      return "We couldn't change your password. Please try again.";
  }
}

// Is this person still allowed in? Checked now and then while the app is open, so removing or suspending someone
// takes effect on screens that are already open (the security rules already refuse their data straight away).
export type AccessStatus = "approved" | "suspended" | "removed";

export async function checkAccess(uid: string): Promise<AccessStatus> {
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) return "removed";
  return readProfile(snapshot.data())?.active ? "approved" : "suspended";
}

function isUserProfile(data: Record<string, unknown> | undefined): data is UserProfile {
  return (
    !!data &&
    typeof data.displayName === "string" &&
    typeof data.email === "string" &&
    typeof data.active === "boolean" &&
    (data.role === "admin" || data.role === "staff")
  );
}

function fallbackName(user: User) {
  return user.displayName?.trim() || user.email?.split("@")[0] || "New user";
}

// Returns the user's profile, or null if the document is missing or malformed (treated as "not approved").
export async function loadProfile(user: User): Promise<UserProfile | null> {
  const ref = doc(db, "users", user.uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) return readProfile(snapshot.data());

  try {
    return await createPendingProfile(user);
  } catch (error) {
    // Two checks can run at once (React dev mode, two browser tabs). The loser's write is refused because the
    // document now exists, so use the winner's document instead of failing.
    const again = await getDoc(ref);
    if (again.exists()) return readProfile(again.data());
    throw error;
  }
}

function readProfile(data: Record<string, unknown>): UserProfile | null {
  return isUserProfile(data) ? data : null;
}

// Signing up must not grant access (AGENTS.md section 9): the new document is staff + inactive.
// An admin switches `active` on later (first admin: by hand in the Firebase console).
async function createPendingProfile(user: User): Promise<UserProfile | null> {
  if (!user.email) return null;
  const profile: UserProfile = {
    displayName: nameFromSignUp || fallbackName(user),
    email: user.email,
    role: "staff",
    active: false,
  };
  await setDoc(doc(db, "users", user.uid), { ...profile, createdAt: serverTimestamp() });
  return profile;
}

// Turns Firebase error codes into plain-language messages. Returns null when the user simply closed the Google popup.
export function friendlyAuthError(error: unknown): string | null {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/weak-password":
      return "Choose a stronger password (at least 8 characters).";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact your administrator.";
    case "auth/network-request-failed":
      return "Can't reach the server. Check your internet connection and try again.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google window. Allow pop-ups for this site and try again.";
    case "auth/operation-not-allowed":
      return "This sign-in method isn't switched on in Firebase yet. See the setup guide.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return null;
    default:
      return "Something went wrong. Please try again.";
  }
}
