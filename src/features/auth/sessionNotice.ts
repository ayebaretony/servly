// A short message to show on the sign-in page after the app signed someone out on its own
// (inactivity, access removed). Kept in sessionStorage so it survives the redirect to /login.
const KEY = "servly:signout-notice";

export function setSignOutNotice(message: string) {
  try {
    sessionStorage.setItem(KEY, message);
  } catch {
    // Storage blocked: the person is still signed out, they just don't see the explanation
  }
}

export function peekSignOutNotice(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearSignOutNotice() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear
  }
}
