import { overlapsTaken } from "@/lib/conflicts";
import { parseMajorToMinor } from "@/lib/money";
import type { BookingStatus } from "@/types/booking";
import type { Court } from "@/types/court";
import type { CenterSettings } from "@/types/settings";
import { checkBookingWindow } from "./bookings.rules";

// Cancelled is not something you pick when creating a booking
export type NewBookingStatus = Exclude<BookingStatus, "cancelled">;

// Everything is text while the person is typing. `start` and `end` are minutes since midnight, as text ("" = not chosen).
// `rate` is the hourly rate in whole currency units, e.g. "150" or "52.50".
export type BookingFormValues = {
  courtId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  date: string;
  start: string;
  end: string;
  rate: string;
  status: NewBookingStatus;
  notes: string;
};

export type BookingFormErrors = Partial<Record<keyof BookingFormValues, string>>;

type ValidationContext = {
  courts: Court[];
  settings: CenterSettings;
  isAdmin: boolean;
  now: Date;
  // Start minutes of slots already taken on the chosen court and day
  taken: ReadonlySet<number>;
};

export const NAME_MAX = 100;
export const NOTES_MAX = 500;
// AED 10,000 an hour. Not a business rule, just a guard against a slipped decimal point.
export const RATE_MAX_MINOR = 1_000_000;

export function parseMinutes(value: string): number | null {
  return value === "" ? null : Number(value);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+()\-\s\d]+$/;

export function validateBooking(values: BookingFormValues, context: ValidationContext): BookingFormErrors {
  const errors: BookingFormErrors = {};
  const { courts, settings, isAdmin, now, taken } = context;

  const court = courts.find((c) => c.id === values.courtId);
  if (!court) errors.courtId = "Choose a court.";
  else if (court.status !== "available") errors.courtId = `${court.name} is under maintenance.`;

  const name = values.customerName.trim();
  if (!name) errors.customerName = "Enter the customer's name.";
  else if (name.length > NAME_MAX) errors.customerName = `Keep the name under ${NAME_MAX} characters.`;

  const phone = values.customerPhone.trim();
  if (!phone) errors.customerPhone = "Enter a phone number.";
  else if (!PHONE_PATTERN.test(phone) || phone.replace(/\D/g, "").length < 7) {
    errors.customerPhone = "Enter a valid phone number, e.g. +971 50 123 4567.";
  }

  const email = values.customerEmail.trim();
  if (email && !EMAIL_PATTERN.test(email)) errors.customerEmail = "Enter a valid email address, or leave it empty.";

  if (!values.date) errors.date = "Pick a date.";
  const startMin = parseMinutes(values.start);
  const endMin = parseMinutes(values.end);
  if (startMin === null) errors.start = "Choose a start time.";
  if (endMin === null) errors.end = "Choose an end time.";

  if (values.date && startMin !== null && endMin !== null) {
    const problem = checkBookingWindow({ date: values.date, startMin, endMin, settings, isAdmin, now });
    if (problem) {
      // The rules name the field in minutes; the form's fields are `start` and `end`
      const field = problem.field === "startMin" ? "start" : problem.field === "endMin" ? "end" : "date";
      errors[field] = problem.message;
    } else if (overlapsTaken(startMin, endMin, settings.slotMinutes, taken)) {
      errors.end = "That time is already booked on this court. Pick a different time.";
    }
  }

  // Each customer can pay a different rate (memberships, partnerships), so it is typed per booking
  const rate = parseMajorToMinor(values.rate);
  if (!values.rate.trim()) errors.rate = "Enter the hourly rate for this customer.";
  else if (rate === null) errors.rate = "Enter an amount like 150 or 52.50.";
  else if (rate <= 0) errors.rate = "The rate must be more than zero.";
  else if (rate > RATE_MAX_MINOR) errors.rate = "That rate looks too high. Check the amount.";

  if (values.notes.length > NOTES_MAX) errors.notes = `Keep notes under ${NOTES_MAX} characters.`;

  return errors;
}
