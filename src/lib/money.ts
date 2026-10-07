// All money is stored as integer minor units (fils) and shown through these helpers (AGENTS.md "Money rules").
// Components never write "AED" or "$" themselves; the currency comes from settings/center.

const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string, showDecimals: boolean) {
  const key = `${currency}:${showDecimals}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency,
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

// "AED 540" for whole amounts, "AED 52.50" when there are fils, so figures stay short and still exact.
export function formatMoney(minor: number, currency: string): string {
  return getFormatter(currency, minor % 100 !== 0).format(minor / 100);
}

// "AED 150/hr"
export function formatRate(hourlyRateMinor: number, currency: string): string {
  return `${formatMoney(hourlyRateMinor, currency)}/hr`;
}

// What a person types into a price field ("150", "52.5", "1,200.50") -> minor units (fils). null when it isn't a valid amount.
// Two decimals at most, so nothing is silently rounded away.
export function parseMajorToMinor(text: string): number | null {
  const cleaned = text.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

// Minor units -> text for a price field: 15000 -> "150", 5250 -> "52.50"
export function minorToMajorInput(minor: number): string {
  return minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);
}

// Partial hours are charged proportionally. Rounded once, to whole fils.
export function calcTotalMinor(hourlyRateMinor: number, durationMinutes: number): number {
  return Math.round((hourlyRateMinor * durationMinutes) / 60);
}

// "+12%", "-3.5%", "0%". Whole numbers stay whole, otherwise one decimal.
const percentFormatter = new Intl.NumberFormat("en", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

export function formatPercentChange(ratio: number): string {
  return percentFormatter.format(ratio);
}

// Change from `previous` to `current` as a ratio (0.12 = +12%). null when there is nothing to compare with.
export function changeRatio(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return (current - previous) / previous;
}
