import type { Amount } from "@/utils/types";
import { StatementParseError } from "./types";

/**
 * Parse a decimal amount string to cents without floating point.
 * With `decimal: ","` (German style) dots are treated as thousands
 * separators; with `decimal: "."` (ASN style) there are none.
 */
export function parseAmountCents(raw: string, decimal: "." | ","): Amount {
  let s = raw.trim();
  if (decimal === ",") {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const match = s.match(/^([+-]?)(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) {
    throw new StatementParseError(`Cannot parse amount: "${raw}"`);
  }
  const sign = match[1] === "-" ? -1 : 1;
  const cents =
    parseInt(match[2], 10) * 100 + (match[3] ? parseInt(match[3].padEnd(2, "0"), 10) : 0);
  return sign * cents;
}

/**
 * Parse an amount whose decimal separator isn't known upfront (ASN's
 * Excel-oriented dialect may localize numbers). Dot-decimal is tried first;
 * it rejects any string containing a comma or >2 fraction digits, so
 * "1.234,56" and "-43,90" safely fall through to comma-decimal parsing.
 */
export function parseAmountCentsFlexible(raw: string): Amount {
  try {
    return parseAmountCents(raw, ".");
  } catch {
    return parseAmountCents(raw, ",");
  }
}

/**
 * Parse a day-month-year date ("21-01-2020", "3-4-2020", "21.01.2020") to a
 * Date at local midnight, matching how the app deserializes dates.
 * Two-digit years ("15.12.25", DKB's current export) map to 20xx.
 */
export function parseDayMonthYear(raw: string, separator: string): Date {
  const parts = raw.trim().split(separator);
  if (parts.length !== 3) {
    throw new StatementParseError(`Cannot parse date: "${raw}"`);
  }
  const [day, month, rawYear] = parts.map((p) => parseInt(p, 10));
  const year = rawYear < 100 ? rawYear + 2000 : rawYear;
  if (!day || !month || !year || month > 12 || day > 31 || year < 1900) {
    throw new StatementParseError(`Cannot parse date: "${raw}"`);
  }
  return new Date(year, month - 1, day);
}
