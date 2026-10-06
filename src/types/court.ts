export type CourtStatus = "available" | "maintenance";

// Shape of courts/{courtId} in Firestore (AGENTS.md section 7), plus the document id
export type Court = {
  id: string;
  name: string;
  surface: string;
  status: CourtStatus;
  hourlyRateMinor: number;
  color: string; // palette key, see theme/courtColors.ts
  sortOrder: number;
  archived: boolean;
};
