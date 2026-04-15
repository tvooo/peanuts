import { format, parseISO } from "date-fns";

/**
 * Serialize a Date to a plain YYYY-MM-DD string (no time, no timezone).
 *
 * Uses date-fns `format` so the output reflects the Date's *local* year/month/day.
 * We deliberately avoid `toISOString()`, which converts to UTC and introduces
 * a time component that shifts under DST.
 */
export function serializeDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Deserialize a YYYY-MM-DD string to a Date at local midnight.
 *
 * Uses `parseISO`, which treats a date-only string as local time. We avoid
 * `new Date("2016-01-04")`, which the JS spec parses as UTC midnight and
 * therefore shifts the calendar date in UTC+ timezones.
 */
export function deserializeDate(value: string): Date {
  return parseISO(value);
}
