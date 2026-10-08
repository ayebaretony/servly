// Shape of settings/center in Firestore (AGENTS.md section 7)
export type CenterSettings = {
  centerName: string;
  currency: string; // "AED"
  timezone: string; // IANA, e.g. "Asia/Dubai"
  openTime: string; // "07:00"
  closeTime: string; // "22:00"
  slotMinutes: number;
};

// Used until settings/center has been seeded (Phase 2). These are the owner-approved defaults from AGENTS.md section 12.
export const DEFAULT_CENTER_SETTINGS: CenterSettings = {
  centerName: "Servly",
  currency: "AED",
  timezone: "Asia/Dubai",
  openTime: "07:00",
  closeTime: "22:00",
  slotMinutes: 30,
};

// Shape of settings/security in Firestore. Applies to everyone who signs in.
// 0 means "never sign out automatically". These are the only values the form offers and firestore.rules accepts.
export const IDLE_TIMEOUT_OPTIONS = [15, 30, 60, 120, 0] as const;

export type SecuritySettings = {
  idleTimeoutMinutes: number;
};

// Used until an admin saves their own choice
export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = { idleTimeoutMinutes: 60 };
