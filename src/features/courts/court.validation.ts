import type { Court, CourtStatus } from "@/types/court";

export const NAME_MAX = 60;
export const SURFACE_MAX = 60;

// Everything the court form holds, as typed
export type CourtFormValues = {
  name: string;
  surface: string;
  status: CourtStatus;
};

export type CourtFormErrors = Partial<Record<"name" | "surface", string>>;

// `courts` are the courts that are currently listed; `editingId` leaves the court being edited out of the duplicate-name check.
export function validateCourt(values: CourtFormValues, courts: Court[], editingId?: string): CourtFormErrors {
  const errors: CourtFormErrors = {};

  const name = values.name.trim();
  if (!name) errors.name = "Enter a court name.";
  else if (name.length > NAME_MAX) errors.name = `Keep the name under ${NAME_MAX} characters.`;
  else if (courts.some((c) => c.id !== editingId && c.name.trim().toLowerCase() === name.toLowerCase())) {
    errors.name = "A court with this name already exists.";
  }

  const surface = values.surface.trim();
  if (!surface) errors.surface = "Enter the court type, e.g. Outdoor hard court.";
  else if (surface.length > SURFACE_MAX) errors.surface = `Keep this under ${SURFACE_MAX} characters.`;

  return errors;
}
