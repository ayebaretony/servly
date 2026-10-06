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
