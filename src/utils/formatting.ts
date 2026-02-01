import { format } from "date-fns";
import { padStart } from "lodash";

/**
 * Parse a currency input string and return the amount in cents.
 * Format: comma as decimal separator, period as thousands separator.
 * Examples: "123,45" -> 12345, "1.234,56" -> 123456, "50" -> 5000
 * @param allowNegative - If true, allows negative numbers (e.g., "-50" -> -5000)
 */
export function parseCurrencyInput(input: string, allowNegative = false): number {
  // Trim whitespace
  let cleaned = input.trim();

  // Check for negative sign before stripping
  const isNegative = allowNegative && cleaned.startsWith("-");

  // Remove all characters except digits, comma, and period
  cleaned = cleaned.replace(/[^\d,.]/g, "");

  // If empty, return 0
  if (!cleaned) return 0;

  // Remove periods (thousands separators)
  cleaned = cleaned.replace(/\./g, "");

  // Replace comma with period for parseFloat
  cleaned = cleaned.replace(",", ".");

  // Parse as float and convert to cents
  const parsed = parseFloat(cleaned);
  if (Number.isNaN(parsed)) return 0;

  // Round to 2 decimal places and convert to cents
  const cents = Math.round(parsed * 100);
  return isNegative ? -cents : cents;
}

/**
 * Format cents to a currency input string (for displaying in input fields).
 * Returns empty string for 0 to keep inputs clean.
 * Preserves negative sign for negative values.
 */
export function formatCurrencyInput(cents: number): string {
  if (cents === 0) return "";
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100);
  const centsPart = abs % 100;
  return `${negative ? "-" : ""}${euros},${padStart(String(centsPart), 2, "0")}`;
}

export function formatCurrency(n: number): string {
  const negative = n < 0;
  const abs = Math.abs(n);

  const centsRaw = abs % 100;
  const cents = Math.ceil(centsRaw);
  const euros = Math.floor(abs / 100);

  return `${negative ? "-" : ""}${euros},${padStart(String(cents), 2, "0")} €`;
}

export function formatDate(d: Date): string {
  return format(d, "dd.MM.yyyy");
}

export function formatDateIsoShort(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function formatMonth(d: Date): string {
  return format(d, "MMM yyyy");
}
